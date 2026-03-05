import "./Dashboard.css";

type DashboardCardProps = {
  label: string;
  value?: string | number;
};

const DashboardCard = ({ label, value }: DashboardCardProps) => (
  <div className="dashboard-card">
    <div className="dashboard-card-label">{label}</div>
    <div className="dashboard-card-value">{value ?? "--"}</div>
  </div>
);

const Dashboard = () => {
  const cards = [
    { label: "Total Users" },
    { label: "Active Providers" },
    { label: "Total Bookings" },
    { label: "Pending Approvals" },
  ];

  return (
    <section className="dashboard">
      <h1 className="dashboard-title">Dashboard</h1>
      <div className="dashboard-cards">
        {cards.map((card) => (
          <DashboardCard key={card.label} label={card.label} />
        ))}
      </div>
    </section>
  );
};

export default Dashboard;
