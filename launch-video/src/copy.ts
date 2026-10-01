export type Lang = "ja" | "en";

// A telop is a list of segments; `hl` segments are drawn in purple.
export type Telop = { t: string; hl?: boolean }[];

export const copy: Record<Lang, Record<string, Telop>> = {
  ja: {
    hook: [{ t: "いつもの絵文字を" }, { t: "毎回探してない？", hl: true }],
    core: [{ t: "Alt + E なら" }, { t: "ワンクリック", hl: true }],
    arrange: [{ t: "よく使う順に" }, { t: "並べておける", hl: true }],
    search: [{ t: "日本語でも英語でも" }, { t: "探せる", hl: true }],
    style: [{ t: "絵文字の" }, { t: "見た目も選べる", hl: true }],
    catch: [{ t: "いつもの絵文字を、" }, { t: "自分だけの棚に。", hl: true }],
  },
  en: {
    hook: [{ t: "Hunting for the same emoji " }, { t: "again?", hl: true }],
    core: [{ t: "Alt + E. " }, { t: "One click. Done.", hl: true }],
    arrange: [{ t: "Keep them " }, { t: "in your order.", hl: true }],
    search: [{ t: "Search in " }, { t: "English or Japanese.", hl: true }],
    style: [{ t: "Choose how your " }, { t: "emoji look.", hl: true }],
    catch: [{ t: "Your favorites. " }, { t: "Within reach.", hl: true }],
  },
};

export const badges: Record<Lang, string[]> = {
  ja: ["無料・オープンソース", "アカウント不要", "データはこのPCに", "Windows 11"],
  en: ["Free & open source", "No account", "Data stays local", "Windows 11"],
};

export const attribution =
  "Emoji: Twemoji (CC-BY 4.0) · Fluent Emoji (MIT) · Noto Emoji (Apache-2.0) · OpenMoji (CC BY-SA 4.0)";
