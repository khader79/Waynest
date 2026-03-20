import { useEffect, useState } from "react";

type SkeletonVariant = "morning" | "afternoon" | "evening";

interface SkeletonCardProps {
  variant: SkeletonVariant;
  index: number;
}

const variantColors = {
  morning: { primary: "#ff8a5b33", secondary: "#ff8a5b22" },
  afternoon: { primary: "#1fbf9a33", secondary: "#1fbf9a22" },
  evening: { primary: "#6b5ce733", secondary: "#6b5ce722" },
};

const SkeletonCard = ({ variant, index }: SkeletonCardProps) => {
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
        return "skeleton-pulse-slow";
      case 1:
        return "skeleton-pulse-medium";
      default:
        return "skeleton-pulse-fast";
    }
  };

  return (
    <div
      className="trip-slot-skeleton"
      style={{
        borderLeft: `3px solid ${colors.primary}`,
        animationDelay: `${index * 200}ms`,
      }}>
      <div className="skeleton-header">
        <div
          className={`skeleton-line skeleton-time ${getPulseClass()}`}
          style={{ background: colors.primary }}
        />
        <div
          className={`skeleton-tag ${getPulseClass()}`}
          style={{ background: colors.secondary }}
        />
      </div>
      <div className="skeleton-content">
        <div
          className={`skeleton-line skeleton-title ${getPulseClass()}`}
          style={{ background: colors.primary, width: "75%" }}
        />
        <div
          className={`skeleton-line skeleton-type ${getPulseClass()}`}
          style={{ background: colors.secondary, width: "40%" }}
        />
        <div className="skeleton-info">
          <div
            className={`skeleton-line skeleton-cost ${getPulseClass()}`}
            style={{ background: colors.primary, width: "25%" }}
          />
          <div
            className={`skeleton-line skeleton-hours ${getPulseClass()}`}
            style={{ background: colors.secondary, width: "35%" }}
          />
        </div>
      </div>
    </div>
  );
};

interface EnhancedSkeletonLoaderProps {
  days?: number;
}

export const EnhancedSkeletonLoader = ({
  days = 3,
}: EnhancedSkeletonLoaderProps) => {
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

  const generateMessage = () => {
    if (progress < 20) return "Analyzing destinations...";
    if (progress < 40) return "Finding best places...";
    if (progress < 60) return "Calculating routes...";
    if (progress < 80) return "Adding local tips...";
    return "Finalizing your plan...";
  };

  return (
    <div className="trip-plan-results">
      <div className="trip-summary-card">
        <div className="trip-summary-head">
          <h2>Generating Your Trip</h2>
          <div className="generating-spinner" />
        </div>

        <div className="generating-progress-container">
          <div className="generating-progress-bar">
            <div
              className="generating-progress-fill"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="generating-status">
            <span className="generating-message">{generateMessage()}</span>
            <span className="generating-percentage">
              {Math.round(Math.min(progress, 100))}%
            </span>
          </div>
        </div>

        <div className="generating-tips">
          <div className="generating-tip">
            <div className="tip-icon">💡</div>
            <div className="tip-content">
              <span className="tip-title">Smart Budgeting</span>
              <span className="tip-text">
                We're optimizing your itinerary to maximize value
              </span>
            </div>
          </div>
          <div className="generating-tip">
            <div className="tip-icon">🗺️</div>
            <div className="tip-content">
              <span className="tip-title">Local Insights</span>
              <span className="tip-text">
                Discovering hidden gems based on your interests
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="trip-days">
        {Array.from({ length: days }, (_, dayIndex) => (
          <div
            key={dayIndex}
            className={`trip-day-card ${dayIndex <= currentDay ? "day-loaded" : ""}`}
            style={{ opacity: dayIndex <= currentDay ? 1 : 0.5 }}>
            <h3 className="day-title">
              Day {dayIndex + 1}
              {dayIndex <= currentDay && <span className="day-check">✓</span>}
            </h3>
            <div className="day-cost">Calculating...</div>

            <div className="trip-slots">
              {(["morning", "afternoon", "evening"] as SkeletonVariant[]).map(
                (variant, slotIndex) => (
                  <SkeletonCard
                    key={variant}
                    variant={variant}
                    index={dayIndex * 3 + slotIndex}
                  />
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnhancedSkeletonLoader;
