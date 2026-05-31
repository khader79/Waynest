import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { fetchMyWallet } from "@/api/billing";
import styles from "./CreditsWidget.module.css";

export default function CreditsWidget() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyWallet()
      .then((data) => setCredits(data))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !credits) return null;

  const available =
    BigInt(credits.balance || 0) - BigInt(credits.reserved || 0);
  const percentage =
    credits.monthlyQuota > 0
      ? ((Number(available) / credits.monthlyQuota) * 100).toFixed(0)
      : 0;
  const isProvider = user?.role === "PROVIDER";

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <span className={styles.label}>
          {isProvider
            ? t("billing.providerCredits", { defaultValue: "Provider credits" })
            : t("billing.credits", { defaultValue: "Credits" })}
        </span>
        <span className={styles.value}>{available.toString()}</span>
      </div>
      <div className={styles.progress}>
        <div
          className={styles.bar}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className={styles.footer}>
        <span className={styles.monthly}>
          {t("billing.monthly", { defaultValue: "Monthly" })}:{" "}
          {credits.monthlyQuota >= 999999
            ? t("billing.unlimited", { defaultValue: "Unlimited" })
            : credits.monthlyQuota?.toLocaleString() || 0}
        </span>
        <a href="/billing" className={styles.link}>
          {t("billing.manage", { defaultValue: "Manage →" })}
        </a>
      </div>
    </div>
  );
}
