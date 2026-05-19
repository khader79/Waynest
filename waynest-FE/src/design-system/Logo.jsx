import IconSvg from "/images/waynest-icon.svg";

function DsLogo({ dark = false, size = "md", className = "" }) {
  const sizes = {
    sm: { wordmark: "1.1rem", icon: 24 },
    md: { wordmark: "1.4rem", icon: 32 },
    lg: { wordmark: "1.8rem", icon: 40 },
  };
  const s = sizes[size] || sizes.md;

  const wordmarkColor = dark ? "var(--ivory)" : "var(--forest)";

  return (
    <div className={`ds-logo ${className}`} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
      <img
        src={IconSvg}
        alt="Waynest"
        style={{
          width: s.icon,
          height: s.icon,
          borderRadius: "8px",
          flexShrink: 0,
        }}
      />
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
