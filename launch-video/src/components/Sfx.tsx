import { Audio } from "@remotion/media";
import { Sequence, staticFile } from "remotion";

export type SfxName =
  | "key" | "tick" | "scroll" | "impact" | "whoosh" | "whooshDown"
  | "pop" | "popSoft" | "land" | "send" | "flip" | "thud";

export const Sfx = ({ at, name, volume = 1 }: { at: number; name: SfxName; volume?: number }) => (
  <Sequence from={at} layout="none" name={`sfx:${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);
