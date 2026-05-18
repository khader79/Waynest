const variants = {
  primary: "ds-btn ds-btn-primary",
  secondary: "ds-btn ds-btn-secondary",
  gold: "ds-btn ds-btn-gold",
  outline: "ds-btn ds-btn-outline",
  ghost: "ds-btn ds-btn-ghost",
  danger: "ds-btn ds-btn-danger",
};

const sizes = {
  sm: "ds-btn-sm",
  md: "ds-btn-md",
  lg: "ds-btn-lg",
};

function DsButton({
  children,
  variant = "primary",
  size = "md",
  icon,
  loading,
  disabled,
  onClick,
  type = "button",
  className = "",
  ...rest
}) {
  const cls = [
    variants[variant] || variants.primary,
    sizes[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading ? (
        <span className="ds-btn-spinner" aria-hidden />
      ) : icon ? (
        <span className="ds-btn-icon">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
    </button>
  );
}

export default DsButton;
