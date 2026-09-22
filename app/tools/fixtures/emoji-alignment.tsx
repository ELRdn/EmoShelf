// Development-only visual fixture using the production artwork and size rules.
import { createRoot } from "react-dom/client";
import { EmojiArtwork } from "../../src/components/EmojiArtwork";
import "../../src/App.css";

const sizes = [
  ["catalog", "emoji-tile", "emoji-art"],
  ["shelf", "emoji-tile shelf-tile", "emoji-art"],
  ["detail", "detail-artwork", "detail-emoji"],
  ["summary", "selection-summary", "emoji-art"],
];

const root = document.getElementById("root");
if (!root) throw new Error("Fixture root is missing");
createRoot(root).render(
  <main style={{ padding: 24, height: "auto" }}>
    <h1>Native emoji alignment</h1>
    <p>Production EmojiArtwork at catalog, shelf, detail and summary sizes</p>
    {sizes.map(([name, parent, artwork]) => (
      <section key={name} style={{ margin: "20px 0" }}>
        <h2>{name}</h2>
        <div style={{ display: "flex", gap: 16 }}>
          {["😀", "😂", "🔥", "❤️", "🏳️‍🌈"].map((emoji, index) => (
            <div
              className={parent}
              key={emoji}
              style={{ flex: "none", width: 74, justifyContent: "center" }}
            >
              <EmojiArtwork
                className={artwork}
                emoji={emoji}
                hexcode={
                  [
                    "1f600",
                    "1f602",
                    "1f525",
                    "2764-fe0f",
                    "1f3f3-fe0f-200d-1f308",
                  ][index]
                }
                renderer="native"
              />
            </div>
          ))}
        </div>
      </section>
    ))}
  </main>,
);
