import { Card, Col, Row, Statistic } from "antd";
import { BookOutlined, HeartOutlined, StarOutlined, UserOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useUserDashboardStats } from "@/hooks/user/useUserDashboardStats";
import "./Dashboard.css";

const QUICK_ACTIONS = [
  { label: "Plan a Trip", to: "/plan", emoji: "✈️" },
  { label: "Social Feed", to: "/social", emoji: "👥" },
  { label: "Saved Plans", to: "/saved-plans", emoji: "🔖" },
  { label: "My Profile", to: "/profile", emoji: "👤" },
];

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { loading, stats } = useUserDashboardStats();

  return (
    <section className="dashboard">
      <h1 className="dashboard-title">
        {t("user.dashboard.title")}{user?.firstName ? `, ${user.firstName}` : ""}
      </h1>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-stat-card">
            <Statistic
              title={t("user.dashboard.myBookings")}
              value={stats.bookings}
              prefix={<BookOutlined className="stat-icon" />}
              loading={loading} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-stat-card">
            <Statistic
              title={t("user.dashboard.wishlist")}
              value={stats.wishlist}
              prefix={<HeartOutlined className="stat-icon" />}
              loading={loading} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-stat-card">
            <Statistic
              title={t("user.dashboard.myReviews")}
              value={stats.reviews}
              prefix={<StarOutlined className="stat-icon" />}
              loading={loading} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-stat-card">
            <Statistic
              title={t("user.dashboard.profileStatus")}
              value={user ? t("user.dashboard.active") : t("user.dashboard.inactive", "Inactive")}
              prefix={<UserOutlined className="stat-icon" />}
              loading={loading} />
          </Card>
        </Col>
      </Row>

      <div className="dashboard-quick-actions">
        <h2 className="dashboard-section-title">{t("user.dashboard.quickActions", "Quick Actions")}</h2>
        <div className="dashboard-actions-grid">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.to} to={action.to} className="dashboard-action-card">
              <span className="dashboard-action-emoji">{action.emoji}</span>
              <span className="dashboard-action-label">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>);

};

export default Dashboard;