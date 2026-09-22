# EmoShelf Renderer Pack仕様（format v1）

`.emoshelf-renderer`は、外部絵文字アートをEmoShelfへ追加する署名付きZIPコンテナ。
v0.4では`fluent`、`noto`、`openmoji`の3つのRenderer IDだけを受理する。

## 配布方針と現在地（2026-09-22）

Twemojiは本体同梱、Native / SystemはOSの絵文字フォントを利用する。
Fluent・Noto・OpenMojiは本体へ全同梱せず、GitHub Releasesの署名付き追加パックとして配る。
ユーザー向けの名称は「絵文字スタイル」とし、設定画面から見本を選んで導入できる形を目指す。

| 項目 | 現状 |
| --- | --- |
| 署名・hash・互換性・SVGの検証、ローカルファイルからの導入 | 実装済み。信頼する公開鍵を組み込んだアプリが必要 |
| 有効／無効、削除、ライセンス表示、未導入表示 | 実装済み |
| 公式素材の固定commitとPack生成・署名用ツール | 実装済み。製品用署名・配布の完了とは別 |
| 製品用署名鍵／検証鍵の設定、3種のPackの受け入れと公開 | 未完了。公開済みRC 1のAssetsにPackはない |
| アプリ内の見本・容量・版表示、ダウンロード／導入／更新 | 未実装。現在の「パックを追加」はローカルファイル選択 |

今後の導入フローは「見本を選ぶ → ダウンロード → 署名・互換性を確認 → 導入 → 選択」。
通信失敗・容量不足・キャンセルでは既存のスタイルを保ち、再試行できる表示にする。
更新も検証後に置き換え、失敗時は既存Packへ戻す。導入後の描画はローカルで完結し、
起動や絵文字選択のたびにネットワークへ依存させない。

公開前に3種それぞれのライセンス・対応数・ハッシュ・署名を確認し、実際の配布物から
ダウンロード、導入、選択、再起動、更新失敗時の復旧まで検証する。
これは画像素材の拡張方式であり、任意コードを実行するプラグインAPIは追加しない。
スタイル変更はEmoShelf内のプレビューに適用され、貼り付けたUnicodeの見た目は相手アプリが決める。

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
