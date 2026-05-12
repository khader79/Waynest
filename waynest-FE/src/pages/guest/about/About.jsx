import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchLandingStats } from "../../../api/catalog";
import "./About.css";

const STAT_ITEMS = [
  { key: "usersCount", label: "Explorers" },
  { key: "publicPlansCount", label: "Public Trips" },
  { key: "placesCount", label: "Places" },
  { key: "countriesCount", label: "Destinations" },
];

const formatStatValue = (value) => {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
};

const FEATURES = [
  {
    icon: "🤖",
    title: "about.whatWeOffer.discoverPlaces.title",
    desc: "about.whatWeOffer.discoverPlaces.description",
  },
  {
    icon: "⭐",
    title: "about.whatWeOffer.expertReviews.title",
    desc: "about.whatWeOffer.expertReviews.description",
  },
  {
    icon: "✈️",
    title: "about.whatWeOffer.planYourTrip.title",
    desc: "about.whatWeOffer.planYourTrip.description",
  },
  {
    icon: "👥",
    title: "about.whatWeOffer.communityDriven.title",
    desc: "about.whatWeOffer.communityDriven.description",
  },
];

const BENEFITS = [
  { key: "comprehensiveDatabase", icon: "🗂️" },
  { key: "realExperiences", icon: "🌟" },
  { key: "easyPlanning", icon: "📅" },
  { key: "alwaysUpdated", icon: "🔄" },
];

const About = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadStats = async () => {
      try {
        const data = await fetchLandingStats();
        if (active) {
          setStats(data);
        }
      } catch {
        if (active) {
          setStats(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadStats();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="about-page">
      <section className="about-hero">
        <span className="about-hero-badge">🌍 Our Story</span>
        <h1>{t("about.hero.title")}</h1>
        <p className="hero-subtitle">{t("about.hero.subtitle")}</p>

        <div className="about-stats-row">
          {STAT_ITEMS.map((stat) => (
            <div key={stat.label} className={`about-stat${loading ? ' is-loading' : ''}`}>
              <strong>{loading ? '—' : formatStatValue(stats?.[stat.key])}</strong>
              <span>{loading ? '—' : stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="about-content">
        <div className="content-section">
          <div className="content-section-icon">🎯</div>
          <h2>{t("about.mission.title")}</h2>
          <p>{t("about.mission.description")}</p>
        </div>

        <div className="content-section">
          <div className="content-section-icon">✨</div>
          <h2>{t("about.whatWeOffer.title")}</h2>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="feature-item">
                <span className="feature-item-icon">{f.icon}</span>
                <h3>{t(f.title)}</h3>
                <p>{t(f.desc)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="content-section">
          <div className="content-section-icon">💡</div>
          <h2>{t("about.whyChoose.title")}</h2>
          <ul className="benefits-list">
            {BENEFITS.map((b) => (
              <li key={b.key}>
                <span className="benefit-icon">{b.icon}</span>
                <span>
                  <strong>{t(`about.whyChoose.${b.key}`)}</strong>{" "}
                  {t(`about.whyChoose.${b.key}Desc`)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="content-section">
          <div className="content-section-icon">📖</div>
          <h2>{t("about.ourStory.title")}</h2>
          <p>{t("about.ourStory.paragraph1")}</p>
          <p>{t("about.ourStory.paragraph2")}</p>
        </div>

        <div className="content-section about-cta-section">
          <div className="content-section-icon">🚀</div>
          <h2>{t("about.joinCommunity.title")}</h2>
          <p>{t("about.joinCommunity.description")}</p>
          <div className="cta-buttons">
            <Link to="/register" className="btn-primary">
              {t("about.joinCommunity.getStarted")}
            </Link>
            <Link to="/plan" className="btn-secondary">
              {t("about.joinCommunity.exploreDestinations")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
