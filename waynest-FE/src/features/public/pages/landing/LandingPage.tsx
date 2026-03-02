import "./LandingPage.css";

const LandingPage = () => {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Plan Your Next Trip Easily</h1>
          <p>
            Discover destinations, build your itinerary, and explore the best
            places around the world.
          </p>
          <div className="hero-buttons">
            <button className="btn-primary">Plan My Trip</button>
            <button className="btn-secondary">Explore Places</button>
          </div>
        </div>

        <div className="hero-image">
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e"
            alt="Travel"
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="feature-card">
          <h3>Smart Planning</h3>
          <p>
            Create your travel plan in minutes with an easy step-by-step flow.
          </p>
        </div>

        <div className="feature-card">
          <h3>Discover Places</h3>
          <p>Find the best restaurants, attractions, and hidden gems.</p>
        </div>

        <div className="feature-card">
          <h3>Community Reviews</h3>
          <p>See real feedback and ratings from other travelers.</p>
        </div>

        <div className="feature-card">
          <h3>Save & Share</h3>
          <p>Keep your trips organized and share them with friends.</p>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="stats">
        <div className="stat">
          <h2>50K+</h2>
          <p>Trips Created</p>
        </div>

        <div className="stat">
          <h2>120+</h2>
          <p>Cities</p>
        </div>

        <div className="stat">
          <h2>10K+</h2>
          <p>Happy Travelers</p>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
