import "./AuthSplitLayout.css";

const AuthSplitLayout = ({ children, title, subtitle, brand = "Waynest" }) => {
  return(
    <div className="auth-shell">
      <div className="auth-shell__panel">{children}</div>

      <aside className="auth-shell__hero">
        <div className="auth-shell__hero-content">
          <div className="auth-shell__brand">
            <div className="auth-shell__brand-mark">
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                <defs>
                  <linearGradient id="authGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: "#B8963E" }} />
                    <stop offset="50%" style={{ stopColor: "#E8C97A" }} />
                    <stop offset="100%" style={{ stopColor: "#B8963E" }} />
                  </linearGradient>
                </defs>
                <line x1="62" y1="168" x2="88" y2="72" stroke="url(#authGoldGrad)" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="138" y1="168" x2="112" y2="72" stroke="url(#authGoldGrad)" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="100" y1="163" x2="100" y2="84" stroke="#E8C97A" strokeWidth="2" strokeDasharray="8 6" strokeLinecap="round" opacity="0.65" />
                <circle cx="100" cy="62" r="20" fill="url(#authGoldGrad)" />
                <polygon points="100,92 87,70 113,70" fill="#E8C97A" />
                <circle cx="100" cy="61" r="8" fill="#152E1F" />
                <rect x="58" y="165" width="84" height="5" rx="2.5" fill="#E8C97A" opacity="0.4" />
              </svg>
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
