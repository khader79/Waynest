import { Link } from "react-router-dom";
import "./LandingPage.css";

const LandingPage = () => {
  return (
    <div className="landing-layout">
      <main className="main-content">
        <section className="hero-section">
          <h1>Plan Your Next Trip with Waynest</h1>
          <p>
            The smartest way to explore the world. Create AI itineraries,
            discover hidden gems, and connect with fellow travelers in one
            simple interface.
          </p>

          <div className="planner-guest-box">
            <input type="text" placeholder="Where do you want to go?" />
            <button className="btn-primary">Generate Plan</button>
          </div>
          <p style={{ fontSize: "0.85rem", marginTop: "12px" }}>
            Try it now as a guest. No registration required to start your first
            plan.
          </p>
        </section>

        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}>
            <h2>Featured Places</h2>
            <Link
              to="/explore"
              style={{ color: "var(--primary)", fontWeight: "600" }}>
              View all
            </Link>
          </div>

          <div className="places-grid">
            <div className="place-card">
              <div style={{ height: "180px", background: "#cbd5e1" }}></div>
              <div className="place-card-content">
                <span>Bethlehem • Shop</span>
                <strong>Old City Souk</strong>
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.9rem",
                    marginTop: "10px",
                  }}>
                  Experience the local character and easy access to the old
                  city.
                </p>
              </div>
            </div>

            <div className="place-card">
              <div style={{ height: "180px", background: "#cbd5e1" }}></div>
              <div className="place-card-content">
                <span>Bethlehem • Park</span>
                <strong>Solomon's Pools</strong>
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.9rem",
                    marginTop: "10px",
                  }}>
                  A historic site offering peaceful walks and local heritage.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <aside className="right-sidebar">
        <div className="info-panel">
          <h3>Project Goal</h3>
          <p>
            Waynest aims to simplify travel by combining AI technology with
            social networking. We help you find the best routes while building a
            community of explorers.
          </p>
        </div>

        <div className="pro-tip">
          <h4>💡 Guest Mode</h4>
          <p style={{ fontSize: "0.9rem", opacity: "0.9" }}>
            You are currently using Waynest as a guest. You can create plans,
            but to save them forever and chat with others, you'll need to create
            an account.
          </p>
        </div>

        <div className="info-panel">
          <h3>Platform Stats</h3>
          <div style={{ marginTop: "15px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}>
              <span>Public Trips</span>
              <strong>1,240</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Places</span>
              <strong>850</strong>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default LandingPage;
