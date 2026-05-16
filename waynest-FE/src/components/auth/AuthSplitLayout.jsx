import "./AuthSplitLayout.css";

const AuthSplitLayout = ({ children, title, subtitle, brand = "Spacer" }) => {
  return(
    <div className="auth-shell">
      <div className="auth-shell__panel">{children}</div>

      <aside className="auth-shell__hero">
        <div className="auth-shell__hero-content">
          <div className="auth-shell__brand">
            <div className="auth-shell__brand-mark">
              {brand.slice(0, 1).toUpperCase()}
            </div>

            <div className="auth-shell__brand-name">{brand}</div>
          </div>

          <div className="auth-shell__copy">
            <h1 className="auth-shell__title">{title}</h1>

            <p className="auth-shell__subtitle">{subtitle}</p>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default AuthSplitLayout;
