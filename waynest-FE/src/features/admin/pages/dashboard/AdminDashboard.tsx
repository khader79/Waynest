import { useEffect, useState } from "react";
import { Card, Row, Col, Statistic } from "antd";
import { useTranslation } from "react-i18next";
import { UserOutlined, ShopOutlined, HomeOutlined, StarOutlined } from "@ant-design/icons";
import { ADMIN_ENDPOINTS } from "../../../../api/endpoints";
import { get } from "../../../../api/apiService";
import { message } from "antd";
import "./AdminDashboard.css";

interface Stats {
  users: number;
  providers: number;
  places: number;
  reviews: number;
}

function AdminDashboard() {
  const { t } = useTranslation();
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
          get(ADMIN_ENDPOINTS.USERS_LIST),
          get(ADMIN_ENDPOINTS.PROVIDERS_LIST),
          get(ADMIN_ENDPOINTS.PLACES_LIST),
          get(ADMIN_ENDPOINTS.REVIEWS_LIST),
        ]);

        setStats({
          users: Array.isArray(users) ? users.length : 0,
          providers: Array.isArray(providers) ? providers.length : 0,
          places: Array.isArray(places) ? places.length : 0,
          reviews: Array.isArray(reviews) ? reviews.length : 0,
        });
      } catch (error) {
        message.error(t("admin.dashboard.failedToLoadStats"));
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="admin-dashboard">
      <h1 className="admin-dashboard-header">{t("admin.dashboard.title")}</h1>
      <Row gutter={[16, 16]} className="admin-dashboard-grid">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("admin.dashboard.totalUsers")}
              value={stats.users}
              prefix={<UserOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("admin.dashboard.totalProviders")}
              value={stats.providers}
              prefix={<ShopOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("admin.dashboard.totalPlaces")}
              value={stats.places}
              prefix={<HomeOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("admin.dashboard.totalReviews")}
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
