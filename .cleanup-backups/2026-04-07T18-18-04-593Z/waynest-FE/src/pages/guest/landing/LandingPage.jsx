import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LandingPage.css";

const FEATURES = [
  {
    icon: "🤖",
    title: "AI Trip Planner",
    desc: "Generate personalized day-by-day itineraries in seconds. Just tell us your destination and travel dates.",
  },
  {
    icon: "🌍",
    title: "Discover Places",
    desc: "Explore curated destinations, hidden gems, restaurants, and experiences handpicked by locals.",
  },
  {
    icon: "👥",
    title: "Social Travel",
    desc: "Share your trips, follow other explorers, and get inspired by real stories from the community.",
  },
];

const DESTINATIONS = [
  { city: "Bethlehem", category: "Heritage", color: "var(--color-warning)", query: "Bethlehem" },
  { city: "Jerusalem", category: "Culture", color: "var(--color-secondary)", query: "Jerusalem" },
  { city: "Ramallah", category: "Urban", color: "var(--color-primary)", query: "Ramallah" },
  { city: "Jericho", category: "Nature", color: "var(--color-success)", query: "Jericho" },
];

const STATS = [
  { value: "1,240+", label: "Public Trips" },
  { value: "850+", label: "Places" },
  { value: "12K+", label: "Explorers" },
  { value: "40+", label: "Destinations" },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/plan?destination=${encodeURIComponent(q)}`);
    } else {
      navigate("/plan");
    }
  };

  return (
    <div className="lp-root">

      {/* ── Hero ── */}
      <section className="lp-hero">
        {/* Background layers */}
        <div className="lp-hero-grid" />
        <div className="lp-hero-glow lp-glow-1" />
        <div className="lp-hero-glow lp-glow-2" />
        <div className="lp-hero-glow lp-glow-3" />

        {/* Floating ambient cards */}
        <div className="lp-float lp-float--tl">
          <span className="lp-float-icon">🤖</span>
          <div>
            <strong>AI Itinerary Ready</strong>
            <span>Day 1 → Jerusalem</span>
          </div>
        </div>

        <div className="lp-float lp-float--tr">
          <span className="lp-float-icon">👥</span>
          <div>
            <strong>12,400 Explorers</strong>
            <span>joined this week</span>
          </div>
        </div>

        <div className="lp-float lp-float--bl">
          <span className="lp-float-dot" />
          <div>
            <strong>1,240 trips</strong>
            <span>published publicly</span>
          </div>
        </div>

        <div className="lp-float lp-float--br">
          <span className="lp-float-icon">📍</span>
          <div>
            <strong>850+ Places</strong>
            <span>curated by locals</span>
          </div>
        </div>

        {/* Main content */}
        <div className="lp-hero-content">
          <span className="lp-badge">
            <span className="lp-badge-pulse" />
            ✨ AI-Powered Travel Planning
          </span>

          <h1 className="lp-hero-title">
            Explore the World,
            <br />
            <span className="lp-gradient-text">Your Way</span>
          </h1>

          <p className="lp-hero-sub">
            Plan AI-powered itineraries, discover hidden gems, and connect with a
            community of passionate travelers — all in one place.
          </p>

          {/* Destination chips */}
          <div className="lp-chips">
            {[
              { label: "🏛️ Jerusalem", q: "Jerusalem" },
              { label: "🌿 Jericho", q: "Jericho" },
              { label: "⛪ Bethlehem", q: "Bethlehem" },
              { label: "🏙️ Ramallah", q: "Ramallah" },
              { label: "🌊 Aqaba", q: "Aqaba" },
            ].map((c) => (
              <button
                key={c.label}
                type="button"
                className="lp-chip"
                onClick={() => navigate(`/plan?destination=${encodeURIComponent(c.q)}`)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <form className="lp-search-row" onSubmit={handleSearch}>
            <div className="lp-search-box">
              <span className="lp-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Where do you want to go?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="lp-btn-primary">
                Generate Plan
              </button>
            </div>
            <p className="lp-search-hint">No sign-up needed · Try it free as a guest</p>
          </form>

          <div className="lp-hero-links">
            <Link to="/register" className="lp-btn-solid">
              🚀 Get Started Free
            </Link>
            <Link to="/explore" className="lp-btn-ghost">
              Browse Destinations →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="lp-stats-bar">
        {STATS.map((s) => (
          <div key={s.label} className="lp-stat">
            <span className="lp-stat-value">{s.value}</span>
            <span className="lp-stat-label">{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── Features ── */}
      <section className="lp-section">
        <div className="lp-section-head">
          <h2>Everything you need to travel smarter</h2>
          <p>
            Waynest combines AI, social discovery, and curated content in one
            seamless experience.
          </p>
        </div>
        <div className="lp-features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="lp-feature-card">
              <span className="lp-feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Destinations ── */}
      <section className="lp-section">
        <div className="lp-section-head lp-section-head--row">
          <h2>Featured Destinations</h2>
          <Link to="/explore" className="lp-link-accent">View all →</Link>
        </div>
        <div className="lp-dest-grid">
          {DESTINATIONS.map((d) => (
            <Link to={`/explore?q=${encodeURIComponent(d.query)}`} key={d.city} className="lp-dest-card">
              <div
                className="lp-dest-img"
                style={{
                  background: `linear-gradient(135deg, ${d.color}33 0%, ${d.color}88 100%)`,
                  borderBottom: `3px solid ${d.color}`,
                }}
              >
                <span className="lp-dest-emoji">📍</span>
              </div>
              <div className="lp-dest-body">
                <span className="lp-dest-tag">{d.category}</span>
                <strong className="lp-dest-name">{d.city}</strong>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="lp-section lp-how">
        <div className="lp-section-head">
          <h2>Plan your trip in 3 simple steps</h2>
        </div>
        <div className="lp-steps">
          <div className="lp-step">
            <div className="lp-step-num">1</div>
            <h4>Tell us your destination</h4>
            <p>Enter where you want to go and how many days you have.</p>
          </div>
          <div className="lp-step-arrow">→</div>
          <div className="lp-step">
            <div className="lp-step-num">2</div>
            <h4>AI builds your itinerary</h4>
            <p>Our AI crafts a detailed day-by-day plan tailored to you.</p>
          </div>
          <div className="lp-step-arrow">→</div>
          <div className="lp-step">
            <div className="lp-step-num">3</div>
            <h4>Save, share & explore</h4>
            <p>Save your plan, share it with friends, or publish it to the community.</p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta">
        <div className="lp-cta-glow" />
        <div className="lp-cta-content">
          <h2>Ready to plan your next adventure?</h2>
          <p>Join thousands of travelers already using Waynest.</p>
          <div className="lp-cta-actions">
            <Link to="/register" className="lp-btn-solid lp-btn-lg">
              Get Started Free
            </Link>
            <Link to="/trip-planner" className="lp-btn-ghost lp-btn-lg">
              Try as Guest
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;
