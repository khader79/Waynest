import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import styles from "./UpgradePlanPage.module.css";

export default function UpgradePlanPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plan, setPlan] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState(null);
  const token = localStorage.getItem(STORAGE_KEYS.authToken);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch specific plan
        const plansRes = await fetch("/api/subscriptions/plans");
        if (plansRes.ok) {
          const plans = await plansRes.json();
          const selectedPlan = plans.find((p) => p.id === planId);
          setPlan(selectedPlan);
        }

        // Fetch current subscription
        const subRes = await fetch("/api/subscriptions/plans/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (subRes.ok) {
          setCurrentSubscription(await subRes.json());
        }
      } catch (err) {
        setError(err.message);
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [planId, token]);

  const handleUpgrade = async () => {
    setUpgrading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/billing/users/${user.id}/upgrade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upgrade plan");
      }

      // Success - redirect to billing dashboard
      navigate("/billing", { state: { upgraded: true } });
    } catch (err) {
      setError(err.message);
      console.error("Error upgrading plan:", err);
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (!plan) return <div className={styles.error}>Plan not found</div>;

  const currentPrice = currentSubscription?.plan?.priceCents || 0;
  const newPrice = plan.priceCents;
  const priceDifference = newPrice - currentPrice;
  const isUpgrade = newPrice > currentPrice;
  const isDowngrade = newPrice < currentPrice;
  const isSamePlan = newPrice === currentPrice;

  return (
    <div className={styles.container}>
      <button className={styles.backBtn} onClick={() => navigate("/pricing")}>
        ← Back to Pricing
      </button>

      <div className={styles.confirmCard}>
        <h1>Confirm Plan Change</h1>

        {currentSubscription && (
          <div className={styles.currentPlan}>
            <p>Your current plan:</p>
            <strong>{currentSubscription.plan?.name}</strong>
          </div>
        )}

        <div className={styles.comparison}>
          <div className={styles.arrow}>→</div>

          <div className={styles.newPlan}>
            <p>New plan:</p>
            <strong>{plan.name}</strong>
            <div className={styles.details}>
              <div>{plan.monthlyCredits.toLocaleString()} credits/month</div>
              <div>${(plan.priceCents / 100).toFixed(2)}/month</div>
            </div>
          </div>
        </div>

        {priceDifference !== 0 && !isSamePlan && (
          <div className={styles.priceChangeInfo}>
            {isUpgrade ? (
              <>
                <strong className={styles.upgrade}>
                  Upgrade (+${(priceDifference / 100).toFixed(2)}/month)
                </strong>
                <p>
                  You'll be charged the difference prorated for this billing
                  cycle.
                </p>
              </>
            ) : isDowngrade ? (
              <>
                <strong className={styles.downgrade}>
                  Downgrade (-${(Math.abs(priceDifference) / 100).toFixed(2)}
                  /month)
                </strong>
                <p>Your plan will change at the next billing cycle.</p>
              </>
            ) : null}
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button
            className={styles.cancelBtn}
            onClick={() => navigate("/pricing")}
            disabled={upgrading}>
            Cancel
          </button>
          <button
            className={styles.confirmBtn}
            onClick={handleUpgrade}
            disabled={upgrading || isSamePlan}>
            {upgrading ? "Processing..." : "Confirm & Continue"}
          </button>
        </div>

        <p className={styles.disclaimer}>
          By upgrading, you agree to our Terms of Service. Changes take effect
          immediately.
        </p>
      </div>
    </div>
  );
}
