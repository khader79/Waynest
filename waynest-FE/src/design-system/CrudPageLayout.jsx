import DsButton from "./Button";

function CrudPageLayout({
  title,
  subtitle,
  onAdd,
  addLabel,
  children,
  search,
  filters,
}) {
  return (
    <div className="crud-page">
      <div className="crud-page-header">
        <div className="crud-page-header-left">
          <h1 className="crud-page-title">{title}</h1>
          {subtitle && <p className="crud-page-subtitle">{subtitle}</p>}
        </div>
        <div className="crud-page-header-right">
          {filters}
          {search}
          {onAdd && addLabel && (
            <DsButton variant="primary" onClick={onAdd} icon="+">
              {addLabel}
            </DsButton>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

export default CrudPageLayout;