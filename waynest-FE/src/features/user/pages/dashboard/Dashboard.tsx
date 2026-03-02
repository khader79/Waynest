import "./Dashboard.css";

const Dashboard = () => {
  return (
    <section className="dashboard">
      <h1 className="dashboard-title">Welcome to Your Dashboard</h1>
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <div className="dashboard-card-label">Bookings</div>
          <div className="dashboard-card-value">3</div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card-label">Upcoming Trip</div>
          <div className="dashboard-card-value">Barcelona</div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card-label">Wishlist</div>
          <div className="dashboard-card-value">5</div>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
