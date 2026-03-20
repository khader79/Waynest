import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { FiMap, FiStar, FiMessageCircle, FiShare2 } from "react-icons/fi";
import "./LandingPage.css";

const featuresList = [
  {
    key: "landing.features.smartPlanning",
    icon: <FiMap size={28} color="var(--color-primary)" />,
  },
  {
    key: "landing.features.discoverPlaces",
    icon: <FiStar size={28} color="var(--color-primary)" />,
  },
  {
    key: "landing.features.communityReviews",
    icon: <FiMessageCircle size={28} color="var(--color-primary)" />,
  },
  {
    key: "landing.features.saveShare",
    icon: <FiShare2 size={28} color="var(--color-primary)" />,
  },
];

const statKeys = [
  "landing.stats.tripsCreated",
  "landing.stats.activeTravelers",
  "landing.stats.communityReviews",
];

const LandingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handlePlanClick = () => {
    navigate("/plan");
  };

  return (
    <main className="landing-page">
      <section className="hero">
        <div className="hero-content">
          <span className="hero-badge">{t("landing.hero.badge")}</span>

          <h1>
            {t("landing.hero.title").split("Waynest")[0]}
            <span className="text-highlight">Waynest</span>
          </h1>

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

        <div className="hero-image-wrapper">
          <div className="glow-effect"></div>
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=75&auto=format&fit=crop"
            alt="Beautiful Beach Trip"
            className="hero-image"
          />
        </div>
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

      <section className="features">
        {featuresList.map((feature) => (
          <article key={feature.key} className="feature-card">
            <div className="feature-icon">{feature.icon}</div>
            <h3>{t(`${feature.key}.title`)}</h3>
            <p>{t(`${feature.key}.description`)}</p>
          </article>
        ))}
      </section>
    </main>
  );
};

export default LandingPage;
