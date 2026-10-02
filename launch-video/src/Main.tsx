import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Fragment } from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { ease } from "./anim";
import { beat, Bgm, DROP } from "./components/Bgm";
import { whip, WHIP_FRAMES, whipTiming } from "./components/Whip";
import type { Lang } from "./copy";
import { rounded } from "./fonts";
import { scenes, TRANSITION_S6_S7 } from "./scenes/Scenes";
import { color } from "./theme";

type Scene = (typeof scenes)[number];
type Into = Record<number, "whip" | "fade">;

// Transition into scene i of a list (none = hard cut).
const overlap = (into: Into, i: number) => (into[i] === "whip" ? WHIP_FRAMES : into[i] === "fade" ? TRANSITION_S6_S7 : 0);
const startsOf = (list: Scene[], into: Into) =>
  list.reduce<number[]>((acc, s, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + list[i - 1].frames - overlap(into, i));
    return acc;
  }, []);
const lengthOf = (list: Scene[], into: Into) => startsOf(list, into).at(-1)! + list.at(-1)!.frames;

const mainInto: Into = { 3: "whip", 4: "whip", 5: "whip", 6: "fade" };
export const sceneStarts = startsOf(scenes, mainInto);
export const MAIN_FRAMES = lengthOf(scenes, mainInto);

// README cut: hook, Alt + E, the one-click payoff, then straight to the end card.
const readmeScenes = [0, 1, 2, 7].map((i) => scenes[i]);
const readmeInto: Into = { 3: "whip" };
export const README_FRAMES = lengthOf(readmeScenes, readmeInto);

const Timeline = ({ lang, list, into }: { lang: Lang; list: Scene[]; into: Into }) => (
  <TransitionSeries>
    {list.map(({ id, C, frames }, i) => (
      <Fragment key={id}>
        {into[i] === "whip" && <TransitionSeries.Transition presentation={whip()} timing={whipTiming} />}
        {into[i] === "fade" && (
          <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: TRANSITION_S6_S7 })} />
        )}
        <TransitionSeries.Sequence durationInFrames={frames} name={id} premountFor={30}>
          <C lang={lang} />
        </TransitionSeries.Sequence>
      </Fragment>
    ))}
  </TransitionSeries>
);

// Small persistent logo so a mid-scroll viewer still learns the name.
const BrandBug = ({ frames }: { frames: number }) => {
  const f = useCurrentFrame();
  const o = ease(f, 0, 16) * (1 - ease(f, frames - 16, frames));
  return (
    <div
      style={{
        position: "absolute",
        top: 34,
        right: 40,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 18px 8px 8px",
        borderRadius: 18,
        background: "rgb(255 255 255 / 82%)",
        boxShadow: "0 8px 24px rgb(24 24 27 / 10%)",
        fontFamily: rounded,
        fontWeight: 800,
        fontSize: 28,
        color: color.ink,
        opacity: o,
        transform: `translateY(${(1 - o) * -12}px)`,
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 11, overflow: "hidden", position: "relative" }}>
        <Img src={staticFile("brand/emoshelf-icon-master.png")} style={{ position: "absolute", width: 56, height: 56, left: -6, top: -6 }} />
      </div>
      EmoShelf
    </div>
  );
};

// The drop lands on the Alt + E impact (scene 2, frame 11). Late in scene 7 the song jumps from the first
// chorus to the last one, two bars before its closing downbeat, which lands just before the end.
const MAIN_BGM = { head: DROP - (sceneStarts[1] + 11), from: beat(66), to: beat(258) };

export const Main = ({ lang }: { lang: Lang }) => (
  <AbsoluteFill style={{ background: "#F4F4F6" }}>
    <Timeline lang={lang} list={scenes} into={mainInto} />
    <Bgm {...MAIN_BGM} end={MAIN_FRAMES} />
    <Sequence from={sceneStarts[2] + 30} durationInFrames={sceneStarts[7] - sceneStarts[2] - 30} name="BrandBug">
      <BrandBug frames={sceneStarts[7] - sceneStarts[2] - 30} />
    </Sequence>
  </AbsoluteFill>
);

export const Readme = ({ lang }: { lang: Lang }) => (
  <AbsoluteFill style={{ background: "#F4F4F6" }}>
    <Timeline lang={lang} list={readmeScenes} into={readmeInto} />
  </AbsoluteFill>
);
