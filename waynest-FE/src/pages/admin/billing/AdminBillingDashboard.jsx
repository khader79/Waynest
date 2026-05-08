import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import styles from "./AdminBillingDashboard.module.css";

export default function AdminBillingDashboard() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [granting, setGranting] = useState(false);
  const token = localStorage.getItem("token");

  if (user?.role !== "ADMIN") {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          You don't have access to this page. Admin only.
        </div>
      </div>
    );
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Seed plans
        try {
          await fetch("/api/admin/billing/seed-plans", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (err) {
          console.warn("Could not seed plans:", err);
        }

        // Fetch plans
        try {
          const plansRes = await fetch("/api/admin/billing/plans", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (plansRes.ok) {
            setPlans(await plansRes.json());
          } else {
            console.error("Plans response not ok:", plansRes.status);
            setError(`Failed to fetch plans: ${plansRes.status}`);
          }
        } catch (err) {
          console.error("Error fetching plans:", err);
        }

        // Fetch audit logs
        try {
          const logsRes = await fetch(
            "/api/admin/billing/audit-logs?limit=50",
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (logsRes.ok) {
            setAuditLogs(await logsRes.json());
          } else {
            console.error("Audit logs response not ok:", logsRes.status);
          }
        } catch (err) {
          console.error("Error fetching audit logs:", err);
        }
      } catch (err) {
        setError(err.message);
        console.error("Error fetching admin data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  const handleGrantCredits = async (e) => {
    e.preventDefault();
    if (!selectedUser || !grantAmount || !grantReason) {
      setError("Please fill in all fields");
      return;
    }

    setGranting(true);
    try {
      const res = await fetch(
        `/api/admin/billing/users/${selectedUser}/grant-credits`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: parseInt(grantAmount),
            reason: grantReason,
          }),
        },
      );

      if (res.ok) {
        setGrantAmount("");
        setGrantReason("");
        setSelectedUser(null);
        setError(null);

        // Refresh audit logs
        const logsRes = await fetch("/api/admin/billing/audit-logs?limit=50", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (logsRes.ok) {
          setAuditLogs(await logsRes.json());
        }
      } else {
        const data = await res.json();
        setError(data.message || "Failed to grant credits");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGranting(false);
    }
  };

  if (loading) return <div className={styles.container}>Loading...</div>;

  return (
    <div className={styles.container}>
      <h1>Admin Billing Dashboard</h1>

      {error && <div className={styles.error}>{error}</div>}

      {/* Plans Section */}
      <div className={styles.section}>
        <h2>Subscription Plans</h2>
        <div className={styles.plansGrid}>
          {plans.map((plan) => (
            <div key={plan.id} className={styles.planCard}>
              <h3>{plan.name}</h3>
              <p className={styles.credits}>
                {plan.monthlyCredits?.toLocaleString()} credits/month
              </p>
              <p className={styles.price}>
                ${(plan.priceCents / 100).toFixed(2)}/month
              </p>
              <div className={styles.features}>
                {plan.features &&
                  Object.entries(plan.features).map(([key, enabled]) => (
                    <span
                      key={key}
                      className={
                        enabled ? styles.featureEnabled : styles.featureDisabled
                      }>
                      {key}: {enabled ? "✓" : "✗"}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grant Credits Section */}
      <div className={styles.section}>
        <h2>Grant Credits to User</h2>
        <form onSubmit={handleGrantCredits} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="userId">User ID:</label>
            <input
              id="userId"
              type="text"
              placeholder="Enter user ID (UUID)"
              value={selectedUser || ""}
              onChange={(e) => setSelectedUser(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="amount">Credits to Grant:</label>
            <input
              id="amount"
              type="number"
              placeholder="1000"
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              className={styles.input}
              min="1"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="reason">Reason:</label>
            <input
              id="reason"
              type="text"
              placeholder="e.g., Promotional grant, Bug compensation"
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              className={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={granting}
            className={styles.submitBtn}>
            {granting ? "Granting..." : "Grant Credits"}
          </button>
        </form>
      </div>

      {/* Audit Logs Section */}
      <div className={styles.section}>
        <h2>Recent Audit Logs</h2>
        <div className={styles.auditTable}>
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Target</th>
                <th>Actor</th>
                <th>Reason</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.action}</td>
                  <td>
                    {log.targetType}#{log.targetId?.substring(0, 8)}
                  </td>
                  <td>{log.actor?.username || "System"}</td>
                  <td>{log.reason || "-"}</td>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
