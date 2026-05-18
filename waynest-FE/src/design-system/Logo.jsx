function DsLogo({ dark = false, size = "md", className = "" }) {
  const sizes = {
    sm: { wordmark: "1.1rem", icon: 24 },
    md: { wordmark: "1.4rem", icon: 32 },
    lg: { wordmark: "1.8rem", icon: 40 },
  };
  const s = sizes[size] || sizes.md;

  const wordmarkColor = dark ? "var(--ivory)" : "var(--forest)";
  const iconBg = dark ? "var(--sand)" : "var(--forest)";
  const goldPrimary = dark ? "var(--forest)" : "#B8963E";
  const goldLight = dark ? "var(--forest)" : "#E8C97A";
  const tentInner = dark ? "var(--sand)" : "#152E1F";

  return (
    <div className={`ds-logo ${className}`} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
      <div
        style={{
          width: s.icon,
          height: s.icon,
          borderRadius: "8px",
          background: iconBg,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <svg
          width={s.icon}
          height={s.icon}
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`goldGrad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: goldPrimary }} />
              <stop offset="50%" style={{ stopColor: goldLight }} />
              <stop offset="100%" style={{ stopColor: goldPrimary }} />
            </linearGradient>
          </defs>
          <line x1="62" y1="168" x2="88" y2="72" stroke={`url(#goldGrad-${size})`} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="138" y1="168" x2="112" y2="72" stroke={`url(#goldGrad-${size})`} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="100" y1="163" x2="100" y2="84" stroke={goldLight} strokeWidth="2" strokeDasharray="8 6" strokeLinecap="round" opacity="0.65" />
          <circle cx="100" cy="62" r="20" fill={`url(#goldGrad-${size})`} />
          <polygon points="100,92 87,70 113,70" fill={goldLight} />
          <circle cx="100" cy="61" r="8" fill={tentInner} />
          <rect x="58" y="165" width="84" height="5" rx="2.5" fill={goldLight} opacity="0.4" />
        </svg>
      </div>
      <span
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 700,
          fontSize: s.wordmark,
          color: wordmarkColor,
          letterSpacing: "-0.02em",
        }}
      >
        waynest
      </span>
    </div>
  );
}

export default DsLogo;
