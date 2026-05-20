import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  DollarOutlined,
  UserOutlined,
  CreditCardOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  ShoppingOutlined,
  EnvironmentOutlined,
  StarOutlined,
  RiseOutlined,
  FallOutlined,
} from "@ant-design/icons";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { Table, Tag } from "antd";
import { adminDashboardService } from "@/api/admin";
import dayjs from "dayjs";
import "./AdminDashboard.css";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];
const TREND_UP = "up";
const TREND_DOWN = "down";
const TREND_FLAT = "flat";

function AnimatedValue({ value, format, loading }) {
  const [display, setDisplay] = useState(0);
  const animFrame = useRef(null);
  const startTime = useRef(null);

  useEffect(() => {
    if (loading || !value) {
      setDisplay(value || 0);
      return;
    }

    const duration = 800;
    const startVal = 0;
    const endVal = typeof value === "number" ? value : parseInt(value) || 0;

    startTime.current = null;

    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * eased);
      setDisplay(current);

      if (progress < 1) {
        animFrame.current = requestAnimationFrame(animate);
      }
    };

    animFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    };
  }, [value, loading]);

  const formatted = format ? format(display) : display?.toLocaleString();
  return <>{formatted}</>;
}

function TrendBadge({ direction, value }) {
  if (direction === TREND_FLAT) return null;
  const isUp = direction === TREND_UP;
  return (
    <span className={`trend-badge ${isUp ? "trend-up" : "trend-down"}`}>
      {isUp ? <RiseOutlined /> : <FallOutlined />}
      {value}
    </span>
  );
}

function CalcKpi({ label, value, icon, trend, format, loading, color }) {
  return (
    <article className={`kpi-card${loading ? " kpi-card--loading" : ""}`}>
      <div
        className="kpi-icon-wrap"
        style={color ? { background: color.bg, color: color.fg } : undefined}>
        {icon}
      </div>
      <div className="kpi-body">
        <span className="kpi-label">{label}</span>
        <span className="kpi-value">
          {loading ? (
            <span className="kpi-skeleton" />
          ) : (
            <AnimatedValue value={value} format={format} loading={loading} />
          )}
        </span>
        {trend && !loading && (
          <TrendBadge direction={trend.dir} value={trend.label} />
        )}
      </div>
    </article>
  );
}

function formatCurrency(cents) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatPercent(value) {
  return `${value}%`;
}

function computeTrend(current, previous, t) {
  if (!previous || previous === 0)
    return current > 0
      ? { dir: TREND_UP, label: t("admin.dashboard.new", "New") }
      : null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { dir: TREND_FLAT, label: "0%" };
  return {
    dir: pct > 0 ? TREND_UP : TREND_DOWN,
    label: `${pct > 0 ? "+" : ""}${pct}%`,
  };
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-label">{label}</span>
      <span className="chart-tooltip-value">
        ${(payload[0].value / 100).toFixed(2)}
      </span>
    </div>
  );
}

function SimpleTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-label">{payload[0].name}</span>
      <span className="chart-tooltip-value">{payload[0].value}</span>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <>
      {Array.from({ length: 11 }).map((_, i) => (
        <article key={i} className="kpi-card kpi-card--skeleton">
          <div className="kpi-icon-wrap kpi-icon-wrap--skeleton" />
          <div className="kpi-body">
            <div className="kpi-skeleton-label" />
            <div className="kpi-skeleton-value" />
          </div>
        </article>
      ))}
    </>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const tid = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(tid);
  }, []);

  const cancelledRef = useRef(false);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminDashboardService.fetchStats();
      if (!cancelledRef.current) setStats(data);
    } catch (err) {
      console.error("AdminDashboard fetchStats error:", err);
      if (!cancelledRef.current)
        setError(
          err?.response?.data?.message ||
            err.message ||
            t("admin.dashboard.loadFailed", {
              defaultValue: "Failed to load dashboard",
            }),
        );
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    cancelledRef.current = false;
    loadStats();
    return () => {
      cancelledRef.current = true;
    };
  }, [loadStats]);

  const handleRetry = useCallback(() => {
    loadStats();
  }, [loadStats]);

  const kpis = useMemo(() => {
    const r = stats?.revenue ?? {};
    const u = stats?.users ?? {};
    const s = stats?.subscriptions ?? {};
    const c = stats?.credits ?? {};
    const pa = stats?.providerApplications ?? {};
    const vr = stats?.verificationRequests ?? {};
    const p = stats?.providers ?? {};
    const pl = stats?.places ?? {};
    return [
      {
        key: "revenue",
        label: t("admin.dashboard.totalRevenue", "Total Revenue"),
        value: r.total ?? 0,
        icon: <DollarOutlined />,
        format: formatCurrency,
        trend:
          r.total != null
            ? computeTrend(r.thisMonth ?? 0, r.lastMonth ?? 0, t)
            : null,
        color: {
          bg: "color-mix(in srgb, var(--color-success) 14%, transparent)",
          fg: "var(--color-success)",
        },
      },
      {
        key: "subs",
        label: t("admin.dashboard.activeSubscriptions", "Active Subscriptions"),
        value: s.active ?? 0,
        icon: <CreditCardOutlined />,
        trend: null,
        color: {
          bg: "color-mix(in srgb, var(--color-secondary) 14%, transparent)",
          fg: "var(--color-secondary)",
        },
      },
      {
        key: "users",
        label: t("admin.dashboard.totalUsers", "Total Users"),
        value: u.total ?? 0,
        icon: <TeamOutlined />,
        trend:
          u.total != null
            ? computeTrend(u.thisMonth ?? 0, u.lastMonth ?? 0, t)
            : null,
        color: {
          bg: "color-mix(in srgb, var(--color-primary) 14%, transparent)",
          fg: "var(--color-primary)",
        },
      },
      {
        key: "provider-apps",
        label: t(
          "admin.dashboard.pendingProviderApplications",
          "Provider Applications (Pending)",
        ),
        value: pa.pending ?? 0,
        icon: <StarOutlined />,
        trend: null,
        color: {
          bg: "color-mix(in srgb, var(--color-decorative-2) 14%, transparent)",
          fg: "var(--color-decorative-2)",
        },
      },
      {
        key: "verification-requests",
        label: t(
          "admin.dashboard.pendingVerificationRequests",
          "Verification Requests (Pending)",
        ),
        value: vr.pending ?? 0,
        icon: <ThunderboltOutlined />,
        trend: null,
        color: {
          bg: "color-mix(in srgb, var(--color-warning) 14%, transparent)",
          fg: "var(--color-warning)",
        },
      },
      {
        key: "verified-providers",
        label: t("admin.dashboard.verifiedProviders", "Verified Providers"),
        value: p.verified ?? 0,
        icon: <ShoppingOutlined />,
        trend: null,
        color: {
          bg: "color-mix(in srgb, var(--color-success) 14%, transparent)",
          fg: "var(--color-success)",
        },
      },
      {
        key: "verified-places",
        label: t("admin.dashboard.verifiedPlaces", "Verified Places"),
        value: pl.verified ?? 0,
        icon: <EnvironmentOutlined />,
        trend: null,
        color: {
          bg: "color-mix(in srgb, var(--color-secondary) 14%, transparent)",
          fg: "var(--color-secondary)",
        },
      },
      {
        key: "credits",
        label: t("admin.dashboard.creditsIssued", "Credits Issued (MTD)"),
        value: c.thisMonthIssued ?? 0,
        icon: <ThunderboltOutlined />,
        format: (v) => Number(v).toLocaleString(),
        trend: null,
        color: {
          bg: "color-mix(in srgb, var(--color-warning) 14%, transparent)",
          fg: "var(--color-warning)",
        },
      },
      {
        key: "plans",
        label: t("admin.dashboard.subscriptionPlans", "Subscription Plans"),
        value: s.totalPlans ?? 0,
        icon: <UserOutlined />,
        trend: null,
        color: {
          bg: "color-mix(in srgb, var(--color-decorative-1) 14%, transparent)",
          fg: "var(--color-decorative-1)",
        },
      },
      {
        key: "mrr",
        label: t("admin.dashboard.mrr", "MRR"),
        value: s.mrr ?? 0,
        icon: <DollarOutlined />,
        format: formatCurrency,
        trend: null,
        color: {
          bg: "color-mix(in srgb, var(--color-success) 14%, transparent)",
          fg: "var(--color-success)",
        },
      },
      {
        key: "churn",
        label: t("admin.dashboard.churnRate", "Churn Rate (30d)"),
        value: s.churnRate ?? 0,
        icon: <FallOutlined />,
        format: formatPercent,
        trend: null,
        color: {
          bg: "color-mix(in srgb, var(--color-danger) 14%, transparent)",
          fg: "var(--color-danger)",
        },
      },
    ];
  }, [stats, t]);

  const chartData = useMemo(() => {
    if (!stats?.revenueByDay) return [];
    return stats.revenueByDay.map((d) => ({
      date: dayjs(d.date).format("MMM D"),
      amount: d.amount,
    }));
  }, [stats]);

  const pieData = useMemo(() => {
    if (!stats?.subscriptions?.byPlan) return [];
    return Object.entries(stats.subscriptions.byPlan).map(([name, value]) => ({
      name,
      value,
    }));
  }, [stats]);

  const paymentColumns = [
    {
      title: t("admin.dashboard.user", "User"),
      dataIndex: "user",
      key: "user",
      ellipsis: true,
    },
    {
      title: t("admin.dashboard.amount", "Amount"),
      dataIndex: "amountCents",
      key: "amount",
      render: (v) => <span className="mono">${(v / 100).toFixed(2)}</span>,
      sorter: (a, b) => a.amountCents - b.amountCents,
    },
    {
      title: t("admin.dashboard.provider", "Provider"),
      dataIndex: "provider",
      key: "provider",
      render: (v) => <Tag className="dash-tag">{v}</Tag>,
    },
    {
      title: t("admin.dashboard.date", "Date"),
      dataIndex: "createdAt",
      key: "date",
      render: (v) => dayjs(v).format("MMM D, YYYY"),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
  ];

  const subColumns = [
    {
      title: t("admin.dashboard.user", "User"),
      dataIndex: "user",
      key: "user",
      ellipsis: true,
    },
    {
      title: t("admin.dashboard.plan", "Plan"),
      dataIndex: "plan",
      key: "plan",
    },
    {
      title: t("admin.dashboard.status", "Status"),
      dataIndex: "status",
      key: "status",
      render: (v) => {
        const color =
          v === "ACTIVE" ? "green" : v === "CANCELLED" ? "red" : "orange";
        const bgMap = {
          green: "color-mix(in srgb, var(--color-success) 14%, transparent)",
          red: "color-mix(in srgb, var(--color-danger) 14%, transparent)",
          orange: "color-mix(in srgb, var(--color-warning) 14%, transparent)",
        };
        return (
          <span
            className="dash-status-badge"
            style={{
              background: bgMap[color],
              color: `var(--color-${color === "green" ? "success" : color === "red" ? "danger" : "warning"})`,
            }}>
            {v}
          </span>
        );
      },
    },
    {
      title: t("admin.dashboard.date", "Date"),
      dataIndex: "createdAt",
      key: "date",
      render: (v) => dayjs(v).format("MMM D, YYYY"),
    },
  ];

  return (
    <div className="admin-dashboard-v2">
      {/* Header */}
      <header className="dash-header">
        <div>
          <h1 className="dash-title">
            {t("admin.dashboard.title", "Admin Dashboard")}
          </h1>
          <p className="dash-subtitle">
            {dayjs(clock).format("dddd, MMMM D, YYYY")}
            <span className="dash-time">{dayjs(clock).format("h:mm A")}</span>
          </p>
        </div>
        {error && (
          <div className="dash-error">
            <span>&#9888; {error}</span>
            <button
              className="dash-retry-btn"
              onClick={handleRetry}
              disabled={loading}>
              {loading
                ? t("admin.dashboard.loading", "Loading...")
                : t("admin.dashboard.retry", "Retry")}
            </button>
          </div>
        )}
      </header>

      {/* KPI Cards */}
      <section className="kpi-grid ds-stagger">
        {loading && stats === null ? (
          <KpiSkeleton />
        ) : (
          kpis.map(({ key, ...kpi }) => (
            <CalcKpi key={key} {...kpi} loading={loading} />
          ))
        )}
      </section>

      {/* Charts Row */}
      <div className="charts-row">
        <div className="chart-card chart-card-wide">
          <h3 className="chart-title">
            <RiseOutlined />{" "}
            {t("admin.dashboard.revenueChart", "Revenue — Last 30 Days")}
          </h3>
          <div className="chart-body">
            {loading && stats === null ? (
              <div className="chart-skeleton" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient
                      id="revenueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-primary)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-primary)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={(v) => `$${v / 100}`}
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{
                      fill: "color-mix(in srgb, var(--color-primary) 8%, transparent)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">
                {t("admin.dashboard.noRevenue", "No revenue data yet")}
              </div>
            )}
          </div>
        </div>

        <div className="chart-card chart-card-narrow">
          <h3 className="chart-title">
            <TeamOutlined />{" "}
            {t("admin.dashboard.planDistribution", "Plan Distribution")}
          </h3>
          <div className="chart-body chart-body-center">
            {loading && stats === null ? (
              <div className="chart-skeleton" />
            ) : pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value">
                      {pieData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={COLORS[i % COLORS.length]}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<SimpleTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-legend">
                  {pieData.map((entry, i) => (
                    <div key={entry.name} className="pie-legend-item">
                      <span
                        className="pie-dot"
                        style={{
                          background: COLORS[i % COLORS.length],
                        }}
                      />
                      <span>{entry.name}</span>
                      <span className="pie-count">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="chart-empty">
                {t("admin.dashboard.noSubscriptions", "No subscriptions yet")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="tables-row">
        <div className="table-card">
          <h3 className="chart-title">
            <DollarOutlined />{" "}
            {t("admin.dashboard.recentPayments", "Recent Payments")}
          </h3>
          <Table
            dataSource={stats?.recentPayments || []}
            columns={paymentColumns}
            rowKey="id"
            pagination={false}
            size="small"
            loading={loading}
            locale={{
              emptyText: t("admin.dashboard.noPayments", "No payments yet"),
            }}
            className="dash-table"
          />
        </div>
        <div className="table-card">
          <h3 className="chart-title">
            <CreditCardOutlined />{" "}
            {t("admin.dashboard.recentSubscriptions", "Recent Subscriptions")}
          </h3>
          <Table
            dataSource={stats?.recentSubscriptions || []}
            columns={subColumns}
            rowKey="id"
            pagination={false}
            size="small"
            loading={loading}
            locale={{
              emptyText: t(
                "admin.dashboard.noSubscriptions",
                "No subscriptions yet",
              ),
            }}
            className="dash-table"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <section className="quick-actions-section">
        <h2 className="section-title">
          {t("admin.dashboard.quickActions", "Quick Actions")}
        </h2>
        <div className="actions-grid">
          <Link to="/admin-panel/users" className="action-card">
            <UserOutlined /> {t("admin.dashboard.manageUsers", "Manage Users")}
          </Link>
          <Link to="/admin-panel/places" className="action-card">
            <EnvironmentOutlined />{" "}
            {t("admin.dashboard.managePlaces", "Manage Places")}
          </Link>
          <Link to="/admin-panel/providers" className="action-card">
            <ShoppingOutlined />{" "}
            {t("admin.dashboard.manageProviders", "Manage Providers")}
          </Link>
          <Link to="/admin-panel/billing" className="action-card">
            <DollarOutlined />{" "}
            {t("admin.dashboard.billingCredits", "Billing & Credits")}
          </Link>
          <Link to="/admin-panel/provider-applications" className="action-card">
            <StarOutlined /> {t("admin.dashboard.applications", "Applications")}
          </Link>
          <Link
            to="/admin-panel/provider-verification-requests"
            className="action-card">
            <ThunderboltOutlined />{" "}
            {t("admin.dashboard.verifications", "Verifications")}
          </Link>
        </div>
      </section>
    </div>
  );
}
