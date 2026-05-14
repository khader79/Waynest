import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "react-router-dom";
import {
  fetchMySubscription,
  fetchMyWallet,
  fetchMyTransactions,
  fetchBillingHistory,
  cancelSubscription,
  reactivateSubscription,
} from "@/api/billing";
import styles from "./BillingDashboard.module.css";

export default function BillingDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(
    searchParams.has("session_id"),
  );

  useEffect(() => {
    if (checkoutSuccess) {
      const timer = setTimeout(() => setCheckoutSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [checkoutSuccess]);

  const fetchBillingData = useCallback(async () => {
    try {
      const [sub, walletData, history, txns] = await Promise.all([
        fetchMySubscription().catch(() => null),
        fetchMyWallet().catch(() => null),
        fetchBillingHistory().catch(() => []),
        fetchMyTransactions().catch(() => []),
      ]);
      setSubscription(sub);
      setWallet(walletData);
      setBillingHistory(Array.isArray(history) ? history : []);
      setTransactions(Array.isArray(txns) ? txns : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchBillingData();
    else setLoading(false);
  }, [user, fetchBillingData]);

  const handleCancel = async () => {
    if (!window.confirm(t("billing.dashboard.cancelConfirm", "Cancel your subscription? You'll keep access until the end of the billing period."))) return;
    setActionLoading("cancel");
    try {
      await cancelSubscription();
      await fetchBillingData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async () => {
    setActionLoading("reactivate");
    try {
      await reactivateSubscription();
      await fetchBillingData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading)
    return <div className={styles.loading}>{t("billing.dashboard.loading", "Loading billing info...")}</div>;
  if (error) return <div className={styles.error}>{t("billing.dashboard.error", "Error")}: {error}</div>;

  const availableCredits = wallet?.balance
    ? BigInt(wallet.balance) - BigInt(wallet.reserved || 0)
    : 0n;

  const isCancelled = subscription?.status === "CANCELLED";
  const isActive = subscription?.status === "ACTIVE";

  return (
    <div className={styles.container}>
      <h1>{t("billing.dashboard.title", "Billing & Credits")}</h1>

      {checkoutSuccess && (
        <div className={styles.successBanner}>
          {t("billing.dashboard.checkoutSuccess", "Payment successful! Your subscription has been activated.")}
          <button className={styles.dismissBtn} onClick={() => setCheckoutSuccess(false)}>×</button>
        </div>
      )}

      <div className={styles.grid}>
        {/* Current Subscription Card */}
        <div className={styles.card}>
          <h2>{t("billing.dashboard.currentSubscription", "Current Subscription")}</h2>
          {subscription ? (
            <>
              <div className={styles.subscriptionInfo}>
                <div className={styles.planName}>{subscription.plan?.name}</div>
                <div className={styles.status}>
                  {t("billing.dashboard.status", "Status")}:{" "}
                  <span className={`${styles.badge} ${isCancelled ? styles.badgeCancelled : ""}`}>
                    {subscription.status}
                  </span>
                </div>
                {subscription.currentPeriodEnd && (
                  <div className={styles.renewDate}>
                    {isCancelled
                      ? t("billing.dashboard.accessUntil", "Access until: {{date}}", { date: new Date(subscription.currentPeriodEnd).toLocaleDateString() })
                      : t("billing.dashboard.renews", "Renews: {{date}}", { date: new Date(subscription.currentPeriodEnd).toLocaleDateString() })}
                  </div>
                )}
              </div>
              <div className={styles.cardActions}>
                <button
                  className={styles.upgradeBtn}
                  onClick={() => (window.location.href = "/pricing")}>
                  {t("billing.dashboard.changePlan", "Change Plan")}
                </button>
                {isActive && (
                  <button
                    className={styles.dangerBtn}
                    onClick={handleCancel}
                    disabled={actionLoading === "cancel"}>
                    {actionLoading === "cancel" ? t("billing.dashboard.cancelling", "Cancelling...") : t("billing.dashboard.cancelSubscription", "Cancel Subscription")}
                  </button>
                )}
                {isCancelled && (
                  <button
                    className={styles.reactivateBtn}
                    onClick={handleReactivate}
                    disabled={actionLoading === "reactivate"}>
                    {actionLoading === "reactivate" ? t("billing.dashboard.reactivating", "Reactivating...") : t("billing.dashboard.reactivateSubscription", "Reactivate Subscription")}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className={styles.noSubscription}>
              <p>{t("billing.dashboard.noActiveSubscription", "No active subscription")}</p>
              <button
                className={styles.upgradeBtn}
                onClick={() => (window.location.href = "/pricing")}>
                {t("billing.dashboard.viewPlans", "View Plans")}
              </button>
            </div>
          )}
        </div>

        {/* Credits Card */}
        <div className={styles.card}>
          <h2>{t("billing.dashboard.yourCredits", "Your Credits")}</h2>
          {wallet ? (
            <>
              <div className={styles.creditsDisplay}>
                <div className={styles.creditValue}>
                  {availableCredits.toString()}
                </div>
                <div className={styles.creditLabel}>{t("billing.dashboard.creditsAvailable", "Credits Available")}</div>
                {wallet.monthlyQuota && (
                  <div className={styles.monthlyQuota}>
                    {t("billing.dashboard.monthlyQuota", "Monthly quota: {{quota}}", { quota: wallet.monthlyQuota >= 999999 ? t("billing.pricing.unlimited", "Unlimited") : wallet.monthlyQuota.toLocaleString() })}
                  </div>
                )}
              </div>
              {wallet.reserved > 0 && (
                <div className={styles.reservedInfo}>
                  {t("billing.dashboard.creditsReserved", "{{count}} credits reserved", { count: wallet.reserved })}
                </div>
              )}
            </>
          ) : (
            <div className={styles.noData}>{t("billing.dashboard.noWallet", "No wallet information available")}</div>
          )}
        </div>
      </div>

      {/* Billing History */}
      <div className={styles.historySection}>
        <h2>{t("billing.dashboard.paymentHistory", "Payment History")}</h2>
        {billingHistory && billingHistory.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("billing.dashboard.date", "Date")}</th>
                <th>{t("billing.dashboard.provider", "Provider")}</th>
                <th>{t("billing.dashboard.amount", "Amount")}</th>
                <th>{t("billing.dashboard.status", "Status")}</th>
              </tr>
            </thead>
            <tbody>
              {billingHistory.map((payment) => (
                <tr key={payment.id}>
                  <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                  <td className={styles.capitalize}>{payment.provider}</td>
                  <td>${(payment.amountCents / 100).toFixed(2)}</td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${styles[payment.status.toLowerCase()]}`}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.noHistory}>{t("billing.dashboard.noPaymentHistory", "No payment history available")}</div>
        )}
      </div>

      {/* Credit Transactions */}
      <div className={styles.historySection}>
        <h2>{t("billing.dashboard.creditTransactions", "Credit Transactions")}</h2>
        {transactions && transactions.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("billing.dashboard.date", "Date")}</th>
                <th>{t("billing.dashboard.type", "Type")}</th>
                <th>{t("billing.dashboard.amount", "Amount")}</th>
                <th>{t("billing.dashboard.reference", "Reference")}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                  <td className={styles.capitalize}>{tx.type.toLowerCase()}</td>
                  <td className={tx.amount.startsWith("-") ? styles.negativeAmount : styles.positiveAmount}>
                    {tx.amount.startsWith("-")
                      ? `-${Math.abs(Number(tx.amount))}`
                      : `+${Number(tx.amount)}`}
                  </td>
                  <td className={styles.refCell}>
                    {tx.metadata?.feature || tx.referenceId || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.noHistory}>{t("billing.dashboard.noCreditTransactions", "No credit transactions yet")}</div>
        )}
      </div>
    </div>
  );
}
