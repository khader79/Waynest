import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/api/routes";
import { get, postJson } from "@/api/request";
import styles from "./AdminBillingDashboard.module.css";

export default function AdminBillingDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [granting, setGranting] = useState(false);

  if (user?.role !== "ADMIN") {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          {t("adminBilling.dashboard.noAccess")}
        </div>
      </div>
    );
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Seed plans
        try {
          await postJson(ROUTES.admin.billing.seedPlans, {});
        } catch (err) {
          console.warn("Could not seed plans:", err);
        }

        // Fetch plans
        try {
          const plansData = await get(ROUTES.admin.billing.plans);
          setPlans(plansData);
        } catch (err) {
          console.error("Error fetching plans:", err);
          setError(t("adminBilling.dashboard.fetchPlansError", { message: err.message }));
        }

        // Fetch audit logs
        try {
          const logsData = await get(ROUTES.admin.billing.auditLogs + "?limit=50");
          setAuditLogs(logsData);
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

    fetchData();
  }, []);

  const handleGrantCredits = async (e) => {
    e.preventDefault();
    if (!selectedUser || !grantAmount || !grantReason) {
      setError(t("adminBilling.dashboard.fillAllFields"));
      return;
    }

    setGranting(true);
    try {
      await postJson(ROUTES.admin.billing.grantCredits(selectedUser), {
        amount: parseInt(grantAmount),
        reason: grantReason,
      });
      setGrantAmount("");
      setGrantReason("");
      setSelectedUser(null);
      setError(null);

      // Refresh audit logs
      try {
        const logsData = await get(ROUTES.admin.billing.auditLogs + "?limit=50");
        setAuditLogs(logsData);
      } catch (err) {
        console.error("Error refreshing audit logs:", err);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGranting(false);
    }
  };

  if (loading) return <div className={styles.container}>{t("adminBilling.dashboard.loading")}</div>;

  return (
    <div className={styles.container}>
      <h1>{t("adminBilling.dashboard.title")}</h1>

      {error && <div className={styles.error}>{error}</div>}

      {/* Plans Section */}
      <div className={styles.section}>
        <h2>{t("adminBilling.dashboard.subscriptionPlans")}</h2>
        <div className={styles.plansGrid}>
          {plans.map((plan) => (
            <div key={plan.id} className={styles.planCard}>
              <h3>{plan.name}</h3>
              <p className={styles.credits}>
                {t("adminBilling.dashboard.creditsPerMonth", { count: plan.monthlyCredits?.toLocaleString() })}
              </p>
              <p className={styles.price}>
                {t("adminBilling.dashboard.pricePerMonth", { price: (plan.priceCents / 100).toFixed(2) })}
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
        <h2>{t("adminBilling.dashboard.grantCreditsTitle")}</h2>
        <form onSubmit={handleGrantCredits} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="userId">{t("adminBilling.dashboard.userIdLabel")}</label>
            <input
              id="userId"
              type="text"
              placeholder={t("adminBilling.dashboard.userIdPlaceholder")}
              value={selectedUser || ""}
              onChange={(e) => setSelectedUser(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="amount">{t("adminBilling.dashboard.creditsToGrantLabel")}</label>
            <input
              id="amount"
              type="number"
              placeholder={t("adminBilling.dashboard.creditsToGrantPlaceholder")}
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              className={styles.input}
              min="1"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="reason">{t("adminBilling.dashboard.reasonLabel")}</label>
            <input
              id="reason"
              type="text"
              placeholder={t("adminBilling.dashboard.reasonPlaceholder")}
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              className={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={granting}
            className={styles.submitBtn}>
            {granting ? t("adminBilling.dashboard.granting") : t("adminBilling.dashboard.grantCredits")}
          </button>
        </form>
      </div>

      {/* Audit Logs Section */}
      <div className={styles.section}>
        <h2>{t("adminBilling.dashboard.recentAuditLogs")}</h2>
        <div className={styles.auditTable}>
          <table>
            <thead>
              <tr>
                <th>{t("adminBilling.dashboard.auditAction")}</th>
                <th>{t("adminBilling.dashboard.auditTarget")}</th>
                <th>{t("adminBilling.dashboard.auditActor")}</th>
                <th>{t("adminBilling.dashboard.auditReason")}</th>
                <th>{t("adminBilling.dashboard.auditTimestamp")}</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.action}</td>
                  <td>
                    {log.targetType}#{log.targetId?.substring(0, 8)}
                  </td>
                  <td>{log.actor?.username || t("adminBilling.dashboard.system")}</td>
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
