import type { CSSProperties } from "react";
import { Img, staticFile } from "remotion";

export type EmojiStyle = "twemoji" | "fluent" | "noto" | "openmoji";

export const emojiFile = (emoji: string) => {
  const cps = [...emoji].map((c) => c.codePointAt(0)!.toString(16));
  return (cps.includes("200d") ? cps : cps.filter((c) => c !== "fe0f")).join("-");
};

export const Emoji = ({
  e,
  size,
  style = "twemoji",
  css,
}: {
  e: string;
  size: number;
  style?: EmojiStyle;
  css?: CSSProperties;
}) => (
  <Img
    src={staticFile(`emoji/${style}/${emojiFile(e)}.svg`)}
    style={{ width: size, height: size, display: "block", ...css }}
  />
);
