import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { pageMetadata, siteUrl } from "./src/config";

export default defineConfig(({ command, isPreview }) => ({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: command === "serve" && !isPreview ? "/" : new URL(siteUrl).pathname,
  plugins: [
    react(),
    {
      name: "emoshelf-page-metadata",
      transformIndexHtml(html, context) {
        const lang = /[/\\]en[/\\]index\.html$/.test(context.filename)
          ? "en"
          : "ja";
        const meta = pageMetadata[lang];
        const canonical = `${siteUrl}${lang === "en" ? "en/" : ""}`;
        return {
          html: html.replace(
            /<title>.*?<\/title>/,
            `<title>${meta.title}</title>`,
          ),
          tags: [
            {
              tag: "meta",
              attrs: { name: "description", content: meta.description },
            },
            { tag: "link", attrs: { rel: "canonical", href: canonical } },
            ...(["ja", "en", "x-default"] as const).map((locale) => ({
              tag: "link",
              attrs: {
                rel: "alternate",
                hreflang: locale,
                href: `${siteUrl}${locale === "en" ? "en/" : ""}`,
              },
            })),
            ...Object.entries({
              "og:type": "website",
              "og:site_name": "EmoShelf",
              "og:title": meta.title,
              "og:description": meta.description,
              "og:url": canonical,
              "og:locale": lang === "ja" ? "ja_JP" : "en_US",
              "og:locale:alternate": lang === "ja" ? "en_US" : "ja_JP",
              "og:image": `${siteUrl}social-card.png`,
              "og:image:width": "1200",
              "og:image:height": "630",
              "og:image:alt": meta.imageAlt,
            }).map(([property, content]) => ({
              tag: "meta",
              attrs: { property, content },
            })),
            {
              tag: "meta",
              attrs: { name: "twitter:card", content: "summary_large_image" },
            },
          ],
        };
      },
    },
  ],
  server: { host: "127.0.0.1", port: 5174, strictPort: true },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        ja: fileURLToPath(new URL("index.html", import.meta.url)),
        en: fileURLToPath(new URL("en/index.html", import.meta.url)),
      },
    },
  },
}));
