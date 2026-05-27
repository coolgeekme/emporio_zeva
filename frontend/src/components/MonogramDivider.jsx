// Decorative divider — the Not A Salami circular seal between hairline ornaments.
// `variant="dark"` for light/parchment backgrounds, `variant="light"` for dark.

import { NOT_A_SALAMI_SEAL } from "../content";

export default function MonogramDivider({ variant = "dark", className = "", testid = "monogram-divider" }) {
  const stroke = variant === "light" ? "#F9F6F0" : "#2A1F1D";
  const gold = "#B9935A";
  const sealStyle =
    variant === "light"
      ? { filter: "invert(1)", mixBlendMode: "screen" }
      : { mixBlendMode: "multiply" };

  return (
    <div
      className={`flex items-center justify-center gap-5 md:gap-8 select-none ${className}`}
      aria-hidden="true"
      data-testid={testid}
    >
      <svg viewBox="0 0 220 16" className="flex-1 min-w-0 max-w-[80px] sm:max-w-[200px] md:max-w-[280px] h-3" preserveAspectRatio="none">
        <line x1="0" y1="8" x2="220" y2="8" stroke={stroke} strokeWidth="0.5" />
        <circle cx="200" cy="8" r="2" fill={gold} />
        <circle cx="208" cy="8" r="1" fill={stroke} />
        <circle cx="214" cy="8" r="0.6" fill={stroke} />
      </svg>

      <img
        src={NOT_A_SALAMI_SEAL}
        alt=""
        className="h-10 w-10 md:h-12 md:w-12 rounded-full flex-shrink-0"
        draggable="false"
        style={sealStyle}
      />

      <svg viewBox="0 0 220 16" className="flex-1 min-w-0 max-w-[80px] sm:max-w-[200px] md:max-w-[280px] h-3" preserveAspectRatio="none">
        <line x1="0" y1="8" x2="220" y2="8" stroke={stroke} strokeWidth="0.5" />
        <circle cx="20" cy="8" r="2" fill={gold} />
        <circle cx="12" cy="8" r="1" fill={stroke} />
        <circle cx="6" cy="8" r="0.6" fill={stroke} />
      </svg>
    </div>
  );
}
