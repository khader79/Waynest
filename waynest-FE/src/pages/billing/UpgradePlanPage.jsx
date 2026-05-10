import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchPlans,
  fetchMySubscription,
  upgradePlan,
  createCheckoutSession,
} from "@/api/billing";
import styles from "./UpgradePlanPage.module.css";

export default function UpgradePlanPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plans, sub] = await Promise.all([
          fetchPlans(),
          fetchMySubscription().catch(() => null),
        ]);
        const selectedPlan = Array.isArray(plans)
          ? plans.find((p) => p.id === planId)
          : null;
        setPlan(selectedPlan);
        setCurrentSubscription(sub);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [planId]);

  const handleUpgrade = async () => {
    setUpgrading(true);
    setError(null);
    try {
      if (plan.priceCents > 0) {
        const { sessionUrl } = await createCheckoutSession(planId);
        window.location.href = sessionUrl;
      } else {
        await upgradePlan(planId);
        navigate("/billing", { state: { upgraded: true } });
      }
    } catch (err) {
      setError(err.message);
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
            ) : (
              <>
                <strong className={styles.downgrade}>
                  Downgrade (-${(Math.abs(priceDifference) / 100).toFixed(2)}
                  /month)
                </strong>
                <p>Your plan will change at the next billing cycle.</p>
              </>
            )}
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
