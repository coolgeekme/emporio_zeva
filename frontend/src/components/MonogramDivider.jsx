// Decorative monogram divider inspired by the NS Sicilian Tile Coaster artwork.
// Pure SVG — scales perfectly, can be rendered light-on-dark or dark-on-light
// by passing `variant="light"` or `variant="dark"`.

export default function MonogramDivider({ variant = "dark", className = "", testid = "monogram-divider" }) {
  const stroke = variant === "light" ? "#F9F6F0" : "#2A1F1D";
  const accent = "#C05A3A";
  const gold = "#B9935A";

  return (
    <div
      className={`flex items-center justify-center gap-5 md:gap-8 select-none ${className}`}
      aria-hidden="true"
      data-testid={testid}
    >
      <svg viewBox="0 0 220 16" className="flex-1 max-w-[280px] h-3" preserveAspectRatio="none">
        <line x1="0" y1="8" x2="220" y2="8" stroke={stroke} strokeWidth="0.5" />
        <circle cx="200" cy="8" r="2" fill={gold} />
        <circle cx="208" cy="8" r="1" fill={stroke} />
        <circle cx="214" cy="8" r="0.6" fill={stroke} />
      </svg>

      <svg viewBox="0 0 72 72" className="h-12 md:h-14 w-auto flex-shrink-0">
        {/* Outer ring */}
        <circle cx="36" cy="36" r="34" fill="none" stroke={stroke} strokeWidth="0.7" />
        <circle cx="36" cy="36" r="29" fill="none" stroke={stroke} strokeWidth="0.4" />

        {/* Ornamental dots around the ring */}
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i * Math.PI * 2) / 16;
          const r = 31.5;
          const x = 36 + Math.cos(angle) * r;
          const y = 36 + Math.sin(angle) * r;
          return <circle key={i} cx={x} cy={y} r="0.55" fill={i % 4 === 0 ? accent : gold} />;
        })}

        {/* Top flourish */}
        <path d="M 28 18 Q 36 14 44 18" fill="none" stroke={stroke} strokeWidth="0.6" />
        <circle cx="36" cy="15.5" r="0.9" fill={accent} />

        {/* Bottom flourish */}
        <path d="M 28 54 Q 36 58 44 54" fill="none" stroke={stroke} strokeWidth="0.6" />
        <circle cx="36" cy="56.5" r="0.9" fill={accent} />

        {/* Central monogram N S */}
        <text
          x="36"
          y="42"
          textAnchor="middle"
          fontFamily="'Bodoni Moda', serif"
          fontSize="18"
          fontStyle="italic"
          fill={stroke}
          letterSpacing="0.5"
        >
          NS
        </text>

        {/* Side leaf marks */}
        <path d="M 8 36 q 4 -3 8 0 q -4 3 -8 0" fill={gold} opacity="0.85" />
        <path d="M 64 36 q -4 -3 -8 0 q 4 3 8 0" fill={gold} opacity="0.85" />
      </svg>

      <svg viewBox="0 0 220 16" className="flex-1 max-w-[280px] h-3" preserveAspectRatio="none">
        <line x1="0" y1="8" x2="220" y2="8" stroke={stroke} strokeWidth="0.5" />
        <circle cx="20" cy="8" r="2" fill={gold} />
        <circle cx="12" cy="8" r="1" fill={stroke} />
        <circle cx="6" cy="8" r="0.6" fill={stroke} />
      </svg>
    </div>
  );
}
