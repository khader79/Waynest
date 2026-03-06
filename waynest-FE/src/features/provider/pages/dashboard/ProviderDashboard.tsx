import { useEffect, useState } from "react";
import { Card, Row, Col, Statistic } from "antd";
import { HomeOutlined, DollarOutlined, ClockCircleOutlined, StarOutlined } from "@ant-design/icons";
import { ADMIN_ENDPOINTS } from "../../../../api/endpoints";
import { get } from "../../../../api/apiService";
import { useAuth } from "../../../../context/AuthContext";
import { message } from "antd";

interface ProviderStats {
  places: number;
  totalRevenue: number;
  openingHours: number;
  reviews: number;
}

function ProviderDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProviderStats>({
    places: 0,
    totalRevenue: 0,
    openingHours: 0,
    reviews: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.userId) return;
      try {
        setLoading(true);
        const [places, pricings, openingHours, reviews] = await Promise.all([
          get(ADMIN_ENDPOINTS.PLACES_LIST),
          get(ADMIN_ENDPOINTS.PLACE_PRICING_LIST),
          get(ADMIN_ENDPOINTS.PLACE_OPENING_HOURS_LIST),
          get(ADMIN_ENDPOINTS.REVIEWS_LIST),
        ]);

        setStats({
          places: Array.isArray(places) ? places.length : 0,
          totalRevenue: Array.isArray(pricings)
            ? pricings.reduce((sum: number, p: any) => sum + (p.basePrice || 0), 0)
            : 0,
          openingHours: Array.isArray(openingHours) ? openingHours.length : 0,
          reviews: Array.isArray(reviews) ? reviews.length : 0,
        });
      } catch (error) {
        message.error("Failed to load statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return (
    <div style={{ padding: "24px" }}>
      <h1 style={{ marginBottom: "24px" }}>Provider Dashboard</h1>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="My Places"
              value={stats.places}
              prefix={<HomeOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={stats.totalRevenue}
              prefix={<DollarOutlined />}
              precision={2}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Opening Hours"
              value={stats.openingHours}
              prefix={<ClockCircleOutlined />}
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

export default ProviderDashboard;
