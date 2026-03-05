import "./LandingPage.css";

const featureItems = [
  {
    title: "Smart Planning",
    description:
      "Build itineraries with clear steps and a calm, guided flow from day one.",
  },
  {
    title: "Discover Places",
    description:
      "Curate stays and experiences as we grow the platform together.",
  },
  {
    title: "Community Reviews",
    description:
      "Reviews open after launch. You will be among the first voices.",
  },
  {
    title: "Save & Share",
    description:
      "Keep your trips organized and share them with friends in seconds.",
  },
];

const statItems = [
  {
    value: "0",
    label: "Trips Created",
    subLabel: "Beta: No public trips yet",
  },
  {
    value: "0",
    label: "Active Travelers",
    subLabel: "Be the first to join",
  },
  {
    value: "0",
    label: "Community Reviews",
    subLabel: "Reviews open after launch",
  },
];

const LandingPage = () => {
  return (
    <div className="landing-page">
      <section className="hero">
        <div className="hero-content">
          <span className="hero-badge">Early Access</span>
          <h1>Plan Your Next Trip with Waynest</h1>
          <p>
            We’re in early access. Be the first to build itineraries as we
            launch, discover destinations, and shape the community.
          </p>
          <div className="hero-buttons">
            <button className="btn-primary">Plan My Trip</button>
            <button className="btn-secondary">Explore Places</button>
          </div>
        </div>

        <div className="hero-image">
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e"
            alt="Ocean sunrise"
          />
        </div>
      </section>

      <section className="features">
        {featureItems.map((item) => (
          <div key={item.title} className="feature-card">
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </div>
        ))}
      </section>

      <section className="stats">
        {statItems.map((item) => (
          <div key={item.label} className="stat">
            <h2>{item.value}</h2>
            <p className="stat-label">{item.label}</p>
            <span className="stat-sub">{item.subLabel}</span>
          </div>
        ))}
      </section>
    </div>
  );
};

export default LandingPage;
