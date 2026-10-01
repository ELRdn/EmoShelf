export const Cursor = ({
  x,
  y,
  scale = 1.6,
  click = 0,
}: {
  x: number;
  y: number;
  scale?: number;
  click?: number;
}) => (
  <div style={{ position: "absolute", left: x, top: y, pointerEvents: "none" }}>
    {click > 0 && (
      <div
        style={{
          position: "absolute",
          left: -34 * click,
          top: -34 * click,
          width: 68 * click,
          height: 68 * click,
          borderRadius: "50%",
          border: "3px solid rgb(139 124 255 / 70%)",
          opacity: 1 - click * 0.6,
        }}
      />
    )}
    <svg
      width={24 * scale}
      height={34 * scale}
      viewBox="0 0 24 34"
      style={{ filter: "drop-shadow(0 4px 6px rgb(0 0 0 / 30%))", display: "block" }}
    >
      <path
        d="M2 2 L2 27 L8.5 21 L13 31.5 L17.5 29.5 L13 19.5 L22 19.5 Z"
        fill="#fff"
        stroke="#18181B"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);
