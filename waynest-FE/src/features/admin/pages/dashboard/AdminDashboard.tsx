import { useEffect, useState } from "react";
import { message } from "antd";
import { useTranslation } from "react-i18next";
import { UserOutlined, ShopOutlined, HomeOutlined, StarOutlined } from "@ant-design/icons";
import { ADMIN_ENDPOINTS } from "../../../../api/endpoints";
import { get } from "../../../../api/apiService";
import "./AdminDashboard.css";

interface Stats {
  users: number;
  providers: number;
  places: number;
  reviews: number;
}

const safeCount = (data: unknown) => {
  if (Array.isArray(data)) {
    return data.length;
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    if (typeof record.total === "number") {
      return record.total;
    }

    if (Array.isArray(record.data)) {
      return record.data.length;
    }
  }

  return 0;
};

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
          users: safeCount(users),
          providers: safeCount(providers),
          places: safeCount(places),
          reviews: safeCount(reviews),
        });
      } catch (error) {
        message.error(t("admin.dashboard.failedToLoadStats"));
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      key: "users",
      label: t("admin.dashboard.totalUsers"),
      value: stats.users,
      icon: <UserOutlined />,
    },
    {
      key: "providers",
      label: t("admin.dashboard.totalProviders"),
      value: stats.providers,
      icon: <ShopOutlined />,
    },
    {
      key: "places",
      label: t("admin.dashboard.totalPlaces"),
      value: stats.places,
      icon: <HomeOutlined />,
    },
    {
      key: "reviews",
      label: t("admin.dashboard.totalReviews"),
      value: stats.reviews,
      icon: <StarOutlined />,
    },
  ];

  return (
    <div className="admin-dashboard">
      <h1 className="admin-dashboard-header">{t("admin.dashboard.title")}</h1>
      <div className="admin-dashboard-grid">
        {statCards.map((card) => (
          <article className="admin-stat-card" key={card.key}>
            <div className="admin-stat-icon" aria-hidden="true">
              {card.icon}
            </div>
            <div className="admin-stat-copy">
              <div className="admin-stat-value">{loading ? "..." : card.value}</div>
              <div className="admin-stat-label">{card.label}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;
