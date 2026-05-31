import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { FiZap } from "react-icons/fi";
import { fetchPlans, fetchMySubscription } from "@/api/billing";
import styles from "./PricingPage.module.css";

const FX_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  ILS: 3.67,
  JPY: 151.5,
  AUD: 1.53,
  CAD: 1.37,
  CHF: 0.91,
  CNY: 7.24,
  INR: 83.5,
  MXN: 17.2,
  BRL: 5.12,
  KRW: 1375,
  SGD: 1.35,
  NZD: 1.66,
  THB: 36.5,
  PHP: 57.8,
  MYR: 4.72,
  ZAR: 18.9,
  AED: 3.67,
};

function detectCurrency() {
  try {
    const locale = navigator.language || "en-US";
    const localeCurrency = {
      "en-US": "USD",
      "en-GB": "GBP",
      "en-AU": "AUD",
      "en-CA": "CAD",
      "en-NZ": "NZD",
      "en-SG": "SGD",
      "en-ZA": "ZAR",
      "de-DE": "EUR",
      "fr-FR": "EUR",
      "it-IT": "EUR",
      "es-ES": "EUR",
      "nl-NL": "EUR",
      "ja-JP": "JPY",
      "zh-CN": "CNY",
      "ko-KR": "KRW",
      "pt-BR": "BRL",
      "es-MX": "MXN",
      "th-TH": "THB",
      "he-IL": "ILS",
      "ar-AE": "AED",
      "en-IN": "INR",
      "en-PH": "PHP",
      "ms-MY": "MYR",
    };
    return (
      localeCurrency[locale] || localeCurrency[locale.split("-")[0]] || "USD"
    );
  } catch {
    return "USD";
  }
}

function formatLocalPrice(usdCents, currency) {
  const usdAmount = usdCents / 100;
  const rate = FX_RATES[currency];
  if (!rate) {
    return new Intl.NumberFormat(navigator.language, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(usdAmount);
  }
  const localAmount = usdAmount * rate;
  try {
    return new Intl.NumberFormat(navigator.language, {
      style: "currency",
      currency,
      minimumFractionDigits: localAmount >= 1 ? 2 : 4,
      maximumFractionDigits: localAmount >= 1 ? 2 : 4,
    }).format(localAmount);
  } catch {
    const rounded =
      localAmount >= 1 ? localAmount.toFixed(2) : localAmount.toFixed(4);
    return `${currency} ${rounded}`;
  }
}

function getLocalizedPlanName(plan, t) {
  const slug = String(plan?.slug ?? "").trim();
  return slug
    ? t(`billing.plans.${slug}.name`, { defaultValue: plan.name })
    : plan?.name;
}

function getLocalizedPlanDescription(plan, t) {
  const slug = String(plan?.slug ?? "").trim();
  return slug
    ? t(`billing.plans.${slug}.description`, { defaultValue: plan.description })
    : plan?.description;
}

function formatFeatureName(key, t) {
  const overrides = {
    ai_trip_planning: t(
      "billing.pricing.feature.aiTripPlanning",
      "AI Trip Planning",
    ),
    ai_trip_plans_per_month: t(
      "billing.pricing.feature.aiTripPlansPerMonth",
      "AI Trip Plans Per Month",
    ),
    unlimited_trip_plans: t(
      "billing.pricing.feature.unlimitedTripPlans",
      "Unlimited Trip Plans",
    ),
    unlimited_ai_trip_planning: t(
      "billing.pricing.feature.unlimitedAiTripPlanning",
      "Unlimited AI Trip Planning",
    ),
  };
  if (overrides[key]) return overrides[key];
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bAi\b/g, "AI");
}

function getPlanAudience(plan) {
  const audience = plan?.features?.audience;
  if (Array.isArray(audience)) {
    return audience.map((value) => String(value).toUpperCase());
  }

  if (typeof audience === "string" && audience.trim()) {
    return [audience.trim().toUpperCase()];
  }

  return ["USER", "PROVIDER"];
}

function getAudienceLabel(audience, t) {
  const hasUser = audience.includes("USER");
  const hasProvider = audience.includes("PROVIDER");

  if (hasUser && hasProvider) {
    return t("billing.pricing.audience.both", "Users + providers");
  }

  if (hasProvider) {
    return t("billing.pricing.audience.provider", "Providers");
  }

  return t("billing.pricing.audience.user", "Users");
}

export default function PricingPage() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currency, setCurrency] = useState("USD");
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const isProvider = user?.role === "PROVIDER";

  useEffect(() => {
    setCurrency(detectCurrency());
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansData, subData] = await Promise.all([
          fetchPlans(),
          isAuthenticated
            ? fetchMySubscription().catch(() => null)
            : Promise.resolve(null),
        ]);
        setPlans(Array.isArray(plansData) ? plansData : []);
        setCurrentSubscription(subData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated]);

  const availableCurrencies = useMemo(() => Object.keys(FX_RATES).sort(), []);

  const handleUpgrade = (planId) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/pricing" } });
      return;
    }
    navigate(`/billing/upgrade/${planId}`);
  };

  const highlightIdx = plans.length > 2 ? Math.floor(plans.length / 2) : -1;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.hero}>
          <div className={styles.heroBg} />
          <div
            className={styles.heroTitle}
            aria-hidden
            style={{ WebkitTextFillColor: "initial", color: "transparent" }}>
            &zwnj;
          </div>
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.skeletonGrid}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skelLine} />
                <div className={styles.skelLine} />
                <div className={styles.skelLine} />
                <div className={styles.skelLine} />
                <div className={styles.skelLine} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          {t("billing.pricing.error", "Error")}: {error}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroBg} />
        <FiZap
          size={28}
          className={styles.heroTitle}
          style={{
            display: "block",
            margin: "0 auto 12px",
            color: "var(--color-primary)",
          }}
        />
        <h1 className={styles.heroTitle}>
          {t("billing.pricing.title", "AI Trip Planning")}
        </h1>
        <p className={styles.heroSub}>
          {t(
            "billing.pricing.subtitle",
            "Generate personalized itineraries with AI — pick your plan and start exploring",
          )}
        </p>
        <div className={styles.heroMeta}>
          <span className={styles.heroTag}>
            {isProvider
              ? t(
                  "billing.pricing.hero.provider",
                  "Built for provider workspaces",
                )
              : t(
                  "billing.pricing.hero.user",
                  "Built for personal trip planning",
                )}
          </span>
          <span className={styles.heroTag}>
            {t(
              "billing.pricing.hero.sharedWallet",
              "One wallet, one subscription flow",
            )}
          </span>
        </div>
      </div>

      <div className={styles.controls}>
        <label htmlFor="currency-select">
          {t("billing.pricing.currencyLabel", "Currency")}:
        </label>
        <select
          id="currency-select"
          className={styles.currencySelect}
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}>
          {availableCurrencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.plansGrid}>
        {plans.map((plan, idx) => {
          const isCurrentPlan = currentSubscription?.plan?.id === plan.id;
          const isHighlighted = idx === highlightIdx && !isCurrentPlan;
          const features = plan.features || {};
          const planName = getLocalizedPlanName(plan, t);
          const planDescription = getLocalizedPlanDescription(plan, t);
          const audience = getPlanAudience(plan);
          const audienceLabel = getAudienceLabel(audience, t);
          const visibleFeatureEntries = Object.entries(features).filter(
            ([key]) => key !== "audience",
          );

          const cardClasses = [
            styles.planCard,
            isCurrentPlan ? styles.currentPlan : "",
            isHighlighted ? styles.highlighted : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div key={plan.id} className={cardClasses}>
              {isHighlighted && (
                <span className={styles.popularBadge}>
                  {t("billing.pricing.popular", "Most Popular")}
                </span>
              )}

              <div className={styles.planHeader}>
                <h2 className={styles.planName}>{planName}</h2>
                {isCurrentPlan && (
                  <span className={styles.badge}>
                    {t("billing.pricing.currentPlan", "Current Plan")}
                  </span>
                )}
              </div>

              <div className={styles.planMeta}>
                <span className={styles.audienceBadge}>{audienceLabel}</span>
              </div>

              <div className={styles.price}>
                <span className={styles.amount}>
                  {plan.priceCents === 0
                    ? currency === "USD"
                      ? "$0"
                      : formatLocalPrice(0, currency)
                    : formatLocalPrice(plan.priceCents, currency)}
                </span>
                <span className={styles.period}>
                  {t("billing.pricing.perMonth", "/month")}
                </span>
              </div>

              <div className={styles.credits}>
                <strong>
                  {plan.monthlyCredits >= 999999
                    ? t("billing.pricing.unlimited", "Unlimited")
                    : plan.monthlyCredits.toLocaleString()}
                </strong>{" "}
                {t("billing.pricing.creditsPerMonth", "credits/month")}
              </div>

              {planDescription && (
                <p className={styles.description}>{planDescription}</p>
              )}

              <p className={styles.capabilityNote}>
                {audience.includes("PROVIDER")
                  ? t(
                      "billing.pricing.providerReady",
                      "Works for provider accounts and standard traveler accounts with the same wallet.",
                    )
                  : t(
                      "billing.pricing.userReady",
                      "Optimized for personal accounts with predictable monthly credits.",
                    )}
              </p>

              <ul className={styles.featuresList}>
                {visibleFeatureEntries.map(([key, value]) => {
                  if (value && typeof value === "object") {
                    const baseCredits = value.baseCredits ?? value.base ?? null;
                    const isUnlim = baseCredits === -1;
                    const enabled =
                      baseCredits === -1 || Number(baseCredits) > 0;
                    return (
                      <li
                        key={key}
                        className={enabled ? styles.enabled : styles.disabled}>
                        <span className={styles.icon}>
                          {enabled ? "✓" : "✗"}
                        </span>
                        <span>
                          {isUnlim
                            ? `${t("billing.pricing.unlimited", "Unlimited")} `
                            : baseCredits != null
                              ? `${baseCredits} `
                              : ""}
                          {formatFeatureName(key, t)}
                        </span>
                      </li>
                    );
                  }

                  const isBool = typeof value === "boolean";
                  const isNegativeOne = !isBool && value === -1;
                  const enabled = isBool ? value : value !== 0;
                  return (
                    <li
                      key={key}
                      className={enabled ? styles.enabled : styles.disabled}>
                      <span className={styles.icon}>{enabled ? "✓" : "✗"}</span>
                      <span>
                        {isNegativeOne
                          ? `${t("billing.pricing.unlimited", "Unlimited")} `
                          : isBool
                            ? ""
                            : `${value} `}
                        {formatFeatureName(key, t)}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <button
                className={`${styles.button} ${isCurrentPlan ? styles.buttonActive : ""}`}
                onClick={() => handleUpgrade(plan.id)}
                disabled={isCurrentPlan}>
                {isCurrentPlan
                  ? t("billing.pricing.currentPlan", "Current Plan")
                  : `${t("billing.pricing.upgradeTo", "Upgrade to")} ${planName}`}
              </button>
            </div>
          );
        })}
      </div>

      <p className={styles.fxNote}>
        {t(
          "billing.pricing.fxNote",
          "Prices shown in {{currency}}. Approximate conversion — your bank or payment provider determines the final rate.",
          { currency },
        )}
      </p>
    </div>
  );
}
