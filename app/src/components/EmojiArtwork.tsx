import { useEffect, useState } from "react";
import { type AppLocale, findByEmoji } from "../lib/emoji";
import {
  type PackRendererId,
  rendererAssetDataUrl,
} from "../lib/rendererPacks";
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
  const [packSource, setPackSource] = useState("");
  const resolvedHexcode = hexcode ?? findByEmoji(emoji, locale)?.hexcode;
  const twemojiSource = resolvedHexcode
    ? `/twemoji/${resolvedHexcode.toLowerCase()}.svg`
    : "";
  const isPackRenderer = !["twemoji", "native"].includes(renderer);

  useEffect(() => {
    let active = true;
    setPackSource("");
    if (!isPackRenderer || !resolvedHexcode) {
      return () => {
        active = false;
      };
    }
    void rendererAssetDataUrl(renderer as PackRendererId, resolvedHexcode)
      .then((source) => {
        if (active) {
          setPackSource(source);
        }
      })
      .catch(() => {
        if (active) {
          setPackSource("");
        }
      });
    return () => {
      active = false;
    };
  }, [isPackRenderer, renderer, resolvedHexcode]);

  const source = isPackRenderer ? packSource || twemojiSource : twemojiSource;

  if (renderer !== "native" && source && failedSource !== source) {
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

  const nativeClassName = [
    className,
    resolvedHexcode ? "emoji-native" : "emoji-sequence-art",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span aria-hidden="true" className={nativeClassName} role="img">
      {emoji}
    </span>
  );
}
