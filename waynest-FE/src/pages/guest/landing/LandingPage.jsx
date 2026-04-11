import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";
import { fetchLandingStats } from "@/api/catalog";
import {
  FiArrowRight,
  FiCheckCircle,
  FiCompass,
  FiLogIn,
  FiMapPin,
  FiStar,
  FiUsers,
} from "react-icons/fi";

const FEATURES = [
  {
    icon: FiStar,
    title: "AI Trip Planner",
    desc: "Generate personalized day-by-day itineraries in seconds.",
  },
  {
    icon: FiMapPin,
    title: "Discover Places",
    desc: "Explore curated destinations and hidden gems.",
  },
  {
    icon: FiUsers,
    title: "Social Travel",
    desc: "Share trips and get inspired by others.",
  },
];

export default function LandingPage() {
  const [landingStats, setLandingStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const statsPayload = await fetchLandingStats();
        if (!active) return;
        setLandingStats(statsPayload);
      } catch (err) {
        // keep the page functional if stats are temporarily unavailable
        // eslint-disable-next-line no-console
        console.error("Landing stats load failed", err);
        if (active) setLandingStats(null);
      } finally {
        if (active) setStatsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="lp-root">
      <section className="lp-hero">
        <div className="lp-hero-content">
          <span className="lp-badge">
            <span className="lp-badge-pulse" />
            <FiStar aria-hidden="true" />
            AI-powered travel platform
          </span>

          <h1 className="lp-hero-title">
            Explore the World
            <br />
            <span className="lp-gradient-text">Your Way</span>
          </h1>

          <p className="lp-hero-sub">
            Plan AI-powered itineraries and discover new places.
          </p>

          <div className="lp-hero-actions">
            <Link to="/plan" className="lp-btn-primary lp-plan-link">
              <FiCompass aria-hidden="true" />
              <span>Generate Plan</span>
              <FiArrowRight aria-hidden="true" />
            </Link>

            <div className="lp-hero-links">
              <Link to="/register" className="lp-btn-solid">
                <FiCheckCircle aria-hidden="true" />
                <span>Get Started</span>
              </Link>
              <Link to="/login" className="lp-btn-ghost">
                <FiLogIn aria-hidden="true" />
                <span>Login</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-stats-bar">
        <Stat
          icon={FiUsers}
          value={statsLoading || !landingStats ? "—" : landingStats.usersCount}
          label="Users"
        />
        <Stat
          icon={FiMapPin}
          value={statsLoading || !landingStats ? "—" : landingStats.placesCount}
          label="Places"
        />
        <Stat
          icon={FiCompass}
          value={
            statsLoading || !landingStats ? "—" : landingStats.publicPlansCount
          }
          label="Public Plans"
        />
      </section>

      <section className="lp-section">
        <div className="lp-features-grid">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="lp-feature-card">
              <span className="lp-feature-icon">
                <feature.icon aria-hidden="true" />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-cta">
        <h2>Ready to travel?</h2>
        <div className="lp-cta-actions">
          <Link to="/register" className="lp-btn-solid">
            <FiCheckCircle aria-hidden="true" />
            <span>Get Started</span>
          </Link>
          <Link to="/plan" className="lp-btn-ghost">
            <FiCompass aria-hidden="true" />
            <span>Try Now</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label, icon: Icon }) {
  return (
    <div className="lp-stat">
      <span className="lp-stat-icon">
        <Icon aria-hidden="true" />
      </span>
      <span className="lp-stat-value">{value}</span>
      <span className="lp-stat-label">{label}</span>
    </div>
  );
}
