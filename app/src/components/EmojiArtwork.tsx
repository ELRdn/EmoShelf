import { useState } from "react";
import { type AppLocale, findByEmoji } from "../lib/emoji";
import type { RendererId } from "../lib/state";

interface EmojiArtworkProps {
  emoji: string;
  hexcode?: string;
  renderer: RendererId;
  locale?: AppLocale;
  className?: string;
}

export function EmojiArtwork({
  emoji,
  hexcode,
  renderer,
  locale = "en",
  className,
}: EmojiArtworkProps) {
  const [failedSource, setFailedSource] = useState("");
  const resolvedHexcode = hexcode ?? findByEmoji(emoji, locale)?.hexcode;
  const source = resolvedHexcode
    ? `/twemoji/${resolvedHexcode.toLowerCase()}.svg`
    : "";

  if (renderer === "twemoji" && source && failedSource !== source) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className={className}
        draggable={false}
        loading="lazy"
        onError={() => setFailedSource(source)}
        src={source}
      />
    );
  }

  return (
    <span aria-hidden="true" className={className} role="img">
      {emoji}
    </span>
  );
}
