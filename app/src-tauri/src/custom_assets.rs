//! カスタム画像アセットの取り込み・正規化・保存・読み出し・削除。
//!
//! - 入力は PNG / WebP / 静的 SVG のみ（バイト内容で判定し、拡張子は使わない）
//! - すべて Rust 側でデコード/パースし、PNG に正規化してから保存する
//! - 保存ファイル名とアセット ID は正規化 PNG バイト列の SHA-256 小文字 hex
//! - 外部の元パス・元ファイル名は記録にも返り値にも一切出さない

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use base64::Engine as _;
use image::ImageEncoder;
use resvg::{tiny_skia, usvg};
use sha2::{Digest, Sha256};
use tauri::Manager;

/// ラスタ入力（PNG/WebP）の最大サイズ。
const MAX_RASTER_SOURCE_BYTES: usize = 4 * 1024 * 1024;
/// SVG 入力の最大サイズ。
const MAX_SVG_SOURCE_BYTES: usize = 512 * 1024;
/// 幅・高さそれぞれの上限。
const MAX_DIMENSION: u32 = 2048;
/// 総ピクセル数の上限（2048 × 2048）。
const MAX_TOTAL_PIXELS: u64 = 4_194_304;
/// 正規化後 PNG の最大サイズ。
const MAX_NORMALIZED_PNG_BYTES: usize = 8 * 1024 * 1024;
/// 保存できるアセット数の上限。
const MAX_ASSETS: usize = 256;
/// アセット保存ディレクトリ名（appLocalData 直下）。
const ASSET_DIR_NAME: &str = "custom-assets";
/// 保存・削除を直列化するロック（並行 import での競合防止）。
static ASSET_IO_LOCK: Mutex<()> = Mutex::new(());

/// SVG 内で許可しない要素（fail-closed）。
const FORBIDDEN_ELEMENTS: &[&str] = &[
    "script",
    "foreignobject",
    "animate",
    "animatetransform",
    "animatemotion",
    "animatecolor",
    "set",
    "discard",
    "image",
    "feimage",
    "style",
    "audio",
    "video",
    "iframe",
    "mpath",
];

/// 取り込み結果のレコード（フロントへ返す）。
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomAssetRecord {
    pub id: String,
    pub file_name: String,
    pub media_type: String,
    pub width: u32,
    pub height: u32,
    pub byte_length: u64,
    pub sha256: String,
}

/// 読み出し結果（フロントへ返す）。
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomAssetData {
    pub id: String,
    pub media_type: String,
    pub data_base64: String,
    pub width: u32,
    pub height: u32,
}

enum InputFormat {
    Png,
    WebP,
    Svg,
}

struct NormalizedImage {
    png: Vec<u8>,
    width: u32,
    height: u32,
}

/// 入力バイト列を内容で判定し、PNG に正規化する。
fn normalize_image(bytes: &[u8]) -> Result<NormalizedImage, String> {
    if bytes.len() > MAX_RASTER_SOURCE_BYTES {
        return Err("source exceeds the 4 MiB safety limit".to_string());
    }
    match detect_format(bytes)? {
        InputFormat::Png => normalize_raster(bytes, image::ImageFormat::Png),
        InputFormat::WebP => normalize_raster(bytes, image::ImageFormat::WebP),
        InputFormat::Svg => normalize_svg(bytes),
    }
}

/// バイト内容だけで形式を判定する（拡張子は使わない）。
fn detect_format(bytes: &[u8]) -> Result<InputFormat, String> {
    if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        return Ok(InputFormat::Png);
    }
    if bytes.len() >= 12 && &bytes[..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        return Ok(InputFormat::WebP);
    }
    let text = std::str::from_utf8(bytes).map_err(|_| "input is not valid UTF-8".to_string())?;
    let trimmed = text.trim_start_matches('\u{feff}').trim_start();
    if trimmed.starts_with('<') {
        return Ok(InputFormat::Svg);
    }
    Err("unsupported image format: only PNG, WebP, and static SVG are accepted".to_string())
}

/// ラスタ画像（PNG/WebP）を完全デコードして PNG に再エンコードする。
fn normalize_raster(bytes: &[u8], format: image::ImageFormat) -> Result<NormalizedImage, String> {
    let (width, height) = image::ImageReader::with_format(std::io::Cursor::new(bytes), format)
        .into_dimensions()
        .map_err(|e| format!("failed to read image header: {e}"))?;
    check_dimensions(width, height)?;
    let reader = image::ImageReader::with_format(std::io::Cursor::new(bytes), format);
    let img = reader
        .decode()
        .map_err(|e| format!("failed to decode image: {e}"))?;
    let width = img.width();
    let height = img.height();
    let rgba = img.to_rgba8();
    let mut png_bytes = Vec::new();
    {
        let encoder = image::codecs::png::PngEncoder::new(&mut png_bytes);
        encoder
            .write_image(
                rgba.as_raw(),
                width,
                height,
                image::ExtendedColorType::Rgba8,
            )
            .map_err(|e| format!("failed to encode normalized PNG: {e}"))?;
    }
    if png_bytes.len() > MAX_NORMALIZED_PNG_BYTES {
        return Err("normalized PNG exceeds the 8 MiB safety limit".to_string());
    }
    Ok(NormalizedImage {
        png: png_bytes,
        width,
        height,
    })
}

/// SVG をサニタイズ後に usvg でパースし、透過 PNG へ決定的にレンダリングする。
fn normalize_svg(bytes: &[u8]) -> Result<NormalizedImage, String> {
    if bytes.len() > MAX_SVG_SOURCE_BYTES {
        return Err("SVG source exceeds the 512 KiB safety limit".to_string());
    }
    let text = std::str::from_utf8(bytes).map_err(|_| "SVG is not valid UTF-8".to_string())?;
    validate_static_svg(text)?;
    let tree = usvg::Tree::from_str(text, &usvg::Options::default())
        .map_err(|e| format!("SVG parse failed: {e}"))?;
    let size = tree.size();
    let width = size.width().ceil() as u32;
    let height = size.height().ceil() as u32;
    check_dimensions(width, height)?;
    let mut pixmap = tiny_skia::Pixmap::new(width, height)
        .ok_or_else(|| "failed to allocate SVG render buffer".to_string())?;
    resvg::render(&tree, usvg::Transform::default(), &mut pixmap.as_mut());
    let png_bytes = pixmap
        .encode_png()
        .map_err(|e| format!("failed to encode rendered SVG as PNG: {e}"))?;
    if png_bytes.len() > MAX_NORMALIZED_PNG_BYTES {
        return Err("normalized PNG exceeds the 8 MiB safety limit".to_string());
    }
    Ok(NormalizedImage {
        png: png_bytes,
        width,
        height,
    })
}

/// 幅・高さ・総ピクセル数の安全上限を検証する。
fn check_dimensions(width: u32, height: u32) -> Result<(), String> {
    if width == 0 || height == 0 {
        return Err("image dimensions must be positive".to_string());
    }
    if width > MAX_DIMENSION || height > MAX_DIMENSION {
        return Err(format!(
            "image dimensions exceed the {MAX_DIMENSION}px limit"
        ));
    }
    let pixels = u64::from(width) * u64::from(height);
    if pixels > MAX_TOTAL_PIXELS {
        return Err("image exceeds the 4,194,304 pixel limit".to_string());
    }
    Ok(())
}

/// SVG の fail-closed サニタイザ。
/// 不正 XML・script・foreignObject・アニメーション・イベントハンドラ属性・
/// 外部/ネットワーク/ファイル/data 参照・CSS @import/javascript・
/// 埋め込みラスタ画像要素を拒否する。
pub(crate) fn validate_static_svg(input: &str) -> Result<(), String> {
    let input = input.trim_start_matches('\u{feff}');
    for c in input.chars() {
        if !is_valid_xml_char(c) {
            return Err("SVG contains characters that are not valid in XML".to_string());
        }
    }

    let mut rest = input;
    let mut depth = 0usize;
    let mut saw_root = false;

    while !rest.is_empty() {
        let Some(lt) = rest.find('<') else {
            break;
        };
        rest = &rest[lt..];

        if rest.starts_with("<!--") {
            let Some(end) = rest.find("-->") else {
                return Err("unclosed XML comment".to_string());
            };
            rest = &rest[end + 3..];
            continue;
        }
        if rest.starts_with("<![CDATA[") {
            let Some(end) = rest.find("]]>") else {
                return Err("unclosed CDATA section".to_string());
            };
            rest = &rest[end + 3..];
            continue;
        }
        if rest.starts_with("<?") {
            let Some(end) = rest.find("?>") else {
                return Err("unclosed processing instruction".to_string());
            };
            rest = &rest[end + 2..];
            continue;
        }
        if rest.starts_with("<!") {
            let Some(end) = rest.find('>') else {
                return Err("unclosed XML declaration".to_string());
            };
            let declaration = &rest[..end + 1];
            if declaration.to_ascii_lowercase().contains("doctype") {
                return Err("DOCTYPE declarations are not allowed".to_string());
            }
            return Err("unsupported XML declaration".to_string());
        }

        let after_lt = &rest[1..];
        let is_closing = after_lt.starts_with('/');
        let name_start = if is_closing { &after_lt[1..] } else { after_lt };
        let name_end = name_start
            .find(|c: char| c.is_whitespace() || c == '>' || c == '/')
            .unwrap_or(name_start.len());
        let name = &name_start[..name_end];
        if name.is_empty() {
            return Err("malformed XML tag".to_string());
        }
        let name_lower = name.to_ascii_lowercase();

        let Some(gt) = rest.find('>') else {
            return Err("unclosed XML tag".to_string());
        };
        let tag_inner = &rest[1..gt];
        let self_closing = tag_inner.trim_end().ends_with('/');
        let name_offset = 1 + usize::from(is_closing) + name_end;
        let after_name = &rest[name_offset..gt];

        if is_closing {
            if self_closing {
                return Err("malformed closing tag".to_string());
            }
            if !after_name.trim().is_empty() {
                return Err("closing tag must not have attributes".to_string());
            }
            if depth == 0 {
                return Err("unbalanced closing tag".to_string());
            }
            depth -= 1;
        } else {
            if FORBIDDEN_ELEMENTS.contains(&name_lower.as_str()) {
                return Err(format!("element <{name_lower}> is not allowed"));
            }
            if name_lower == "svg" {
                saw_root = true;
            }
            if !self_closing {
                depth += 1;
            }
            check_attributes(after_name)?;
        }
        rest = &rest[gt + 1..];
    }

    if depth != 0 {
        return Err("unbalanced XML tags".to_string());
    }
    if !saw_root {
        return Err("missing <svg> root element".to_string());
    }
    Ok(())
}

/// XML 1.0 で許される文字だけかを判定する。
fn is_valid_xml_char(c: char) -> bool {
    matches!(
        c,
        '\u{9}' | '\u{A}' | '\u{D}' | '\u{20}'..='\u{D7FF}'
            | '\u{E000}'..='\u{FFFD}'
            | '\u{10000}'..='\u{10FFFF}'
    )
}

/// 属性名と属性値を検査する。
fn check_attributes(attr_text: &str) -> Result<(), String> {
    let mut rest = attr_text;
    loop {
        rest = rest.trim_start();
        if rest.is_empty() {
            return Ok(());
        }
        if rest.starts_with('/') {
            return Ok(());
        }
        let name_end = rest
            .find(|c: char| c.is_whitespace() || c == '=')
            .unwrap_or(rest.len());
        let name = &rest[..name_end];
        if name.is_empty() {
            return Err("malformed attribute".to_string());
        }
        let name_lower = name.to_ascii_lowercase();
        if name_lower.starts_with("on") {
            return Err(format!("event handler attribute '{name}' is not allowed"));
        }
        rest = &rest[name_end..];
        rest = rest.trim_start();
        if !rest.starts_with('=') {
            return Err("attribute value must be quoted".to_string());
        }
        rest = &rest[1..];
        rest = rest.trim_start();
        let (value, after) = if let Some(after_quote) = rest.strip_prefix('"') {
            let Some(end) = after_quote.find('"') else {
                return Err("unclosed attribute value".to_string());
            };
            (&after_quote[..end], &after_quote[end + 1..])
        } else if let Some(after_quote) = rest.strip_prefix('\'') {
            let Some(end) = after_quote.find('\'') else {
                return Err("unclosed attribute value".to_string());
            };
            (&after_quote[..end], &after_quote[end + 1..])
        } else {
            return Err("attribute value must be quoted".to_string());
        };
        check_attribute_value(&name_lower, value)?;
        rest = after;
    }
}

/// 属性値の危険な参照を検査する。
fn check_attribute_value(name: &str, value: &str) -> Result<(), String> {
    let lower = value.to_ascii_lowercase();
    if value.contains('&') {
        return Err("XML entities are not allowed in SVG attributes".to_string());
    }
    if lower.contains("javascript:") {
        return Err("javascript: URLs are not allowed".to_string());
    }
    if name == "style" {
        return Err("style attributes are not allowed".to_string());
    }
    if matches!(name, "href" | "xlink:href" | "src") {
        let trimmed = value.trim();
        let is_internal = trimmed.is_empty() || trimmed.starts_with('#');
        if !is_internal {
            return Err(format!(
                "external resource reference in '{name}' is not allowed"
            ));
        }
    }
    let mut search = lower.as_str();
    while let Some(pos) = search.find("url(") {
        let after = &search[pos + 4..];
        let Some(end) = after.find(')') else {
            return Err("malformed url() in SVG attribute".to_string());
        };
        let url = after[..end].trim().trim_matches('"').trim_matches('\'');
        let is_internal = !url.is_empty() && url.starts_with('#');
        if !is_internal {
            return Err("external url() reference in SVG attribute is not allowed".to_string());
        }
        search = &after[end + 1..];
    }
    Ok(())
}

/// 正規化 PNG バイト列の SHA-256 小文字 hex を返す。
fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hex::encode(hasher.finalize())
}

/// アセット ID はちょうど 64 文字の小文字 hex でなければならない。
fn validate_asset_id(asset_id: &str) -> Result<(), String> {
    let is_valid = asset_id.len() == 64
        && asset_id
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b));
    if !is_valid {
        return Err("asset ID must be exactly 64 lowercase hex characters".to_string());
    }
    Ok(())
}

/// state.json 内の値が image 型で指定アセット ID を参照しているかを判定する。
fn is_image_reference(value: &serde_json::Value, asset_id: &str) -> bool {
    value.get("type").and_then(serde_json::Value::as_str) == Some("image")
        && value.get("assetId").and_then(serde_json::Value::as_str) == Some(asset_id)
}

/// state.json 内でアセット ID が参照されているかを判定する。
/// boards 配下の image 項目と recent の image エントリだけを参照とみなす。
/// customAssets メタデータだけでは参照とみなさない。
fn asset_is_referenced(state_json: &str, asset_id: &str) -> Result<bool, String> {
    let value: serde_json::Value = serde_json::from_str(state_json)
        .map_err(|e| format!("state.json is not valid JSON: {e}"))?;
    let object = value
        .as_object()
        .ok_or_else(|| "state.json must be an object".to_string())?;

    if let Some(boards) = object.get("boards").and_then(serde_json::Value::as_array) {
        for board in boards {
            if let Some(items) = board.get("items").and_then(serde_json::Value::as_array) {
                for item in items {
                    if is_image_reference(item, asset_id) {
                        return Ok(true);
                    }
                }
            }
        }
    }

    if let Some(recent) = object.get("recent").and_then(serde_json::Value::as_array) {
        for entry in recent {
            if is_image_reference(entry, asset_id) {
                return Ok(true);
            }
        }
    }

    Ok(false)
}

/// 保存ディレクトリ内の .png ファイル数を数える。
fn count_assets(dir: &Path) -> Result<usize, String> {
    let entries = std::fs::read_dir(dir).map_err(|e| e.to_string())?;
    let mut count = 0usize;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.path().extension().and_then(|e| e.to_str()) == Some("png") {
            count += 1;
        }
    }
    Ok(count)
}

/// 正規化 PNG を `<dir>/<sha256>.png` へアトミックに保存する。
/// 同一バイト列は重複保存せず既存レコードを返す。
fn store_normalized_at(
    dir: &Path,
    normalized: &NormalizedImage,
) -> Result<CustomAssetRecord, String> {
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let sha256 = sha256_hex(&normalized.png);
    let file_name = format!("{sha256}.png");
    let path = dir.join(&file_name);
    if !path.exists() {
        let _guard = ASSET_IO_LOCK.lock().map_err(|e| e.to_string())?;
        if !path.exists() {
            if count_assets(dir)? >= MAX_ASSETS {
                return Err(format!("custom asset limit reached ({MAX_ASSETS})"));
            }
            let tmp = dir.join(format!("{sha256}.png.tmp"));
            if tmp.exists() {
                std::fs::remove_file(&tmp).map_err(|e| e.to_string())?;
            }
            std::fs::write(&tmp, &normalized.png).map_err(|e| e.to_string())?;
            std::fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
        }
    }
    Ok(CustomAssetRecord {
        id: sha256.clone(),
        file_name,
        media_type: "image/png".to_string(),
        width: normalized.width,
        height: normalized.height,
        byte_length: normalized.png.len() as u64,
        sha256,
    })
}

/// 保存済みアセットを読み出し、base64 と寸法を返す。
pub(crate) fn validate_png_bytes(asset_id: &str, bytes: &[u8]) -> Result<(u32, u32), String> {
    validate_asset_id(asset_id)?;
    if bytes.len() > MAX_NORMALIZED_PNG_BYTES {
        return Err("stored asset exceeds the 8 MiB safety limit".to_string());
    }
    if sha256_hex(bytes) != asset_id {
        return Err("stored asset hash does not match its ID".to_string());
    }
    let img = image::load_from_memory_with_format(bytes, image::ImageFormat::Png)
        .map_err(|e| format!("stored asset is not a valid PNG: {e}"))?;
    check_dimensions(img.width(), img.height())?;
    Ok((img.width(), img.height()))
}

pub(crate) fn read_png_bytes_at(dir: &Path, asset_id: &str) -> Result<Vec<u8>, String> {
    validate_asset_id(asset_id)?;
    let path = dir.join(format!("{asset_id}.png"));
    let bytes = std::fs::read(&path).map_err(|e| format!("asset not found: {e}"))?;
    validate_png_bytes(asset_id, &bytes)?;
    Ok(bytes)
}

fn read_asset_at(dir: &Path, asset_id: &str) -> Result<CustomAssetData, String> {
    let bytes = read_png_bytes_at(dir, asset_id)?;
    let img = image::load_from_memory_with_format(&bytes, image::ImageFormat::Png)
        .map_err(|e| format!("stored asset is not a valid PNG: {e}"))?;
    Ok(CustomAssetData {
        id: asset_id.to_string(),
        media_type: "image/png".to_string(),
        data_base64: base64::engine::general_purpose::STANDARD.encode(&bytes),
        width: img.width(),
        height: img.height(),
    })
}

/// アセットを削除する。state.json 内で参照されていれば拒否する。
/// ファイルが無ければ false、削除できれば true を返す。
fn remove_asset_at(dir: &Path, asset_id: &str, state_json: &str) -> Result<bool, String> {
    validate_asset_id(asset_id)?;
    if asset_is_referenced(state_json, asset_id)? {
        return Err("asset is still referenced by a board item or recent entry".to_string());
    }
    let path = dir.join(format!("{asset_id}.png"));
    if !path.exists() {
        return Ok(false);
    }
    let _guard = ASSET_IO_LOCK.lock().map_err(|e| e.to_string())?;
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Ok(false)
    }
}

/// appLocalData/custom-assets ディレクトリを返す（無ければ作成する）。
pub(crate) fn asset_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    let dir = base.join(ASSET_DIR_NAME);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

pub(crate) fn read_png_bytes(app: &tauri::AppHandle, asset_id: &str) -> Result<Vec<u8>, String> {
    read_png_bytes_at(&asset_dir(app)?, asset_id)
}

pub(crate) fn asset_path(app: &tauri::AppHandle, asset_id: &str) -> Result<PathBuf, String> {
    let dir = asset_dir(app)?;
    read_png_bytes_at(&dir, asset_id)?;
    Ok(dir.join(format!("{asset_id}.png")))
}

pub(crate) fn install_archive_assets(
    app: &tauri::AppHandle,
    assets: &[(String, Vec<u8>)],
) -> Result<(), String> {
    let dir = asset_dir(app)?;
    let mut validated = Vec::with_capacity(assets.len());
    for (asset_id, bytes) in assets {
        validate_png_bytes(asset_id, bytes)?;
        validated.push((asset_id, bytes));
    }

    let _guard = ASSET_IO_LOCK.lock().map_err(|e| e.to_string())?;
    let new_count = validated
        .iter()
        .filter(|(asset_id, _)| !dir.join(format!("{asset_id}.png")).exists())
        .count();
    if count_assets(&dir)?.saturating_add(new_count) > MAX_ASSETS {
        return Err(format!("custom asset limit reached ({MAX_ASSETS})"));
    }

    for (asset_id, bytes) in &validated {
        if dir.join(format!("{asset_id}.png")).exists()
            && read_png_bytes_at(&dir, asset_id)?.as_slice() != bytes.as_slice()
        {
            return Err("existing asset bytes do not match archive content".to_string());
        }
    }

    let mut created = Vec::new();
    for (asset_id, bytes) in validated {
        let path = dir.join(format!("{asset_id}.png"));
        if path.exists() {
            continue;
        }
        let temporary = dir.join(format!(".{asset_id}.import.tmp"));
        if temporary.exists() {
            std::fs::remove_file(&temporary).map_err(|e| e.to_string())?;
        }
        if let Err(error) =
            std::fs::write(&temporary, bytes).and_then(|_| std::fs::rename(&temporary, &path))
        {
            let _ = std::fs::remove_file(&temporary);
            for created_path in created {
                let _ = std::fs::remove_file(created_path);
            }
            return Err(error.to_string());
        }
        created.push(path);
    }
    Ok(())
}

/// カスタム画像を取り込む（Tauri コマンド）。
#[tauri::command]
pub fn import_custom_asset(
    app: tauri::AppHandle,
    path: String,
) -> Result<CustomAssetRecord, String> {
    let metadata =
        std::fs::metadata(&path).map_err(|e| format!("failed to read source file: {e}"))?;
    if !metadata.is_file() {
        return Err("source path is not a file".to_string());
    }
    if metadata.len() > MAX_RASTER_SOURCE_BYTES as u64 {
        return Err("source exceeds the 4 MiB safety limit".to_string());
    }
    let bytes = std::fs::read(&path).map_err(|e| format!("failed to read source file: {e}"))?;
    let normalized = normalize_image(&bytes)?;
    let dir = asset_dir(&app)?;
    store_normalized_at(&dir, &normalized)
}

/// 保存済みカスタム画像を読み出す（Tauri コマンド）。
#[tauri::command]
pub fn read_custom_asset(
    app: tauri::AppHandle,
    asset_id: String,
) -> Result<CustomAssetData, String> {
    let dir = asset_dir(&app)?;
    read_asset_at(&dir, &asset_id)
}

/// カスタム画像を削除する（Tauri コマンド）。
#[tauri::command]
pub fn remove_custom_asset(
    app: tauri::AppHandle,
    asset_id: String,
    state_json: String,
) -> Result<bool, String> {
    let dir = asset_dir(&app)?;
    remove_asset_at(&dir, &asset_id, &state_json)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    /// テスト用の一時ディレクトリ。ドロップ時に自分が作ったディレクトリだけを削除する。
    struct TempDir(PathBuf);

    impl TempDir {
        fn new(name: &str) -> Self {
            let unique = format!(
                "emoshelf-asset-test-{}-{}-{}",
                std::process::id(),
                name,
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .expect("system time before epoch")
                    .as_nanos()
            );
            let dir = std::env::temp_dir().join(unique);
            std::fs::create_dir_all(&dir).expect("create temp dir");
            TempDir(dir)
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

    fn make_test_png(width: u32, height: u32) -> Vec<u8> {
        let img = image::RgbaImage::from_pixel(width, height, image::Rgba([200, 100, 50, 255]));
        let mut bytes = Vec::new();
        let encoder = image::codecs::png::PngEncoder::new(&mut bytes);
        encoder
            .write_image(img.as_raw(), width, height, image::ExtendedColorType::Rgba8)
            .expect("encode png");
        bytes
    }

    fn make_test_webp(width: u32, height: u32) -> Vec<u8> {
        let img = image::RgbaImage::from_pixel(width, height, image::Rgba([255, 0, 0, 255]));
        let mut bytes = Vec::new();
        let encoder = image::codecs::webp::WebPEncoder::new_lossless(&mut bytes);
        encoder
            .write_image(img.as_raw(), width, height, image::ExtendedColorType::Rgba8)
            .expect("encode webp");
        bytes
    }

    fn crc32(data: &[u8]) -> u32 {
        let mut crc = 0xFFFF_FFFFu32;
        for &byte in data {
            crc ^= u32::from(byte);
            for _ in 0..8 {
                let mask = (crc & 1).wrapping_neg();
                crc = (crc >> 1) ^ (0xEDB8_8320 & mask);
            }
        }
        !crc
    }

    /// IHDR だけを持つ最小 PNG（寸法検査用）。
    fn minimal_png_header(width: u32, height: u32) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.extend_from_slice(b"\x89PNG\r\n\x1a\n");
        let mut chunk = Vec::new();
        chunk.extend_from_slice(b"IHDR");
        chunk.extend_from_slice(&width.to_be_bytes());
        chunk.extend_from_slice(&height.to_be_bytes());
        chunk.extend_from_slice(&[8, 6, 0, 0, 0]);
        bytes.extend_from_slice(&(chunk.len() as u32).to_be_bytes());
        bytes.extend_from_slice(&chunk);
        bytes.extend_from_slice(&crc32(&chunk).to_be_bytes());
        bytes
    }

    fn empty_state() -> String {
        r#"{"schemaVersion":2,"boards":[],"recent":[]}"#.to_string()
    }

    #[test]
    fn png_input_is_normalized_and_stored() {
        let dir = TempDir::new("png-store");
        let png = make_test_png(4, 5);
        let record = store_normalized_at(dir.path(), &normalize_image(&png).expect("normalize"))
            .expect("store");
        assert_eq!(record.media_type, "image/png");
        assert_eq!(record.width, 4);
        assert_eq!(record.height, 5);
        assert_eq!(record.file_name, format!("{}.png", record.id));
        assert_eq!(record.sha256, record.id);
        let stored = std::fs::read(dir.path().join(&record.file_name)).expect("stored file");
        assert!(stored.starts_with(b"\x89PNG\r\n\x1a\n"));
        assert_eq!(record.byte_length as usize, stored.len());
        assert_eq!(sha256_hex(&stored), record.sha256);
    }

    #[test]
    fn import_deduplicates_identical_bytes() {
        let dir = TempDir::new("dedup");
        let png = make_test_png(3, 3);
        let first = store_normalized_at(dir.path(), &normalize_image(&png).expect("normalize"))
            .expect("first store");
        let second = store_normalized_at(dir.path(), &normalize_image(&png).expect("normalize"))
            .expect("second store");
        assert_eq!(first.id, second.id);
        let png_count = std::fs::read_dir(dir.path())
            .expect("read dir")
            .filter(|entry| {
                entry
                    .as_ref()
                    .expect("entry")
                    .path()
                    .extension()
                    .and_then(|e| e.to_str())
                    == Some("png")
            })
            .count();
        assert_eq!(png_count, 1);
    }

    #[test]
    fn read_returns_base64_and_dimensions() {
        let dir = TempDir::new("read");
        let png = make_test_png(4, 5);
        let record = store_normalized_at(dir.path(), &normalize_image(&png).expect("normalize"))
            .expect("store");
        let data = read_asset_at(dir.path(), &record.id).expect("read");
        assert_eq!(data.id, record.id);
        assert_eq!(data.media_type, "image/png");
        assert_eq!(data.width, 4);
        assert_eq!(data.height, 5);
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(&data.data_base64)
            .expect("decode base64");
        assert_eq!(
            decoded,
            std::fs::read(dir.path().join(&record.file_name)).expect("stored file")
        );
    }

    #[test]
    fn webp_input_is_normalized_to_png() {
        let webp = make_test_webp(6, 6);
        let normalized = normalize_image(&webp).expect("normalize webp");
        assert_eq!(normalized.width, 6);
        assert_eq!(normalized.height, 6);
        assert!(normalized.png.starts_with(b"\x89PNG\r\n\x1a\n"));
    }

    #[test]
    fn svg_input_is_rendered_to_png() {
        let svg = br##"<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#ff0000"/></svg>"##;
        let normalized = normalize_image(svg).expect("normalize svg");
        assert_eq!(normalized.width, 8);
        assert_eq!(normalized.height, 8);
        assert!(normalized.png.starts_with(b"\x89PNG\r\n\x1a\n"));
    }

    #[test]
    fn svg_with_internal_reference_is_accepted() {
        let svg = br##"<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><defs><linearGradient id="g"><stop offset="0" stop-color="#f00"/><stop offset="1" stop-color="#00f"/></linearGradient></defs><rect width="8" height="8" fill="url(#g)"/></svg>"##;
        assert!(normalize_image(svg).is_ok());
    }

    #[test]
    fn svg_with_script_is_rejected() {
        let svg = br#"<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><script>alert(1)</script></svg>"#;
        assert!(normalize_image(svg).is_err());
    }

    #[test]
    fn svg_with_event_handler_is_rejected() {
        let svg = br#"<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" onload="alert(1)"><rect width="8" height="8"/></svg>"#;
        assert!(normalize_image(svg).is_err());
    }

    #[test]
    fn svg_with_foreign_object_is_rejected() {
        let svg = br#"<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><foreignObject><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject></svg>"#;
        assert!(normalize_image(svg).is_err());
    }

    #[test]
    fn svg_with_animation_is_rejected() {
        let svg = br#"<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8"><animate attributeName="width" from="8" to="0" dur="1s"/></rect></svg>"#;
        assert!(normalize_image(svg).is_err());
    }

    #[test]
    fn svg_with_external_href_is_rejected() {
        let svg = br#"<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><image href="https://example.com/x.png" width="8" height="8"/></svg>"#;
        assert!(normalize_image(svg).is_err());
    }

    #[test]
    fn svg_with_data_uri_image_is_rejected() {
        let svg = br#"<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><image href="data:image/png;base64,AAAA" width="8" height="8"/></svg>"#;
        assert!(normalize_image(svg).is_err());
    }

    #[test]
    fn svg_with_css_import_is_rejected() {
        let svg = br#"<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><style>@import url("https://example.com/x.css");</style></svg>"#;
        assert!(normalize_image(svg).is_err());
    }

    #[test]
    fn svg_with_style_attribute_is_rejected() {
        let svg = br#"<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" style="fill:#f00"/></svg>"#;
        assert!(normalize_image(svg).is_err());
    }

    #[test]
    fn svg_with_external_paint_url_is_rejected() {
        let svg = br#"<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="url(https://example.com/p.svg#g)"/></svg>"#;
        assert!(normalize_image(svg).is_err());
    }

    #[test]
    fn svg_with_javascript_url_is_rejected() {
        let svg = br#"<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><a href="javascript:alert(1)"><rect width="8" height="8"/></a></svg>"#;
        assert!(normalize_image(svg).is_err());
    }

    #[test]
    fn svg_with_malformed_xml_is_rejected() {
        let svg = b"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"8\" height=\"8\"><rect width=\"8\" height=\"8\"></svg>";
        assert!(normalize_image(svg).is_err());
    }

    #[test]
    fn svg_without_root_is_rejected() {
        let svg = b"<rect width=\"8\" height=\"8\"/>";
        assert!(normalize_image(svg).is_err());
    }

    #[test]
    fn corrupt_input_is_rejected() {
        assert!(normalize_image(b"not an image at all").is_err());
        assert!(normalize_image(b"\x89PNG\r\n\x1a\n\x00\x00").is_err());
    }

    #[test]
    fn unsupported_format_is_rejected() {
        let jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46];
        assert!(normalize_image(&jpeg).is_err());
    }

    #[test]
    fn oversized_source_is_rejected() {
        let mut bytes = vec![0u8; MAX_RASTER_SOURCE_BYTES + 1];
        bytes[0] = 0x89;
        bytes[1] = b'P';
        bytes[2] = b'N';
        bytes[3] = b'G';
        assert!(normalize_image(&bytes).is_err());
    }

    #[test]
    fn oversized_svg_source_is_rejected() {
        let mut svg = Vec::new();
        svg.extend_from_slice(
            b"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"8\" height=\"8\">",
        );
        svg.resize(svg.len() + MAX_SVG_SOURCE_BYTES, b' ');
        svg.extend_from_slice(b"</svg>");
        assert!(normalize_image(&svg).is_err());
    }

    #[test]
    fn raster_with_oversized_dimensions_is_rejected() {
        let png = minimal_png_header(3000, 3000);
        assert!(normalize_image(&png).is_err());
    }

    #[test]
    fn raster_exceeding_pixel_limit_is_rejected() {
        let png = minimal_png_header(2048, 2049);
        assert!(normalize_image(&png).is_err());
    }

    #[test]
    fn svg_with_oversized_dimensions_is_rejected() {
        let svg = br#"<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="3000"><rect width="3000" height="3000"/></svg>"#;
        assert!(normalize_image(svg).is_err());
    }

    #[test]
    fn invalid_asset_ids_are_rejected() {
        assert!(validate_asset_id("").is_err());
        assert!(validate_asset_id("abc").is_err());
        assert!(validate_asset_id(&"a".repeat(63)).is_err());
        assert!(validate_asset_id(&"A".repeat(64)).is_err());
        assert!(validate_asset_id(&"g".repeat(64)).is_err());
        assert!(validate_asset_id(&"a".repeat(64)).is_ok());
    }

    #[test]
    fn import_rejects_when_asset_count_is_full() {
        let dir = TempDir::new("max-count");
        for i in 0..MAX_ASSETS {
            std::fs::write(dir.path().join(format!("{i:064x}.png")), b"x").expect("seed asset");
        }
        let png = make_test_png(2, 2);
        let result = store_normalized_at(dir.path(), &normalize_image(&png).expect("normalize"));
        let error = result.expect_err("limit must be enforced");
        assert!(error.contains("256"));
    }

    #[test]
    fn remove_rejects_when_referenced_by_board_item() {
        let dir = TempDir::new("ref-board");
        let png = make_test_png(2, 2);
        let record = store_normalized_at(dir.path(), &normalize_image(&png).expect("normalize"))
            .expect("store");
        let state = format!(
            r#"{{"schemaVersion":2,"boards":[{{"id":"b","name":"B","order":0,"items":[{{"id":"i","type":"image","assetId":"{}","display":{{"name":"x","keywords":[]}},"usage":{{"addedAt":"2026-01-01T00:00:00Z","useCount":0}}}}]}}],"recent":[]}}"#,
            record.id
        );
        let result = remove_asset_at(dir.path(), &record.id, &state);
        let error = result.expect_err("referenced asset must not be removed");
        assert!(error.contains("referenced"));
        assert!(dir.path().join(&record.file_name).exists());
    }

    #[test]
    fn remove_rejects_when_referenced_by_recent() {
        let dir = TempDir::new("ref-recent");
        let png = make_test_png(2, 2);
        let record = store_normalized_at(dir.path(), &normalize_image(&png).expect("normalize"))
            .expect("store");
        let state = format!(
            r#"{{"schemaVersion":2,"boards":[],"recent":[{{"id":"r","type":"image","assetId":"{}","usedAt":"2026-01-01T00:00:00Z"}}]}}"#,
            record.id
        );
        assert!(remove_asset_at(dir.path(), &record.id, &state).is_err());
    }

    #[test]
    fn remove_deletes_unreferenced_asset() {
        let dir = TempDir::new("remove-ok");
        let png = make_test_png(2, 2);
        let record = store_normalized_at(dir.path(), &normalize_image(&png).expect("normalize"))
            .expect("store");
        let removed = remove_asset_at(dir.path(), &record.id, &empty_state()).expect("remove");
        assert!(removed);
        assert!(!dir.path().join(&record.file_name).exists());
    }

    #[test]
    fn remove_returns_false_for_missing_file() {
        let dir = TempDir::new("remove-missing");
        let id = "a".repeat(64);
        let removed = remove_asset_at(dir.path(), &id, &empty_state()).expect("remove");
        assert!(!removed);
    }

    #[test]
    fn remove_allows_when_only_custom_assets_metadata_references() {
        let dir = TempDir::new("remove-meta");
        let png = make_test_png(2, 2);
        let record = store_normalized_at(dir.path(), &normalize_image(&png).expect("normalize"))
            .expect("store");
        let state = format!(
            r#"{{"schemaVersion":2,"boards":[],"recent":[],"customAssets":{{"{}":{{"id":"{}","fileName":"{}.png","mediaType":"image/png","width":2,"height":2,"byteLength":1,"sha256":"{}","addedAt":"2026-01-01T00:00:00Z"}}}}}}"#,
            record.id, record.id, record.id, record.id
        );
        let removed = remove_asset_at(dir.path(), &record.id, &state).expect("remove");
        assert!(removed);
    }

    #[test]
    fn remove_rejects_invalid_state_json() {
        let dir = TempDir::new("remove-bad-state");
        let id = "a".repeat(64);
        assert!(remove_asset_at(dir.path(), &id, "not json").is_err());
    }

    #[test]
    fn record_contains_no_source_path_or_name() {
        let dir = TempDir::new("no-leak");
        let png = make_test_png(2, 2);
        let record = store_normalized_at(dir.path(), &normalize_image(&png).expect("normalize"))
            .expect("store");
        let json = serde_json::to_string(&record).expect("serialize record");
        assert!(!json.contains("secret"));
        assert!(!json.contains('\\'));
        assert!(!json.contains("C:"));
        assert!(!json.contains("://"));
        assert!(!json.contains(".."));
        assert_eq!(record.file_name, format!("{}.png", record.id));
    }
}
