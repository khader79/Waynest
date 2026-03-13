import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../../context/AuthContext";
import "./LandingPage.css";

const featureKeys = [
  "landing.features.smartPlanning",
  "landing.features.discoverPlaces",
  "landing.features.communityReviews",
  "landing.features.saveShare",
];

const statKeys = [
  "landing.stats.tripsCreated",
  "landing.stats.activeTravelers",
  "landing.stats.communityReviews",
];

const LandingPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handlePlanClick = () => {
    if (isAuthenticated) {
      navigate("/user-panel/trip-planner");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="landing-page">
      <section className="hero">
        <div className="hero-content">
          <span className="hero-badge">{t("landing.hero.badge")}</span>
          <h1>{t("landing.hero.title")}</h1>
          <p>{t("landing.hero.description")}</p>
          <div className="hero-buttons">
            <button className="btn-primary" onClick={handlePlanClick}>
              {t("landing.hero.btnPlan")}
            </button>
            <Link to="/explore" className="btn-secondary">
              {t("landing.hero.btnExplore")}
            </Link>
          </div>
        </div>

        <div className="hero-image">
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e"
            alt={t("landing.hero.title")}
          />
        </div>
      </section>

      <section className="features">
        {featureKeys.map((key) => (
          <div key={key} className="feature-card">
            <h3>{t(`${key}.title`)}</h3>
            <p>{t(`${key}.description`)}</p>
          </div>
        ))}
      </section>

      <section className="stats">
        {statKeys.map((key) => (
          <div key={key} className="stat">
            <h2>{t(`${key}.value`)}</h2>
            <p className="stat-label">{t(`${key}.label`)}</p>
            <span className="stat-sub">{t(`${key}.subLabel`)}</span>
          </div>
        ))}
      </section>
    </div>
  );
};

export default LandingPage;
