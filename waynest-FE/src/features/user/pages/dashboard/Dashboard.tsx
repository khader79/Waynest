import { useEffect, useState } from "react";
import { Card, Row, Col, Statistic } from "antd";
import { BookOutlined, HeartOutlined, StarOutlined, UserOutlined } from "@ant-design/icons";
import { adminService } from "../../../../api/adminService";
import { get } from "../../../../api/apiService";
import { USERS_ENDPOINTS } from "../../../../api/endpoints";
import { useAuth } from "../../../../context/AuthContext";
import { message } from "antd";
import "./Dashboard.css";

interface UserStats {
  bookings: number;
  wishlist: number;
  reviews: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    bookings: 0,
    wishlist: 0,
    reviews: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.userId) return;
      try {
        setLoading(true);
        // Fetch user profile to get related data
        const profile = await get(USERS_ENDPOINTS.Profile(user.userId));
        
        // Try to fetch reviews count for this user
        try {
          const reviews = await adminService.fetchList("reviews");
          const userReviews = Array.isArray(reviews) 
            ? reviews.filter((r: any) => r.user?.id === user.userId).length 
            : 0;
          setStats((prev) => ({ ...prev, reviews: userReviews }));
        } catch {
          // If reviews endpoint fails, keep default
        }

        // Placeholder for bookings and wishlist - can be updated when endpoints are available
        setStats((prev) => ({
          ...prev,
          bookings: 0, // TODO: Update when bookings endpoint is available
          wishlist: 0, // TODO: Update when wishlist endpoint is available
        }));
      } catch (error) {
        message.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

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
