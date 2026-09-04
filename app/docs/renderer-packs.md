# EmoShelf Renderer Pack仕様（format v1）

`.emoshelf-renderer`は、外部絵文字アートをEmoShelfへ追加する署名付きZIPコンテナ。
v0.4では`fluent`、`noto`、`openmoji`の3つのRenderer IDだけを受理する。

## ZIP構成

```text
manifest.json
signature.ed25519
LICENSE.txt
emoji/<canonical-lowercase-hexcode>.svg
```

- `manifest.json`はUTF-8 JSONで、formatは`emoshelf-renderer`、formatVersionは`1`
- version、表示名、帰属、ライセンス名、key ID、対応アプリ版の下限／上限を含む
- 各assetはUnicode hexcode、固定パス、SHA-256、byte lengthをmanifestへ記録する
- `signature.ed25519`は、保存された`manifest.json`の生バイト列に対する64byteのEd25519署名
- `LICENSE.txt`は必須。UIからライセンス名・帰属・本文を確認できる
- 未知entry、重複entry、ディレクトリ脱出、絶対パス、NUL、シンボリックリンクを拒否する

## 検証境界

- ZIPは128MiB、2100entry、展開後合計128MiBまで
- SVGは1件256KiB、最大2048件
- hexcodeは小文字のcanonical形式（例: `1f600`、`1f469-200d-1f4bb`）
- manifestとZIP内asset集合、サイズ、SHA-256が完全一致しなければ拒否する
- SVGは静的要素だけを許可し、script、animation、外部参照、埋め込みimage、
  style要素／属性、ネットワークURL等を拒否する
- `minAppVersion <= 現在版 < maxAppVersionExclusive`を満たさないPackは拒否する
- 導入済みPackも列挙・描画時に署名とasset hashを再検証する

## 信頼鍵

ランタイムが信頼する公開鍵はビルド時に次の2変数から固定する。

```text
EMOSHELF_RENDERER_KEY_ID
EMOSHELF_RENDERER_PUBLIC_KEY_BASE64
```

両方が無い、形式が不正、manifestのkey IDと一致しない場合はPack導入をfail-closedで拒否する。
秘密鍵、鍵パスワード、署名ログの機密部分はリポジトリへコミットしない。
Updater署名鍵とは別鍵を使う。

## 導入と削除

Packは`appLocalData/renderer-packs/<renderer-id>/`へstaging後に置換し、旧版は一時backupへ退避する。
失敗時は旧版へロールバックする。有効／無効状態はアトミックに保存する。
削除はRenderer ID単位で行い、削除対象が現在選択中ならUIはTwemojiへフォールバックする。
