import type { Cell } from "./components/ShelfWindow";

export const split = (list: string) =>
  [...new Intl.Segmenter().segment(list)].map((s) => s.segment);

const em = (list: string): Cell[] => split(list).map((e) => ({ kind: "emoji", e }));

export const myShelf: Cell[] = em("🙏👍😂🎉✨🙇😭🔥👀💯❤️🥺🤔👏");

export const catResults: Cell[] = em("🐱🐈🐈‍⬛😺😸😹😻😼😽🙀😿😾");

// Only emoji without skin-tone variants: those are the ones the Fluent pack covers.
export const styleShelf = split("😂🎉✨😭🔥👀💯❤️🥺🤔😊🥳🚀☕");
