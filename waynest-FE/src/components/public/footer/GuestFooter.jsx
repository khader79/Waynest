import { Link } from "react-router-dom";
import "./GuestFooter.css";

const LINKS = {
  Discover: [
    { label: "Explore Places", to: "/explore" },
    { label: "AI Trip Planner", to: "/plan" },
    { label: "Destinations", to: "/destinations" },
    { label: "Public Trips", to: "/trips" },
  ],
  Company: [
    { label: "About Us", to: "/about" },
    { label: "Contact", to: "/contact" },
  ],
  Account: [
    { label: "Sign Up Free", to: "/register" },
    { label: "Log In", to: "/login" },
    { label: "Social Feed", to: "/social" },
  ],
};

const GuestFooter = () => (
  <footer className="gf-root">
    <div className="gf-inner">
      <div className="gf-brand">
        <Link to="/" className="gf-logo">
          <img
            src="/images/waynest icon.svg"
            alt="Waynest"
            className="gf-logo-img"
          />
          <span>Waynest</span>
        </Link>
        <p className="gf-tagline">
          AI-powered travel planning, curated destinations, and a community of
          passionate explorers — all in one place.
        </p>
      </div>

      {Object.entries(LINKS).map(([group, items]) => (
        <div key={group} className="gf-col">
          <h4 className="gf-col-title">{group}</h4>
          <ul className="gf-col-list">
            {items.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="gf-link">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    <div className="gf-bottom">
      <span>© {new Date().getFullYear()} Waynest. All rights reserved.</span>
      <span className="gf-bottom-sep">·</span>
      <span>Built for explorers.</span>
    </div>
  </footer>
);

export default GuestFooter;
