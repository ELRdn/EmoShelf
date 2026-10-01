import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Fragment } from "react";
import { AbsoluteFill } from "remotion";
import type { Lang } from "./copy";
import { scenes, TRANSITION_S6_S7 } from "./scenes/Scenes";

export const MAIN_FRAMES = scenes.reduce((n, s) => n + s.frames, 0) - TRANSITION_S6_S7;

// Scene start frames on the main timeline (the S6→S7 crossfade overlaps by TRANSITION_S6_S7).
export const sceneStarts = scenes.reduce<number[]>((acc, s, i) => {
  const prev = i === 0 ? 0 : acc[i - 1] + scenes[i - 1].frames;
  acc.push(i === 6 ? prev - TRANSITION_S6_S7 : prev);
  return acc;
}, []);

export const Main = ({ lang }: { lang: Lang }) => (
  <AbsoluteFill style={{ background: "#F4F4F6" }}>
    <TransitionSeries>
      {scenes.map(({ id, C, frames }, i) => (
        <Fragment key={id}>
          {i === 6 && (
            <TransitionSeries.Transition
              presentation={fade()}
              timing={linearTiming({ durationInFrames: TRANSITION_S6_S7 })}
            />
          )}
          <TransitionSeries.Sequence durationInFrames={frames} name={id} premountFor={30}>
            <C lang={lang} />
          </TransitionSeries.Sequence>
        </Fragment>
      ))}
    </TransitionSeries>
  </AbsoluteFill>
);
