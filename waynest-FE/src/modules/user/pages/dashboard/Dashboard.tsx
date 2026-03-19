import { Card, Col, Row, Statistic } from "antd";
import { BookOutlined, HeartOutlined, StarOutlined, UserOutlined } from "@ant-design/icons";
import { useUserDashboardStats } from "../../hooks/useUserDashboardStats";
import "./Dashboard.css";

const Dashboard = () => {
  const { loading, stats } = useUserDashboardStats();

  return (
    <section className="dashboard">
      <h1 className="dashboard-title">Dashboard</h1>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="My Bookings"
              value={stats.bookings}
              prefix={<BookOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Wishlist"
              value={stats.wishlist}
              prefix={<HeartOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="My Reviews"
              value={stats.reviews}
              prefix={<StarOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Profile Status"
              value="Active"
              prefix={<UserOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>
    </section>
  );
};

export default Dashboard;
