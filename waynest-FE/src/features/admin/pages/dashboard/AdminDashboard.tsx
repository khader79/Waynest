import { useEffect, useState } from "react";
import { Card, Row, Col, Statistic } from "antd";
import { UserOutlined, ShopOutlined, HomeOutlined, StarOutlined } from "@ant-design/icons";
import { adminService } from "../../../../api/adminService";
import { message } from "antd";

interface Stats {
  users: number;
  providers: number;
  places: number;
  reviews: number;
}

function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    users: 0,
    providers: 0,
    places: 0,
    reviews: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [users, providers, places, reviews] = await Promise.all([
          adminService.fetchList("users"),
          adminService.fetchList("providers"),
          adminService.fetchList("places"),
          adminService.fetchList("reviews"),
        ]);

        setStats({
          users: Array.isArray(users) ? users.length : 0,
          providers: Array.isArray(providers) ? providers.length : 0,
          places: Array.isArray(places) ? places.length : 0,
          reviews: Array.isArray(reviews) ? reviews.length : 0,
        });
      } catch (error) {
        message.error("Failed to load statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div style={{ padding: "24px" }}>
      <h1 style={{ marginBottom: "24px" }}>Admin Dashboard</h1>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={stats.users}
              prefix={<UserOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Providers"
              value={stats.providers}
              prefix={<ShopOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Places"
              value={stats.places}
              prefix={<HomeOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Reviews"
              value={stats.reviews}
              prefix={<StarOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default AdminDashboard;
