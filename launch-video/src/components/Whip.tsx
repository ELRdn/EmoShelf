import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import { linearTiming } from "@remotion/transitions";
import { AbsoluteFill, Easing } from "remotion";

type Props = Record<string, never>;

// Whip pan: both scenes travel sideways together with a horizontal motion blur that peaks mid-move.
const WhipPresentation = ({ children, presentationProgress: p, presentationDirection }: TransitionPresentationComponentProps<Props>) => {
  const x = presentationDirection === "exiting" ? -p * 100 : (1 - p) * 100;
  const speed = Math.sin(p * Math.PI);
  const id = `whip-${presentationDirection}`;
  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${x}%) scale(${1 - 0.05 * speed})`,
        filter: speed > 0.02 ? `url(#${id})` : undefined,
      }}
    >
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={id} x="-20%" width="140%">
          <feGaussianBlur stdDeviation={`${speed * 36} 0`} />
        </filter>
      </svg>
      {children}
    </AbsoluteFill>
  );
};

export const whip = (): TransitionPresentation<Props> => ({ component: WhipPresentation, props: {} });

export const WHIP_FRAMES = 18;
export const whipTiming = linearTiming({ durationInFrames: WHIP_FRAMES, easing: Easing.inOut(Easing.cubic) });
