import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  fetchPlans,
  fetchMySubscription,
  upgradePlan,
  downgradePlan,
  createCheckoutSession,
} from "@/api/billing";
import styles from "./UpgradePlanPage.module.css";

export default function UpgradePlanPage() {
  const { t } = useTranslation();
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

  if (loading) return <div className={styles.loading}>{t("billing.upgrade.loading", "Loading...")}</div>;
  if (!plan) return <div className={styles.error}>{t("billing.upgrade.planNotFound", "Plan not found")}</div>;

  const currentPrice = currentSubscription?.plan?.priceCents || 0;
  const newPrice = plan.priceCents;
  const priceDifference = newPrice - currentPrice;
  const isUpgrade = newPrice > currentPrice;
  const isDowngrade = newPrice < currentPrice;
  const isSamePlan = newPrice === currentPrice;

  return (
    <div className={styles.container}>
      <button className={styles.backBtn} onClick={() => navigate("/pricing")}>
        ← {t("billing.upgrade.backToPricing", "Back to Pricing")}
      </button>

      <div className={styles.confirmCard}>
        <h1>{t("billing.upgrade.confirmTitle", "Confirm Plan Change")}</h1>

        {currentSubscription && (
          <div className={styles.currentPlan}>
            <p>{t("billing.upgrade.yourCurrentPlan", "Your current plan:")}</p>
            <strong>{currentSubscription.plan?.name}</strong>
          </div>
        )}

        <div className={styles.comparison}>
          <div className={styles.arrow}>→</div>

          <div className={styles.newPlan}>
            <p>{t("billing.upgrade.newPlan", "New plan:")}</p>
            <strong>{plan.name}</strong>
            <div className={styles.details}>
              <div>{t("billing.upgrade.creditsPerMonth", "{{count}} credits/month", { count: plan.monthlyCredits.toLocaleString() })}</div>
              <div>{t("billing.upgrade.pricePerMonth", "${{price}}/month", { price: (plan.priceCents / 100).toFixed(2) })}</div>
            </div>
          </div>
        </div>

        {priceDifference !== 0 && !isSamePlan && (
          <div className={styles.priceChangeInfo}>
            {isUpgrade ? (
              <>
                <strong className={styles.upgrade}>
                  {t("billing.upgrade.upgradePrice", "Upgrade (+${{price}}/month)", { price: (priceDifference / 100).toFixed(2) })}
                </strong>
                <p>
                  {t("billing.upgrade.upgradeDescription", "You'll be charged the difference prorated for this billing cycle.")}
                </p>
              </>
            ) : (
              <>
                <strong className={styles.downgrade}>
                  {t("billing.upgrade.downgradePrice", "Downgrade (-${{price}}/month)", { price: (Math.abs(priceDifference) / 100).toFixed(2) })}
                </strong>
                <p>{t("billing.upgrade.downgradeDescription", "Your plan changes immediately with prorated credit.")}</p>
                {!confirmDowngrade && (
                  <button
                    className={styles.downgradeInfoBtn}
                    onClick={() => setConfirmDowngrade(true)}>
                    {t("billing.upgrade.learnWhatYouLose", "Learn what you'll lose →")}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {isDowngrade && confirmDowngrade && (
          <div className={styles.downgradeWarning}>
            <h3>{t("billing.upgrade.beforeDowngrade", "Before you downgrade")}</h3>
            <ul>
              <li>{t("billing.upgrade.downgradeWarning1", "Your monthly credit allowance will decrease to {{count}} credits", { count: plan.monthlyCredits.toLocaleString() })}</li>
              <li>{t("billing.upgrade.downgradeWarning2", "Some features may be restricted based on your new plan")}</li>
              <li>{t("billing.upgrade.downgradeWarning3", "The change takes effect immediately with prorated billing")}</li>
              <li>{t("billing.upgrade.downgradeWarning4", "Your current credits are preserved (up to the new plan's quota)")}</li>
            </ul>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button
            className={styles.cancelBtn}
            onClick={() => navigate("/pricing")}
            disabled={processing}>
            {t("billing.upgrade.cancel", "Cancel")}
          </button>
          <button
            className={isDowngrade ? styles.downgradeConfirmBtn : styles.confirmBtn}
            onClick={handleConfirm}
            disabled={processing || isSamePlan || (isDowngrade && !confirmDowngrade)}>
            {processing
              ? t("billing.upgrade.processing", "Processing...")
              : isDowngrade
                ? t("billing.upgrade.confirmDowngrade", "Confirm Downgrade")
                : t("billing.upgrade.confirmUpgrade", "Confirm & Continue")}
          </button>
        </div>

        <p className={styles.disclaimer}>
          {t("billing.upgrade.disclaimer", "By upgrading, you agree to our Terms of Service. Changes take effect immediately.")}
        </p>
      </div>
    </div>
  );
}
