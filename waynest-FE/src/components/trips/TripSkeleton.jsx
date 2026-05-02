/**
 * TripSkeleton - Loading skeleton for trip generation
 */

import { useEffect, useState } from "react";
import styles from "./TripSkeleton.module.css";

const variantColors = {
  morning: {
    primary: "hsl(var(--color-warning-hsl) / 0.20)",
    secondary: "hsl(var(--color-warning-hsl) / 0.13)",
  },
  afternoon: {
    primary: "hsl(var(--color-success-hsl) / 0.20)",
    secondary: "hsl(var(--color-success-hsl) / 0.13)",
  },
  evening: {
    primary: "hsl(var(--color-secondary-hsl) / 0.20)",
    secondary: "hsl(var(--color-secondary-hsl) / 0.13)",
  },
};

const SkeletonCard = ({ variant, index }) => {
  const [animationPhase, setAnimationPhase] = useState(0);
  const colors = variantColors[variant];

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase((prev) => (prev + 1) % 3);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const getPulseClass = () => {
    switch (animationPhase) {
      case 0:
        return styles.pulseSlow;
      case 1:
        return styles.pulseMedium;
      default:
        return styles.pulseFast;
    }
  };

  return (
    <div
      className={styles.slotSkeleton}
      style={{
        borderLeft: `3px solid ${colors.primary}`,
        animationDelay: `${index * 200}ms`,
      }}>
      <div className={styles.skeletonHeader}>
        <div
          className={`${styles.skeletonLine} ${styles.skeletonTime} ${getPulseClass()}`}
          style={{ background: colors.primary }}
        />

        <div
          className={`${styles.skeletonTag} ${getPulseClass()}`}
          style={{ background: colors.secondary }}
        />
      </div>
      <div className={styles.skeletonContent}>
        <div
          className={`${styles.skeletonLine} ${styles.skeletonTitle} ${getPulseClass()}`}
          style={{ background: colors.primary, width: "75%" }}
        />

        <div
          className={`${styles.skeletonLine} ${styles.skeletonType} ${getPulseClass()}`}
          style={{ background: colors.secondary, width: "40%" }}
        />

        <div className={styles.skeletonInfo}>
          <div
            className={`${styles.skeletonLine} ${styles.skeletonCost} ${getPulseClass()}`}
            style={{ background: colors.primary, width: "25%" }}
          />

          <div
            className={`${styles.skeletonLine} ${styles.skeletonHours} ${getPulseClass()}`}
            style={{ background: colors.secondary, width: "35%" }}
          />
        </div>
      </div>
    </div>
  );
};

export const TripSkeleton = ({
  days = 3,
  finish = false,
  onFinish = () => {},
}) => {
  const [currentDay, setCurrentDay] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 800);

    const dayInterval = setInterval(() => {
      setCurrentDay((prev) => (prev < days - 1 ? prev + 1 : prev));
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(dayInterval);
    };
  }, [days]);

  useEffect(() => {
    if (!finish) {
      return;
    }
    // Force progress to 100% and call onFinish after CSS transition
    const setToFull = setTimeout(() => setProgress(100), 16);
    const t = setTimeout(() => {
      try {
        onFinish();
      } catch {
        // ignore
      }
    }, 920);
    return () => {
      clearTimeout(setToFull);
      clearTimeout(t);
    };
  }, [finish, onFinish]);

  const generateMessage = () => {
    if (progress < 20) return "Analyzing destinations...";
    if (progress < 40) return "Finding best places...";
    if (progress < 60) return "Calculating routes...";
    if (progress < 80) return "Adding local tips...";
    return "Finalizing your plan...";
  };

  return (
    <div className={styles.results}>
      <div className={styles.summaryCard}>
        <div className={styles.summaryHeader}>
          <h2>Generating Your Trip</h2>
          <div className={styles.spinner} />
        </div>

        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className={styles.progressStatus}>
            <span className={styles.progressMessage}>{generateMessage()}</span>
            <span className={styles.progressPercentage}>
              {Math.round(Math.min(progress, 100))}%
            </span>
          </div>
        </div>

        <div className={styles.tips}>
          <div className={styles.tip}>
            <div className={styles.tipIcon}>💡</div>
            <div className={styles.tipContent}>
              <span className={styles.tipTitle}>Smart Budgeting</span>
              <span className={styles.tipText}>
                We're optimizing your itinerary to maximize value
              </span>
            </div>
          </div>
          <div className={styles.tip}>
            <div className={styles.tipIcon}>🗺️</div>
            <div className={styles.tipContent}>
              <span className={styles.tipTitle}>Local Insights</span>
              <span className={styles.tipText}>
                Discovering hidden gems based on your interests
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.daysContainer}>
        {Array.from({ length: days }, (_, dayIndex) => (
          <div
            key={dayIndex}
            className={`${styles.dayCard} ${dayIndex <= currentDay ? styles.dayLoaded : ""}`}
            style={{ opacity: dayIndex <= currentDay ? 1 : 0.5 }}>
            <h3 className={styles.dayTitle}>
              Day {dayIndex + 1}
              {dayIndex <= currentDay && (
                <span className={styles.dayCheck}>✓</span>
              )}
            </h3>
            <div className={styles.dayCost}>Calculating...</div>

            <div className={styles.slotsContainer}>
              {["morning", "afternoon", "evening"].map((variant, slotIndex) => (
                <SkeletonCard
                  key={variant}
                  variant={variant}
                  index={dayIndex * 3 + slotIndex}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TripSkeleton;
