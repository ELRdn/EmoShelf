//! Signed, content-addressed external emoji renderer packs.

use std::collections::{BTreeMap, HashSet};
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use base64::Engine as _;
use ed25519_dalek::{Signature, VerifyingKey};
use semver::Version;
use sha2::{Digest, Sha256};
use tauri::Manager;
use zip::ZipArchive;

const PACK_FORMAT_VERSION: u32 = 1;
const PACK_DIR_NAME: &str = "renderer-packs";
const MAX_PACK_BYTES: u64 = 128 * 1024 * 1024;
const MAX_TOTAL_UNCOMPRESSED_BYTES: u64 = 128 * 1024 * 1024;
const MAX_PACK_ENTRIES: usize = 2_100;
const MAX_RENDERER_ASSETS: usize = 2_048;
const MAX_MANIFEST_BYTES: u64 = 1024 * 1024;
const MAX_LICENSE_BYTES: u64 = 256 * 1024;
const MAX_SVG_BYTES: u64 = 256 * 1024;
const SIGNATURE_BYTES: u64 = 64;
const SUPPORTED_RENDERERS: &[&str] = &["fluent", "noto", "openmoji"];
static PACK_IO_LOCK: Mutex<()> = Mutex::new(());

#[derive(Clone, Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RendererAssetManifest {
    hexcode: String,
    path: String,
    sha256: String,
    byte_length: u64,
}

#[derive(Clone, Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RendererPackManifest {
    format: String,
    format_version: u32,
    renderer_id: String,
    version: String,
    display_name: String,
    attribution: String,
    license_name: String,
    license_path: String,
    key_id: String,
    min_app_version: String,
    max_app_version_exclusive: String,
    assets: Vec<RendererAssetManifest>,
}

#[derive(Clone, Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct InstallMetadata {
    enabled: bool,
    installed_at: String,
}

#[derive(Clone, Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RendererPackRecord {
    renderer_id: String,
    version: String,
    display_name: String,
    enabled: bool,
    attribution: String,
    license_name: String,
    license_text: String,
    asset_count: usize,
    key_id: String,
    installed_at: String,
}

struct ValidatedPack {
    manifest: RendererPackManifest,
    manifest_bytes: Vec<u8>,
    signature: Vec<u8>,
    license: Vec<u8>,
    assets: BTreeMap<String, Vec<u8>>,
}

struct InstalledPack {
    manifest: RendererPackManifest,
    metadata: InstallMetadata,
    license_text: String,
}

fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hex::encode(hasher.finalize())
}

fn validate_renderer_id(renderer_id: &str) -> Result<(), String> {
    if SUPPORTED_RENDERERS.contains(&renderer_id) {
        Ok(())
    } else {
        Err("renderer ID must be fluent, noto, or openmoji".to_string())
    }
}

fn validate_hexcode(hexcode: &str) -> Result<(), String> {
    if hexcode.is_empty() || hexcode.len() > 96 {
        return Err("renderer asset hexcode is invalid".to_string());
    }
    for part in hexcode.split('-') {
        if part.is_empty()
            || part.len() > 6
            || !part
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
        {
            return Err(format!("invalid renderer asset hexcode: {hexcode}"));
        }
        let codepoint =
            u32::from_str_radix(part, 16).map_err(|_| "invalid Unicode code point".to_string())?;
        if codepoint > 0x10ffff
            || (0xd800..=0xdfff).contains(&codepoint)
            || format!("{codepoint:x}") != part
        {
            return Err(format!("non-canonical renderer asset hexcode: {hexcode}"));
        }
    }
    Ok(())
}

fn bounded_text(value: &str, name: &str, max: usize) -> Result<(), String> {
    if value.trim().is_empty() || value.len() > max || value.chars().any(char::is_control) {
        Err(format!("renderer pack {name} is invalid"))
    } else {
        Ok(())
    }
}

fn validate_manifest(manifest: &RendererPackManifest, app_version: &Version) -> Result<(), String> {
    if manifest.format != "emoshelf-renderer"
        || manifest.format_version != PACK_FORMAT_VERSION
        || manifest.license_path != "LICENSE.txt"
    {
        return Err("unsupported renderer pack manifest".to_string());
    }
    validate_renderer_id(&manifest.renderer_id)?;
    bounded_text(&manifest.display_name, "display name", 80)?;
    bounded_text(&manifest.attribution, "attribution", 512)?;
    bounded_text(&manifest.license_name, "license name", 80)?;
    bounded_text(&manifest.key_id, "key ID", 80)?;
    Version::parse(&manifest.version).map_err(|_| "renderer version is invalid".to_string())?;
    let minimum = Version::parse(&manifest.min_app_version)
        .map_err(|_| "minimum app version is invalid".to_string())?;
    let maximum = Version::parse(&manifest.max_app_version_exclusive)
        .map_err(|_| "maximum app version is invalid".to_string())?;
    if minimum >= maximum || app_version < &minimum || app_version >= &maximum {
        return Err(format!(
            "renderer pack is incompatible with EmoShelf {app_version}"
        ));
    }
    if manifest.assets.is_empty() || manifest.assets.len() > MAX_RENDERER_ASSETS {
        return Err(format!(
            "renderer pack must contain 1 to {MAX_RENDERER_ASSETS} SVG assets"
        ));
    }
    let mut hexcodes = HashSet::new();
    let mut paths = HashSet::new();
    for asset in &manifest.assets {
        validate_hexcode(&asset.hexcode)?;
        if asset.path != format!("emoji/{}.svg", asset.hexcode)
            || asset.sha256.len() != 64
            || !asset
                .sha256
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
            || asset.byte_length == 0
            || asset.byte_length > MAX_SVG_BYTES
            || !hexcodes.insert(asset.hexcode.clone())
            || !paths.insert(asset.path.clone())
        {
            return Err(format!(
                "invalid or duplicate renderer asset metadata for {}",
                asset.hexcode
            ));
        }
    }
    Ok(())
}

fn production_trusted_keys() -> Result<BTreeMap<String, VerifyingKey>, String> {
    let key_id = option_env!("EMOSHELF_RENDERER_KEY_ID");
    let public_key = option_env!("EMOSHELF_RENDERER_PUBLIC_KEY_BASE64");
    let (Some(key_id), Some(public_key)) = (key_id, public_key) else {
        return Err("this build has no trusted renderer pack key configured".to_string());
    };
    bounded_text(key_id, "trusted key ID", 80)?;
    let decoded = base64::engine::general_purpose::STANDARD
        .decode(public_key)
        .map_err(|_| "compiled renderer public key is not valid base64".to_string())?;
    let bytes: [u8; 32] = decoded
        .try_into()
        .map_err(|_| "compiled renderer public key must contain 32 bytes".to_string())?;
    let key = VerifyingKey::from_bytes(&bytes)
        .map_err(|_| "compiled renderer public key is invalid".to_string())?;
    Ok(BTreeMap::from([(key_id.to_string(), key)]))
}

fn verify_manifest_signature(
    manifest: &RendererPackManifest,
    manifest_bytes: &[u8],
    signature_bytes: &[u8],
    trusted_keys: &BTreeMap<String, VerifyingKey>,
) -> Result<(), String> {
    let key = trusted_keys
        .get(&manifest.key_id)
        .ok_or_else(|| format!("renderer pack key {} is not trusted", manifest.key_id))?;
    let signature = Signature::from_slice(signature_bytes)
        .map_err(|_| "renderer pack signature must contain 64 bytes".to_string())?;
    key.verify_strict(manifest_bytes, &signature)
        .map_err(|_| "renderer pack signature verification failed".to_string())
}

fn read_bounded<R: Read>(reader: &mut R, max_bytes: u64) -> Result<Vec<u8>, String> {
    let mut bytes = Vec::new();
    reader
        .take(max_bytes + 1)
        .read_to_end(&mut bytes)
        .map_err(|error| error.to_string())?;
    if bytes.len() as u64 > max_bytes {
        return Err("renderer pack entry exceeds its safety limit".to_string());
    }
    Ok(bytes)
}

fn validate_pack_at(
    path: &Path,
    trusted_keys: &BTreeMap<String, VerifyingKey>,
    app_version: &Version,
) -> Result<ValidatedPack, String> {
    let metadata = std::fs::metadata(path).map_err(|error| error.to_string())?;
    if !metadata.is_file() || metadata.len() > MAX_PACK_BYTES {
        return Err("renderer pack is missing or exceeds 128 MiB".to_string());
    }
    let file = std::fs::File::open(path).map_err(|error| error.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|error| error.to_string())?;
    if archive.len() > MAX_PACK_ENTRIES {
        return Err("renderer pack contains too many entries".to_string());
    }

    let mut entries = BTreeMap::new();
    let mut seen = HashSet::new();
    let mut total = 0u64;
    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(|error| error.to_string())?;
        let enclosed = entry
            .enclosed_name()
            .ok_or_else(|| "unsafe path in renderer pack".to_string())?;
        if entry
            .unix_mode()
            .is_some_and(|mode| mode & 0o170000 == 0o120000)
        {
            return Err("symbolic links are not allowed in renderer packs".to_string());
        }
        let name = enclosed
            .to_str()
            .ok_or_else(|| "renderer pack path is not UTF-8".to_string())?
            .replace('\\', "/");
        if !seen.insert(name.clone()) {
            return Err(format!("duplicate renderer pack entry: {name}"));
        }
        total = total
            .checked_add(entry.size())
            .ok_or_else(|| "renderer pack size overflow".to_string())?;
        if total > MAX_TOTAL_UNCOMPRESSED_BYTES {
            return Err("renderer pack expands beyond 128 MiB".to_string());
        }
        if entry.is_dir() {
            if name != "emoji/" {
                return Err(format!("unsupported renderer pack directory: {name}"));
            }
            continue;
        }
        let limit = match name.as_str() {
            "manifest.json" => MAX_MANIFEST_BYTES,
            "signature.ed25519" => SIGNATURE_BYTES,
            "LICENSE.txt" => MAX_LICENSE_BYTES,
            _ if name.starts_with("emoji/") && name.ends_with(".svg") => MAX_SVG_BYTES,
            _ => return Err(format!("unsupported renderer pack entry: {name}")),
        };
        entries.insert(name, read_bounded(&mut entry, limit)?);
    }

    let manifest_bytes = entries
        .remove("manifest.json")
        .ok_or_else(|| "renderer pack manifest.json is missing".to_string())?;
    let signature = entries
        .remove("signature.ed25519")
        .ok_or_else(|| "renderer pack signature.ed25519 is missing".to_string())?;
    let license = entries
        .remove("LICENSE.txt")
        .ok_or_else(|| "renderer pack LICENSE.txt is missing".to_string())?;
    let manifest: RendererPackManifest =
        serde_json::from_slice(&manifest_bytes).map_err(|error| error.to_string())?;
    validate_manifest(&manifest, app_version)?;
    verify_manifest_signature(&manifest, &manifest_bytes, &signature, trusted_keys)?;
    let license_text = std::str::from_utf8(&license)
        .map_err(|_| "renderer pack license is not UTF-8".to_string())?;
    if license_text.trim().is_empty() {
        return Err("renderer pack license is empty".to_string());
    }

    let declared_paths = manifest
        .assets
        .iter()
        .map(|asset| asset.path.as_str())
        .collect::<HashSet<_>>();
    if entries.len() != declared_paths.len()
        || entries
            .keys()
            .any(|path| !declared_paths.contains(path.as_str()))
    {
        return Err("renderer pack SVG entries do not match the manifest".to_string());
    }
    for asset in &manifest.assets {
        let bytes = entries
            .get(&asset.path)
            .ok_or_else(|| format!("renderer asset {} is missing", asset.path))?;
        if bytes.len() as u64 != asset.byte_length || sha256_hex(bytes) != asset.sha256 {
            return Err(format!("renderer asset hash mismatch: {}", asset.path));
        }
        let svg = std::str::from_utf8(bytes)
            .map_err(|_| format!("renderer asset is not UTF-8: {}", asset.path))?;
        crate::custom_assets::validate_static_svg(svg)?;
    }

    Ok(ValidatedPack {
        manifest,
        manifest_bytes,
        signature,
        license,
        assets: entries,
    })
}

fn pack_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let root = app
        .path()
        .app_local_data_dir()
        .map_err(|error| error.to_string())?
        .join(PACK_DIR_NAME);
    if root.exists()
        && std::fs::symlink_metadata(&root)
            .map_err(|error| error.to_string())?
            .file_type()
            .is_symlink()
    {
        return Err("renderer pack root must not be a symbolic link".to_string());
    }
    std::fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    Ok(root)
}

fn ensure_regular_directory(path: &Path) -> Result<(), String> {
    let metadata = std::fs::symlink_metadata(path).map_err(|error| error.to_string())?;
    if !metadata.is_dir() || metadata.file_type().is_symlink() {
        Err("renderer pack path must be a regular directory".to_string())
    } else {
        Ok(())
    }
}

fn write_atomic(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let temporary = path.with_extension("tmp");
    let backup = path.with_extension("bak");
    if temporary.exists() {
        std::fs::remove_file(&temporary).map_err(|error| error.to_string())?;
    }
    if backup.exists() {
        std::fs::remove_file(&backup).map_err(|error| error.to_string())?;
    }
    std::fs::write(&temporary, bytes).map_err(|error| error.to_string())?;
    let had_existing = path.exists();
    if had_existing {
        std::fs::rename(path, &backup).map_err(|error| error.to_string())?;
    }
    if let Err(error) = std::fs::rename(&temporary, path) {
        if had_existing {
            let _ = std::fs::rename(&backup, path);
        }
        return Err(error.to_string());
    }
    if had_existing {
        std::fs::remove_file(backup).map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn installed_at_now() -> Result<String, String> {
    let seconds = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_secs();
    Ok(format!("unix:{seconds}"))
}

fn save_validated_pack(root: &Path, pack: &ValidatedPack) -> Result<(), String> {
    validate_renderer_id(&pack.manifest.renderer_id)?;
    let renderer_id = &pack.manifest.renderer_id;
    let target = root.join(renderer_id);
    let staging = root.join(format!(".install-{renderer_id}-{}", std::process::id()));
    let backup = root.join(format!(".backup-{renderer_id}"));
    for path in [&staging, &backup] {
        if path.exists() {
            ensure_regular_directory(path)?;
            std::fs::remove_dir_all(path).map_err(|error| error.to_string())?;
        }
    }
    std::fs::create_dir(&staging).map_err(|error| error.to_string())?;
    std::fs::create_dir(staging.join("emoji")).map_err(|error| error.to_string())?;
    let write_result = (|| {
        std::fs::write(staging.join("manifest.json"), &pack.manifest_bytes)
            .map_err(|error| error.to_string())?;
        std::fs::write(staging.join("signature.ed25519"), &pack.signature)
            .map_err(|error| error.to_string())?;
        std::fs::write(staging.join("LICENSE.txt"), &pack.license)
            .map_err(|error| error.to_string())?;
        for asset in &pack.manifest.assets {
            let bytes = pack
                .assets
                .get(&asset.path)
                .ok_or_else(|| format!("validated renderer asset {} is missing", asset.path))?;
            std::fs::write(staging.join(&asset.path), bytes).map_err(|error| error.to_string())?;
        }
        let enabled = if target.exists() {
            ensure_regular_directory(&target)?;
            std::fs::read(target.join("install.json"))
                .ok()
                .and_then(|bytes| serde_json::from_slice::<InstallMetadata>(&bytes).ok())
                .map(|metadata| metadata.enabled)
                .unwrap_or(true)
        } else {
            true
        };
        let metadata = InstallMetadata {
            enabled,
            installed_at: installed_at_now()?,
        };
        std::fs::write(
            staging.join("install.json"),
            serde_json::to_vec_pretty(&metadata).map_err(|error| error.to_string())?,
        )
        .map_err(|error| error.to_string())?;
        Ok::<(), String>(())
    })();
    if let Err(error) = write_result {
        let _ = std::fs::remove_dir_all(&staging);
        return Err(error);
    }

    let had_target = target.exists();
    if had_target {
        std::fs::rename(&target, &backup).map_err(|error| error.to_string())?;
    }
    if let Err(error) = std::fs::rename(&staging, &target) {
        if had_target {
            let _ = std::fs::rename(&backup, &target);
        }
        let _ = std::fs::remove_dir_all(&staging);
        return Err(error.to_string());
    }
    if had_target {
        std::fs::remove_dir_all(&backup).map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn load_installed_pack(
    root: &Path,
    renderer_id: &str,
    trusted_keys: &BTreeMap<String, VerifyingKey>,
) -> Result<InstalledPack, String> {
    validate_renderer_id(renderer_id)?;
    let directory = root.join(renderer_id);
    ensure_regular_directory(&directory)?;
    let manifest_bytes =
        std::fs::read(directory.join("manifest.json")).map_err(|error| error.to_string())?;
    if manifest_bytes.len() as u64 > MAX_MANIFEST_BYTES {
        return Err("installed renderer manifest exceeds its safety limit".to_string());
    }
    let manifest: RendererPackManifest =
        serde_json::from_slice(&manifest_bytes).map_err(|error| error.to_string())?;
    validate_manifest(
        &manifest,
        &Version::parse(env!("CARGO_PKG_VERSION")).map_err(|error| error.to_string())?,
    )?;
    if manifest.renderer_id != renderer_id {
        return Err("installed renderer ID does not match its directory".to_string());
    }
    let signature =
        std::fs::read(directory.join("signature.ed25519")).map_err(|error| error.to_string())?;
    verify_manifest_signature(&manifest, &manifest_bytes, &signature, trusted_keys)?;
    let license =
        std::fs::read(directory.join("LICENSE.txt")).map_err(|error| error.to_string())?;
    if license.len() as u64 > MAX_LICENSE_BYTES {
        return Err("installed renderer license exceeds its safety limit".to_string());
    }
    let license_text = String::from_utf8(license)
        .map_err(|_| "installed renderer license is not UTF-8".to_string())?;
    let metadata: InstallMetadata = serde_json::from_slice(
        &std::fs::read(directory.join("install.json")).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;
    Ok(InstalledPack {
        manifest,
        metadata,
        license_text,
    })
}

fn to_record(pack: InstalledPack) -> RendererPackRecord {
    RendererPackRecord {
        renderer_id: pack.manifest.renderer_id,
        version: pack.manifest.version,
        display_name: pack.manifest.display_name,
        enabled: pack.metadata.enabled,
        attribution: pack.manifest.attribution,
        license_name: pack.manifest.license_name,
        license_text: pack.license_text,
        asset_count: pack.manifest.assets.len(),
        key_id: pack.manifest.key_id,
        installed_at: pack.metadata.installed_at,
    }
}

#[tauri::command]
pub fn list_renderer_packs(app: tauri::AppHandle) -> Result<Vec<RendererPackRecord>, String> {
    let root = pack_root(&app)?;
    let trusted_keys = match production_trusted_keys() {
        Ok(keys) => keys,
        Err(_) => return Ok(Vec::new()),
    };
    Ok(SUPPORTED_RENDERERS
        .iter()
        .filter_map(|renderer_id| {
            let path = root.join(renderer_id);
            if !path.exists() {
                return None;
            }
            load_installed_pack(&root, renderer_id, &trusted_keys)
                .ok()
                .map(to_record)
        })
        .collect())
}

#[tauri::command]
pub fn install_renderer_pack(
    app: tauri::AppHandle,
    path: String,
) -> Result<RendererPackRecord, String> {
    let _guard = PACK_IO_LOCK.lock().map_err(|error| error.to_string())?;
    let trusted_keys = production_trusted_keys()?;
    let app_version =
        Version::parse(env!("CARGO_PKG_VERSION")).map_err(|error| error.to_string())?;
    let pack = validate_pack_at(Path::new(&path), &trusted_keys, &app_version)?;
    let renderer_id = pack.manifest.renderer_id.clone();
    let root = pack_root(&app)?;
    save_validated_pack(&root, &pack)?;
    load_installed_pack(&root, &renderer_id, &trusted_keys).map(to_record)
}

#[tauri::command]
pub fn set_renderer_pack_enabled(
    app: tauri::AppHandle,
    renderer_id: String,
    enabled: bool,
) -> Result<(), String> {
    let _guard = PACK_IO_LOCK.lock().map_err(|error| error.to_string())?;
    validate_renderer_id(&renderer_id)?;
    let root = pack_root(&app)?;
    let directory = root.join(&renderer_id);
    ensure_regular_directory(&directory)?;
    let path = directory.join("install.json");
    let mut metadata: InstallMetadata =
        serde_json::from_slice(&std::fs::read(&path).map_err(|error| error.to_string())?)
            .map_err(|error| error.to_string())?;
    metadata.enabled = enabled;
    write_atomic(
        &path,
        &serde_json::to_vec_pretty(&metadata).map_err(|error| error.to_string())?,
    )
}

#[tauri::command]
pub fn remove_renderer_pack(app: tauri::AppHandle, renderer_id: String) -> Result<bool, String> {
    let _guard = PACK_IO_LOCK.lock().map_err(|error| error.to_string())?;
    validate_renderer_id(&renderer_id)?;
    let root = pack_root(&app)?;
    let directory = root.join(&renderer_id);
    if !directory.exists() {
        return Ok(false);
    }
    ensure_regular_directory(&directory)?;
    std::fs::remove_dir_all(directory).map_err(|error| error.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn read_renderer_asset(
    app: tauri::AppHandle,
    renderer_id: String,
    hexcode: String,
) -> Result<String, String> {
    validate_renderer_id(&renderer_id)?;
    validate_hexcode(&hexcode)?;
    let root = pack_root(&app)?;
    let trusted_keys = production_trusted_keys()?;
    let installed = load_installed_pack(&root, &renderer_id, &trusted_keys)?;
    if !installed.metadata.enabled {
        return Err("renderer pack is disabled".to_string());
    }
    let asset = installed
        .manifest
        .assets
        .iter()
        .find(|asset| asset.hexcode == hexcode)
        .ok_or_else(|| "renderer asset is not present in this pack".to_string())?;
    let path = root.join(&renderer_id).join(&asset.path);
    let bytes = std::fs::read(path).map_err(|error| error.to_string())?;
    if bytes.len() as u64 != asset.byte_length || sha256_hex(&bytes) != asset.sha256 {
        return Err("installed renderer asset failed its integrity check".to_string());
    }
    let svg = std::str::from_utf8(&bytes)
        .map_err(|_| "installed renderer asset is not UTF-8".to_string())?;
    crate::custom_assets::validate_static_svg(svg)?;
    Ok(base64::engine::general_purpose::STANDARD.encode(bytes))
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::{Signer, SigningKey};
    use std::io::Write;
    use zip::write::SimpleFileOptions;
    use zip::{CompressionMethod, ZipWriter};

    struct TempDir(PathBuf);

    impl TempDir {
        fn new(name: &str) -> Self {
            let path = std::env::temp_dir().join(format!(
                "emoshelf-renderer-test-{}-{name}-{}",
                std::process::id(),
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .expect("time")
                    .as_nanos()
            ));
            std::fs::create_dir_all(&path).expect("temp dir");
            Self(path)
        }

        fn path(&self) -> &Path {
            &self.0
        }
    }

    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    fn test_svg() -> Vec<u8> {
        br##"<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="12" fill="#7657ff"/></svg>"##.to_vec()
    }

    fn test_key() -> SigningKey {
        SigningKey::from_bytes(&[7; 32])
    }

    fn trusted_keys() -> BTreeMap<String, VerifyingKey> {
        BTreeMap::from([("test-2026".to_string(), test_key().verifying_key())])
    }

    fn manifest_for(svg: &[u8]) -> RendererPackManifest {
        RendererPackManifest {
            format: "emoshelf-renderer".to_string(),
            format_version: 1,
            renderer_id: "fluent".to_string(),
            version: "1.0.0".to_string(),
            display_name: "Fluent Emoji".to_string(),
            attribution: "Microsoft Fluent Emoji".to_string(),
            license_name: "MIT".to_string(),
            license_path: "LICENSE.txt".to_string(),
            key_id: "test-2026".to_string(),
            min_app_version: "0.4.0".to_string(),
            max_app_version_exclusive: "2.0.0".to_string(),
            assets: vec![RendererAssetManifest {
                hexcode: "1f600".to_string(),
                path: "emoji/1f600.svg".to_string(),
                sha256: sha256_hex(svg),
                byte_length: svg.len() as u64,
            }],
        }
    }

    fn write_pack(
        path: &Path,
        manifest: &RendererPackManifest,
        svg: &[u8],
        signing_key: &SigningKey,
        extra: Option<(&str, &[u8])>,
    ) {
        let manifest_bytes = serde_json::to_vec(manifest).expect("manifest");
        let signature = signing_key.sign(&manifest_bytes).to_bytes();
        let file = std::fs::File::create(path).expect("pack file");
        let mut zip = ZipWriter::new(file);
        let options = SimpleFileOptions::default()
            .compression_method(CompressionMethod::Deflated)
            .unix_permissions(0o644);
        for (name, bytes) in [
            ("manifest.json", manifest_bytes.as_slice()),
            ("signature.ed25519", signature.as_slice()),
            ("LICENSE.txt", b"MIT test license".as_slice()),
            ("emoji/1f600.svg", svg),
        ] {
            zip.start_file(name, options).expect("entry");
            zip.write_all(bytes).expect("write entry");
        }
        if let Some((name, bytes)) = extra {
            zip.start_file(name, options).expect("extra entry");
            zip.write_all(bytes).expect("write extra");
        }
        zip.finish().expect("finish pack");
    }

    #[test]
    fn valid_signed_pack_is_accepted() {
        let dir = TempDir::new("valid");
        let path = dir.path().join("valid.emoshelf-renderer");
        let svg = test_svg();
        write_pack(&path, &manifest_for(&svg), &svg, &test_key(), None);
        let pack = validate_pack_at(
            &path,
            &trusted_keys(),
            &Version::parse("0.4.0").expect("version"),
        )
        .expect("valid pack");
        assert_eq!(pack.manifest.renderer_id, "fluent");
        assert_eq!(pack.assets.len(), 1);
    }

    #[test]
    fn wrong_signature_is_rejected() {
        let dir = TempDir::new("signature");
        let path = dir.path().join("wrong.emoshelf-renderer");
        let svg = test_svg();
        write_pack(
            &path,
            &manifest_for(&svg),
            &svg,
            &SigningKey::from_bytes(&[9; 32]),
            None,
        );
        assert!(validate_pack_at(
            &path,
            &trusted_keys(),
            &Version::parse("0.4.0").expect("version")
        )
        .is_err());
    }

    #[test]
    fn tampered_svg_is_rejected() {
        let dir = TempDir::new("tamper");
        let path = dir.path().join("tamper.emoshelf-renderer");
        let original = test_svg();
        write_pack(
            &path,
            &manifest_for(&original),
            b"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1\" height=\"1\"/>",
            &test_key(),
            None,
        );
        assert!(validate_pack_at(
            &path,
            &trusted_keys(),
            &Version::parse("0.4.0").expect("version")
        )
        .is_err());
    }

    #[test]
    fn path_traversal_is_rejected() {
        let dir = TempDir::new("traversal");
        let path = dir.path().join("traversal.emoshelf-renderer");
        let svg = test_svg();
        write_pack(
            &path,
            &manifest_for(&svg),
            &svg,
            &test_key(),
            Some(("../escape.svg", &svg)),
        );
        assert!(validate_pack_at(
            &path,
            &trusted_keys(),
            &Version::parse("0.4.0").expect("version")
        )
        .is_err());
    }

    #[test]
    fn undeclared_extra_file_is_rejected() {
        let dir = TempDir::new("extra");
        let path = dir.path().join("extra.emoshelf-renderer");
        let svg = test_svg();
        write_pack(
            &path,
            &manifest_for(&svg),
            &svg,
            &test_key(),
            Some(("emoji/1f601.svg", &svg)),
        );
        assert!(validate_pack_at(
            &path,
            &trusted_keys(),
            &Version::parse("0.4.0").expect("version")
        )
        .is_err());
    }

    #[test]
    fn unsupported_renderer_is_rejected() {
        let mut manifest = manifest_for(&test_svg());
        manifest.renderer_id = "unknown".to_string();
        assert!(validate_manifest(&manifest, &Version::parse("0.4.0").expect("version")).is_err());
    }

    #[test]
    fn incompatible_app_version_is_rejected() {
        let manifest = manifest_for(&test_svg());
        assert!(validate_manifest(&manifest, &Version::parse("2.0.0").expect("version")).is_err());
    }

    #[test]
    fn unsafe_svg_is_rejected() {
        let dir = TempDir::new("svg");
        let path = dir.path().join("unsafe.emoshelf-renderer");
        let svg =
            br#"<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><script/></svg>"#;
        write_pack(&path, &manifest_for(svg), svg, &test_key(), None);
        assert!(validate_pack_at(
            &path,
            &trusted_keys(),
            &Version::parse("0.4.0").expect("version")
        )
        .is_err());
    }

    #[test]
    fn save_load_enable_read_and_remove_helpers_work() {
        let dir = TempDir::new("lifecycle");
        let source = dir.path().join("source.emoshelf-renderer");
        let root = dir.path().join("installed");
        std::fs::create_dir(&root).expect("root");
        let svg = test_svg();
        write_pack(&source, &manifest_for(&svg), &svg, &test_key(), None);
        let pack = validate_pack_at(
            &source,
            &trusted_keys(),
            &Version::parse("0.4.0").expect("version"),
        )
        .expect("pack");
        save_validated_pack(&root, &pack).expect("save");
        let installed = load_installed_pack(&root, "fluent", &trusted_keys()).expect("load");
        assert!(installed.metadata.enabled);
        assert_eq!(installed.manifest.assets.len(), 1);
        let install_path = root.join("fluent/install.json");
        let mut metadata: InstallMetadata =
            serde_json::from_slice(&std::fs::read(&install_path).expect("install metadata"))
                .expect("parse metadata");
        metadata.enabled = false;
        write_atomic(
            &install_path,
            &serde_json::to_vec(&metadata).expect("metadata"),
        )
        .expect("toggle");
        assert!(
            !load_installed_pack(&root, "fluent", &trusted_keys())
                .expect("reload")
                .metadata
                .enabled
        );
        ensure_regular_directory(&root.join("fluent")).expect("regular directory");
        std::fs::remove_dir_all(root.join("fluent")).expect("remove");
        assert!(!root.join("fluent").exists());
    }

    #[test]
    fn invalid_hexcode_is_rejected() {
        assert!(validate_hexcode("1F600").is_err());
        assert!(validate_hexcode("01f600").is_err());
        assert!(validate_hexcode("110000").is_err());
        assert!(validate_hexcode("1f600-200d-1f680").is_ok());
    }

    #[test]
    fn build_without_key_fails_closed() {
        if option_env!("EMOSHELF_RENDERER_KEY_ID").is_none()
            && option_env!("EMOSHELF_RENDERER_PUBLIC_KEY_BASE64").is_none()
        {
            assert!(production_trusted_keys().is_err());
        }
    }
}
