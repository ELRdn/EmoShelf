import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: "node_modules/@twemoji/svg/*.svg", dest: "twemoji" },
        {
          src: "node_modules/emojibase-data/en/data.json",
          dest: "emoji-data",
          rename: "en-data.json",
        },
        {
          src: "node_modules/emojibase-data/ja/data.json",
          dest: "emoji-data",
          rename: "ja-data.json",
        },
        {
          src: "node_modules/emojibase-data/en/messages.json",
          dest: "emoji-data",
          rename: "en-messages.json",
        },
        {
          src: "node_modules/emojibase-data/ja/messages.json",
          dest: "emoji-data",
          rename: "ja-messages.json",
        },
        {
          src: "node_modules/emojibase-data/en/shortcodes/cldr.json",
          dest: "emoji-data",
          rename: "en-shortcodes.json",
        },
      ],
    }),
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
  },
}));
