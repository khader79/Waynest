import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchPlans,
  fetchMySubscription,
  upgradePlan,
  downgradePlan,
  createCheckoutSession,
} from "@/api/billing";
import styles from "./UpgradePlanPage.module.css";

export default function UpgradePlanPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDowngrade, setConfirmDowngrade] = useState(false);

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

  const handleConfirm = async () => {
    setProcessing(true);
    setError(null);
    try {
      if (isDowngrade) {
        await downgradePlan(planId);
        navigate("/billing", { state: { downgraded: true } });
      } else if (plan.priceCents > 0) {
        const { sessionUrl } = await createCheckoutSession(planId);
        window.location.href = sessionUrl;
      } else {
        await upgradePlan(planId);
        navigate("/billing", { state: { upgraded: true } });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
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
                <p>Your plan changes immediately with prorated credit.</p>
                {!confirmDowngrade && (
                  <button
                    className={styles.downgradeInfoBtn}
                    onClick={() => setConfirmDowngrade(true)}>
                    Learn what you'll lose →
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {isDowngrade && confirmDowngrade && (
          <div className={styles.downgradeWarning}>
            <h3>Before you downgrade</h3>
            <ul>
              <li>Your monthly credit allowance will decrease to {plan.monthlyCredits.toLocaleString()} credits</li>
              <li>Some features may be restricted based on your new plan</li>
              <li>The change takes effect immediately with prorated billing</li>
              <li>Your current credits are preserved (up to the new plan's quota)</li>
            </ul>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button
            className={styles.cancelBtn}
            onClick={() => navigate("/pricing")}
            disabled={processing}>
            Cancel
          </button>
          <button
            className={isDowngrade ? styles.downgradeConfirmBtn : styles.confirmBtn}
            onClick={handleConfirm}
            disabled={processing || isSamePlan || (isDowngrade && !confirmDowngrade)}>
            {processing
              ? "Processing..."
              : isDowngrade
                ? "Confirm Downgrade"
                : "Confirm & Continue"}
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
