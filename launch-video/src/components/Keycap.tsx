import { mono } from "../fonts";

type Tone = "grey" | "purple";

const faces: Record<Tone, { face: string; edge: string; text: string; glow: string }> = {
  grey: {
    face: "linear-gradient(180deg, #FFFFFF 0%, #EDEDF1 100%)",
    edge: "#B9B8C2",
    text: "#4A4953",
    glow: "0 18px 40px rgb(24 24 27 / 16%)",
  },
  purple: {
    face: "linear-gradient(180deg, #A396FF 0%, #7467E8 100%)",
    edge: "#4B3FB8",
    text: "#FFFFFF",
    glow: "0 24px 70px rgb(116 103 232 / 55%), 0 0 0 1px rgb(255 255 255 / 25%) inset",
  },
};

export const Keycap = ({
  label,
  size = 180,
  tone = "grey",
  pressed = 0,
  wide = 1,
}: {
  label: string;
  size?: number;
  tone?: Tone;
  pressed?: number;
  wide?: number;
}) => {
  const f = faces[tone];
  const depth = size * 0.07;
  const sink = depth * pressed;
  return (
    <div
      style={{
        width: size * wide,
        height: size,
        borderRadius: size * 0.2,
        background: f.edge,
        paddingBottom: depth - sink,
        transform: `translateY(${sink}px)`,
        boxShadow: f.glow,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: size * 0.2,
          background: f.face,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: mono,
          fontWeight: 600,
          fontSize: size * (label.length > 2 ? 0.3 : 0.42),
          color: f.text,
          boxShadow: "0 2px 0 rgb(255 255 255 / 70%) inset",
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const KeyCombo = ({
  keys,
  size,
  tone,
  pressed,
}: {
  keys: { label: string; wide?: number }[];
  size: number;
  tone: Tone;
  pressed?: number;
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.18 }}>
    {keys.map((k, i) => (
      <div key={k.label} style={{ display: "flex", alignItems: "center", gap: size * 0.18 }}>
        {i > 0 && (
          <span
            style={{
              fontFamily: mono,
              fontSize: size * 0.34,
              color: tone === "purple" ? "#7467E8" : "#8A8994",
              fontWeight: 600,
            }}
          >
            +
          </span>
        )}
        <Keycap label={k.label} size={size} tone={tone} pressed={pressed} wide={k.wide} />
      </div>
    ))}
  </div>
);
