const colorMap = {
  green: "ds-badge-green",
  red: "ds-badge-red",
  orange: "ds-badge-orange",
  blue: "ds-badge-blue",
  purple: "ds-badge-purple",
  gray: "ds-badge-gray",
};

function DsBadge({ children, color = "gray", className = "", dot }) {
  const cls = ["ds-badge", colorMap[color] || colorMap.gray, className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={cls}>
      {dot && <span className="ds-badge-dot" />}
      {children}
    </span>
  );
}

export default DsBadge;