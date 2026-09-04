// 基盤確認用の仮シェル。起動確認用の最小表示のみ。
// 本格的な Shelf UI は v0.1 マイルストーンで実装する。
// ここでは基礎レイヤー（ストア・カタログ）の状態を読み取り表示するだけ。
import "./App.css";
import { getCatalog } from "./lib/emoji";
import { useShelfStore } from "./lib/store";

function App() {
  const loaded = useShelfStore((state) => state.loaded);
  const boards = useShelfStore((state) => state.boards);
  const shortcut = useShelfStore((state) => state.settings.globalShortcut);
  const catalogSize = getCatalog().length;

  return (
    <main className="container">
      <h1>EmoShelf</h1>
      <p>Your personal emoji shelf.</p>
      <p className="hint">
        {loaded
          ? `基盤OK — Board ${boards.length} 件 · カタログ ${catalogSize} 件 · ${shortcut} で表示切替`
          : "基盤読み込み中…"}
      </p>
    </main>
  );
}

export default App;
