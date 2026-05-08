import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import styles from "./PricingPage.module.css";

export default function PricingPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        // Check if the request is actually reaching the right server
        // ↓↓↓ If your backend is on port 5000, change this:
        const response = await fetch("/api/subscriptions/plans");

        if (!response.ok) {
          const text = await response.text();
          console.error(
            "Server returned HTML/Error instead of JSON:",
            text.slice(0, 200),
          ); // debug
          throw new Error(
            `Server returned ${response.status}: ${response.statusText}`,
          );
        }

        const text = await response.text();
        let data;
        try {
          data = text ? JSON.parse(text) : [];
        } catch (e) {
          throw new Error(
            `Server sent invalid JSON. Got this instead: ${text.slice(0, 80)}`,
          );
        }
        setPlans(data);

        if (isAuthenticated) {
          const subResponse = await fetch("/api/subscriptions/plans/me", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem(STORAGE_KEYS.authToken)}`,
            },
          });

          if (subResponse.ok) {
            const subText = await subResponse.text();
            const subData = subText ? JSON.parse(subText) : null;
            setCurrentSubscription(subData);
          } else {
            console.log(
              "No active subscription found (status:",
              subResponse.status,
              ")",
            );
          }
        }
      } catch (err) {
        setError(err.message);
        console.error("Error fetching plans:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [isAuthenticated]);
  const handleUpgrade = (planId) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/pricing" } });
      return;
    }
    navigate(`/billing/upgrade/${planId}`);
  };

  if (loading) return <div className={styles.loading}>Loading plans...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Choose Your Plan</h1>
        <p>Unlock premium features and boost your travel experience</p>
      </div>

      <div className={styles.plansGrid}>
        {plans.map((plan) => {
          const isCurrentPlan = currentSubscription?.plan?.id === plan.id;
          const price = plan.priceCents / 100;
          const features = plan.features || {};

          return (
            <div
              key={plan.id}
              className={`${styles.planCard} ${isCurrentPlan ? styles.currentPlan : ""}`}>
              <div className={styles.planHeader}>
                <h2>{plan.name}</h2>
                {isCurrentPlan && (
                  <span className={styles.badge}>Current Plan</span>
                )}
              </div>

              <div className={styles.price}>
                <span className={styles.amount}>${price.toFixed(2)}</span>
                <span className={styles.period}>/month</span>
              </div>

              <div className={styles.credits}>
                <strong>{plan.monthlyCredits.toLocaleString()}</strong>{" "}
                credits/month
              </div>

              {plan.description && (
                <p className={styles.description}>{plan.description}</p>
              )}

              <ul className={styles.featuresList}>
                {Object.entries(features).map(([key, value]) => {
                  const isBool = typeof value === "boolean";
                  const enabled = isBool ? value : value !== 0;
                  return (
                    <li key={key} className={enabled ? styles.enabled : styles.disabled}>
                      <span className={styles.icon}>
                        {isBool ? (value ? "✓" : "✗") : `${value}`}
                      </span>
                      <span>{formatFeatureName(key)}</span>
                    </li>
                  );
                })}
              </ul>

              <button
                className={`${styles.button} ${isCurrentPlan ? styles.buttonActive : ""}`}
                onClick={() => handleUpgrade(plan.id)}
                disabled={isCurrentPlan}>
                {isCurrentPlan ? "Current Plan" : "Upgrade to " + plan.name}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatFeatureName(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bAi\b/g, "AI");
}
