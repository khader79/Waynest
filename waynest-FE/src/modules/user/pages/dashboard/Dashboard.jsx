import { Card, Col, Row, Statistic } from "antd";
import { BookOutlined, HeartOutlined, StarOutlined, UserOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useUserDashboardStats } from "../../hooks/useUserDashboardStats";
import "./Dashboard.css";

const Dashboard = () => {
  const { t } = useTranslation();
  const { loading, stats } = useUserDashboardStats();

  return (
    <section className="dashboard">
      <h1 className="dashboard-title">{t("user.dashboard.title")}</h1>
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
              value={t("user.dashboard.active")}
              prefix={<UserOutlined className="stat-icon" />}
              loading={loading} />
            
          </Card>
        </Col>
      </Row>
    </section>);

};

export default Dashboard;