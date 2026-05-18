const contexts = {
  nature: "ds-tag ds-tag-nature",
  culture: "ds-tag ds-tag-culture",
  ocean: "ds-tag ds-tag-ocean",
  neutral: "ds-tag ds-tag-neutral",
};

function DsTag({ children, context = "neutral", className = "", ...rest }) {
  const cls = [contexts[context] || contexts.neutral, className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}

export default DsTag;
