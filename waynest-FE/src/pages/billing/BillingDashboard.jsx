import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "react-router-dom";
import {
  fetchMySubscription,
  fetchMyWallet,
  fetchBillingHistory,
  cancelSubscription,
  reactivateSubscription,
} from "@/api/billing";
import styles from "./BillingDashboard.module.css";

export default function BillingDashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState(null);
  const [wallet, setWallet] = useState(null);
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
      const [sub, walletData, history] = await Promise.all([
        fetchMySubscription().catch(() => null),
        fetchMyWallet().catch(() => null),
        fetchBillingHistory().catch(() => []),
      ]);
      setSubscription(sub);
      setWallet(walletData);
      setBillingHistory(Array.isArray(history) ? history : []);
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
    if (!window.confirm("Cancel your subscription? You'll keep access until the end of the billing period.")) return;
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
    return <div className={styles.loading}>Loading billing info...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  const availableCredits = wallet?.balance
    ? BigInt(wallet.balance) - BigInt(wallet.reserved || 0)
    : 0n;

  const isCancelled = subscription?.status === "CANCELLED";
  const isActive = subscription?.status === "ACTIVE";

  return (
    <div className={styles.container}>
      <h1>Billing & Credits</h1>

      {checkoutSuccess && (
        <div className={styles.successBanner}>
          Payment successful! Your subscription has been activated.
          <button className={styles.dismissBtn} onClick={() => setCheckoutSuccess(false)}>×</button>
        </div>
      )}

      <div className={styles.grid}>
        {/* Current Subscription Card */}
        <div className={styles.card}>
          <h2>Current Subscription</h2>
          {subscription ? (
            <>
              <div className={styles.subscriptionInfo}>
                <div className={styles.planName}>{subscription.plan?.name}</div>
                <div className={styles.status}>
                  Status:{" "}
                  <span className={`${styles.badge} ${isCancelled ? styles.badgeCancelled : ""}`}>
                    {subscription.status}
                  </span>
                </div>
                {subscription.currentPeriodEnd && (
                  <div className={styles.renewDate}>
                    {isCancelled
                      ? `Access until: ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                      : `Renews: ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
                  </div>
                )}
              </div>
              <div className={styles.cardActions}>
                <button
                  className={styles.upgradeBtn}
                  onClick={() => (window.location.href = "/pricing")}>
                  Change Plan
                </button>
                {isActive && (
                  <button
                    className={styles.dangerBtn}
                    onClick={handleCancel}
                    disabled={actionLoading === "cancel"}>
                    {actionLoading === "cancel" ? "Cancelling..." : "Cancel Subscription"}
                  </button>
                )}
                {isCancelled && (
                  <button
                    className={styles.reactivateBtn}
                    onClick={handleReactivate}
                    disabled={actionLoading === "reactivate"}>
                    {actionLoading === "reactivate" ? "Reactivating..." : "Reactivate Subscription"}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className={styles.noSubscription}>
              <p>No active subscription</p>
              <button
                className={styles.upgradeBtn}
                onClick={() => (window.location.href = "/pricing")}>
                View Plans
              </button>
            </div>
          )}
        </div>

        {/* Credits Card */}
        <div className={styles.card}>
          <h2>Your Credits</h2>
          {wallet ? (
            <>
              <div className={styles.creditsDisplay}>
                <div className={styles.creditValue}>
                  {availableCredits.toString()}
                </div>
                <div className={styles.creditLabel}>Credits Available</div>
                {wallet.monthlyQuota && (
                  <div className={styles.monthlyQuota}>
                    Monthly quota: {wallet.monthlyQuota.toLocaleString()}
                  </div>
                )}
              </div>
              {wallet.reserved > 0 && (
                <div className={styles.reservedInfo}>
                  {wallet.reserved} credits reserved
                </div>
              )}
            </>
          ) : (
            <div className={styles.noData}>No wallet information available</div>
          )}
        </div>
      </div>

      {/* Billing History */}
      <div className={styles.historySection}>
        <h2>Payment History</h2>
        {billingHistory && billingHistory.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Provider</th>
                <th>Amount</th>
                <th>Status</th>
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
          <div className={styles.noHistory}>No payment history available</div>
        )}
      </div>
    </div>
  );
}
