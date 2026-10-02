import { Audio } from "@remotion/media";
import { interpolate, Sequence, staticFile } from "remotion";

// "everyone" — 101.99 BPM. Beat k is at 0.0147 + 0.58829·k s (fitted over the whole song); downbeats are
// k ≡ 2 (mod 4). Drop (drums in): 20.02 s (k = 34). Last chorus ends on the downbeat at 156.50 s (k = 266).
// Not committed: public/music is git-ignored.
export const beat = (k: number) => Math.round((0.0147 + 0.58829 * k) * 60);
export const DROP = beat(34);

const XF = 3;
const FADE = 18;
const VOLUME = 0.48;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Plays the song from `head` (song frame at video frame 0), jumps from song frame `from` to `to`
// (both downbeats) with a short crossfade, and fades out over the last FADE frames before `end`.
export const Bgm = ({ head, from, to, end }: { head: number; from: number; to: number; end: number }) => {
  const len = from - head;
  const tail = end - len + XF;
  return (
    <>
      <Sequence durationInFrames={len + XF} layout="none" name="bgm:a">
        <Audio
          src={staticFile("music/everyone.mp3")}
          trimBefore={head}
          trimAfter={from + XF}
          volume={(f) => VOLUME * interpolate(f, [0, 4, len - XF, len + XF], [0, 1, 1, 0], clamp)}
        />
      </Sequence>
      <Sequence from={len - XF} durationInFrames={tail} layout="none" name="bgm:b">
        <Audio
          src={staticFile("music/everyone.mp3")}
          trimBefore={to - XF}
          volume={(f) => VOLUME * interpolate(f, [0, 2 * XF, tail - FADE, tail], [0, 1, 1, 0], clamp)}
        />
      </Sequence>
    </>
  );
};
