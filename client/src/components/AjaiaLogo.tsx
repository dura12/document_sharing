interface AjaiaLogoProps {
  size?: number;
  showWordmark?: boolean;
  tagline?: string;
  className?: string;
}

export function AjaiaLogo({
  size = 34,
  showWordmark = false,
  tagline,
  className = "",
}: AjaiaLogoProps) {
  return (
    <div
      className={`ajaia-brand-badge ${className}`}
      style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer" }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="ajaia-logo-svg"
      >
        <defs>
          <linearGradient id="ajaiaGrad1" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="ajaiaGrad2" x1="12" y1="24" x2="36" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
          <filter id="ajaiaShadow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#1e3a8a" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Outer Hexagonal Shield / Modern Badge */}
        <rect
          x="3"
          y="3"
          width="42"
          height="42"
          rx="12"
          fill="url(#ajaiaGrad1)"
          filter="url(#ajaiaShadow)"
        />

        {/* Styled "A" monogram glyph with crossbar and fold */}
        <path
          d="M24 10L36 37H30L27.5 31H20.5L18 37H12L24 10Z"
          fill="#ffffff"
          fillRule="evenodd"
        />
        {/* Dynamic crossbar highlight forming second fold of 'A' */}
        <path
          d="M24 18.5L26.3 26H21.7L24 18.5Z"
          fill="url(#ajaiaGrad1)"
        />
        <path
          d="M17 28.5H31L29.5 32H18.5L17 28.5Z"
          fill="url(#ajaiaGrad2)"
          opacity="0.95"
        />
      </svg>

      {showWordmark && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: size * 0.58,
                fontWeight: 800,
                letterSpacing: "-0.5px",
                background: "linear-gradient(135deg, #1e293b 0%, #2563eb 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontFamily: "inherit",
              }}
            >
              Ajaia
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#2563eb",
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: 4,
                padding: "1px 5px",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              LLC
            </span>
          </div>
          {tagline && (
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>
              {tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
