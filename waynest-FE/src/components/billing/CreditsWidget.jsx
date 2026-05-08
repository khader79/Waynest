import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import styles from "./CreditsWidget.module.css";

export default function CreditsWidget() {
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem(STORAGE_KEYS.authToken);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await fetch("/api/credits", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setCredits(data);
        }
      } catch (err) {
        console.error("Error fetching credits:", err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchCredits();
    }
  }, [token]);

  if (loading || !credits) return null;

  const available =
    BigInt(credits.balance || 0) - BigInt(credits.reserved || 0);
  const percentage =
    credits.monthlyQuota > 0
      ? ((Number(available) / credits.monthlyQuota) * 100).toFixed(0)
      : 0;

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <span className={styles.label}>Credits</span>
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
          Monthly: {credits.monthlyQuota?.toLocaleString() || 0}
        </span>
        <a href="/billing" className={styles.link}>
          Manage →
        </a>
      </div>
    </div>
  );
}
