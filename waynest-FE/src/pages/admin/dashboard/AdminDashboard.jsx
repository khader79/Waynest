import { useEffect, useState, useMemo, useRef, useCallback } from "react";
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
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Table, Tag } from "antd";
import { adminDashboardService } from "@/api/admin";
import dayjs from "dayjs";
import "./AdminDashboard.css";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];
const TREND_UP = "up";
const TREND_DOWN = "down";
const TREND_FLAT = "flat";

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

function CalcKpi({ label, value, icon, trend, format, loading }) {
  return (
    <article className="kpi-card">
      <div className="kpi-icon-wrap">{icon}</div>
      <div className="kpi-body">
        <span className="kpi-label">{label}</span>
        <span className="kpi-value">
          {loading ? "…" : format ? format(value) : value?.toLocaleString()}
        </span>
        {trend && <TrendBadge direction={trend.dir} value={trend.label} />}
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

function computeTrend(current, previous) {
  if (!previous || previous === 0) return current > 0 ? { dir: TREND_UP, label: "New" } : null;
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

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const tid = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(tid);
  }, []);

  const loadStats = useMemo(() => {
    let cancelled = false;
    const fn = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await adminDashboardService.fetchStats();
        if (!cancelled) setStats(data);
      } catch (err) {
        console.error("AdminDashboard fetchStats error:", err);
        if (!cancelled) setError(err?.response?.data?.message || err.message || "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    return { run: fn, cancel: () => { cancelled = true; } };
  }, []);

  useEffect(() => {
    loadStats.run();
    return () => loadStats.cancel();
  }, [loadStats]);

  const kpis = useMemo(() => {
    const r = stats?.revenue ?? {};
    const u = stats?.users ?? {};
    const s = stats?.subscriptions ?? {};
    const c = stats?.credits ?? {};
    return [
      {
        key: "revenue",
        label: "Total Revenue",
        value: r.total ?? 0,
        icon: <DollarOutlined />,
        format: formatCurrency,
        trend: r.total != null ? computeTrend(r.thisMonth ?? 0, r.lastMonth ?? 0) : null,
      },
      {
        key: "subs",
        label: "Active Subscriptions",
        value: s.active ?? 0,
        icon: <CreditCardOutlined />,
        trend: null,
      },
      {
        key: "users",
        label: "Total Users",
        value: u.total ?? 0,
        icon: <TeamOutlined />,
        trend: u.total != null ? computeTrend(u.thisMonth ?? 0, u.lastMonth ?? 0) : null,
      },
      {
        key: "credits",
        label: "Credits Issued (MTD)",
        value: c.thisMonthIssued ?? 0,
        icon: <ThunderboltOutlined />,
        format: (v) => Number(v).toLocaleString(),
        trend: null,
      },
      {
        key: "plans",
        label: "Subscription Plans",
        value: s.totalPlans ?? 0,
        icon: <UserOutlined />,
        trend: null,
      },
      {
        key: "mrr",
        label: "MRR",
        value: s.mrr ?? 0,
        icon: <DollarOutlined />,
        format: formatCurrency,
        trend: null,
      },
      {
        key: "churn",
        label: "Churn Rate (30d)",
        value: s.churnRate ?? 0,
        icon: <FallOutlined />,
        format: formatPercent,
        trend: null,
      },
    ];
  }, [stats]);

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
    { title: "User", dataIndex: "user", key: "user", ellipsis: true },
    {
      title: "Amount", dataIndex: "amountCents", key: "amount",
      render: (v) => (
        <span className="mono">${(v / 100).toFixed(2)}</span>
      ),
      sorter: (a, b) => a.amountCents - b.amountCents,
    },
    {
      title: "Provider", dataIndex: "provider", key: "provider",
      render: (v) => <Tag>{v}</Tag>,
    },
    {
      title: "Date", dataIndex: "createdAt", key: "date",
      render: (v) => dayjs(v).format("MMM D, YYYY"),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
  ];

  const subColumns = [
    { title: "User", dataIndex: "user", key: "user", ellipsis: true },
    { title: "Plan", dataIndex: "plan", key: "plan" },
    {
      title: "Status", dataIndex: "status", key: "status",
      render: (v) => {
        const color = v === "ACTIVE" ? "green" : v === "CANCELLED" ? "red" : "orange";
        return <Tag color={color}>{v}</Tag>;
      },
    },
    {
      title: "Date", dataIndex: "createdAt", key: "date",
      render: (v) => dayjs(v).format("MMM D, YYYY"),
    },
  ];

  return (
    <div className="admin-dashboard-v2">
      {/* Header */}
      <header className="dash-header">
        <div>
          <h1 className="dash-title">Admin Dashboard</h1>
          <p className="dash-subtitle">
            {dayjs(clock).format("dddd, MMMM D, YYYY")}
            <span className="dash-time">{dayjs(clock).format("h:mm A")}</span>
          </p>
        </div>
        {error && (
          <div className="dash-error">
            <span>⚠ {error}</span>
            <button className="dash-retry-btn" onClick={() => loadStats.run()} disabled={loading}>
              {loading ? "Loading…" : "Retry"}
            </button>
          </div>
        )}
      </header>

      {/* KPI Cards */}
      <section className="kpi-grid">
        {kpis.map(({ key, ...kpi }) => (
          <CalcKpi key={key} {...kpi} loading={loading} />
        ))}
      </section>

      {/* Charts Row */}
      <div className="charts-row">
        <div className="chart-card chart-card-wide">
          <h3 className="chart-title">
            <RiseOutlined /> Revenue &mdash; Last 30 Days
          </h3>
          <div className="chart-body">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tickFormatter={(v) => `$${v / 100}`} tick={{ fontSize: 11 }} width={50} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.08)" }} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No revenue data yet</div>
            )}
          </div>
        </div>

        <div className="chart-card chart-card-narrow">
          <h3 className="chart-title">
            <TeamOutlined /> Plan Distribution
          </h3>
          <div className="chart-body chart-body-center">
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-legend">
                  {pieData.map((entry, i) => (
                    <div key={entry.name} className="pie-legend-item">
                      <span className="pie-dot" style={{ background: COLORS[i % COLORS.length] }} />
                      <span>{entry.name}</span>
                      <span className="pie-count">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="chart-empty">No subscriptions yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="tables-row">
        <div className="table-card">
          <h3 className="chart-title"><DollarOutlined /> Recent Payments</h3>
          <Table
            dataSource={stats?.recentPayments || []}
            columns={paymentColumns}
            rowKey="id"
            pagination={false}
            size="small"
            loading={loading}
            locale={{ emptyText: "No payments yet" }}
            className="dash-table"
          />
        </div>
        <div className="table-card">
          <h3 className="chart-title"><CreditCardOutlined /> Recent Subscriptions</h3>
          <Table
            dataSource={stats?.recentSubscriptions || []}
            columns={subColumns}
            rowKey="id"
            pagination={false}
            size="small"
            loading={loading}
            locale={{ emptyText: "No subscriptions yet" }}
            className="dash-table"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <section className="quick-actions-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="actions-grid">
          <Link to="/admin-panel/users" className="action-card"><UserOutlined /> Manage Users</Link>
          <Link to="/admin-panel/places" className="action-card"><EnvironmentOutlined /> Manage Places</Link>
          <Link to="/admin-panel/providers" className="action-card"><ShoppingOutlined /> Manage Providers</Link>
          <Link to="/admin-panel/billing" className="action-card"><DollarOutlined /> Billing &amp; Credits</Link>
          <Link to="/admin-panel/provider-applications" className="action-card"><StarOutlined /> Applications</Link>
          <Link to="/admin-panel/provider-verification-requests" className="action-card"><ThunderboltOutlined /> Verifications</Link>
        </div>
      </section>
    </div>
  );
}
