import {
  HomeOutlined,
  ShopOutlined,
  StarOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAdminDashboardStats } from "@/hooks/admin/useAdminDashboardStats";
import "./AdminDashboard.css";

const ADMIN_ACTIONS = [
  { label: "Manage Users", to: "/admin/users", emoji: "👥" },
  { label: "Manage Places", to: "/admin/places", emoji: "📍" },
  { label: "Manage Providers", to: "/admin/providers", emoji: "🏪" },
  { label: "Manage Events", to: "/admin/events", emoji: "📅" },
];

function AdminDashboard() {
  const { t } = useTranslation();
  const { loading, stats } = useAdminDashboardStats(
    t("admin.dashboard.failedToLoadStats"),
  );

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
              <div className="admin-stat-value">
                {loading ? "..." : card.value}
              </div>
              <div className="admin-stat-label">{card.label}</div>
            </div>
          </article>
        ))}
      </div>

      <div className="admin-quick-actions">
        <h2 className="admin-section-title">
          {t("admin.dashboard.quickActions", "Quick Actions")}
        </h2>
        <div className="admin-actions-grid">
          {ADMIN_ACTIONS.map((action) => (
            <Link key={action.to} to={action.to} className="admin-action-card">
              <span className="admin-action-emoji">{action.emoji}</span>
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
