function DsCard({
  children,
  className = "",
  padding = true,
  hover = false,
  glow = false,
  as: Tag = "div",
  ...rest
}) {
  const cls = [
    "ds-card",
    padding ? "ds-card-padded" : "",
    hover ? "ds-card-hover" : "",
    glow ? "ds-card-glow" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
}

export default DsCard;