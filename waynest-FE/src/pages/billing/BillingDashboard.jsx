import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import styles from "./BillingDashboard.module.css";

export default function BillingDashboard() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        // Fetch current subscription
        const subRes = await fetch("/api/subscriptions/plans/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (subRes.ok) {
          setSubscription(await subRes.json());
        }

        // Fetch wallet/credits
        const walletRes = await fetch("/api/credits", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (walletRes.ok) {
          setWallet(await walletRes.json());
        }

        // Fetch billing history (optional - may not be available yet)
        if (user?.id) {
          try {
            const historyRes = await fetch(
              `/api/admin/billing/users/${user.id}/billing-history`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            if (historyRes.ok) {
              setBillingHistory(await historyRes.json());
            }
          } catch (err) {
            // Billing history endpoint may not be available
            console.error("Could not fetch billing history:", err);
          }
        }
      } catch (err) {
        setError(err.message);
        console.error("Error fetching billing data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, [token]);

  if (loading)
    return <div className={styles.loading}>Loading billing info...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  const availableCredits = wallet?.balance
    ? BigInt(wallet.balance) - BigInt(wallet.reserved || 0)
    : 0n;

  return (
    <div className={styles.container}>
      <h1>Billing & Credits</h1>

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
                  <span className={styles.badge}>{subscription.status}</span>
                </div>
                {subscription.currentPeriodEnd && (
                  <div className={styles.renewDate}>
                    Renews:{" "}
                    {new Date(
                      subscription.currentPeriodEnd,
                    ).toLocaleDateString()}
                  </div>
                )}
              </div>
              <button
                className={styles.upgradeBtn}
                onClick={() => (window.location.href = "/pricing")}>
                Change Plan
              </button>
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
