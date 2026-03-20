import { useMemo } from "react";
import type { BudgetBreakdown, WarningLevel } from "../tripPlanner.types";

interface BudgetAnalyzerProps {
  budget: number;
  persons: number;
  days: number;
  estimatedCost?: number;
}

export const BudgetAnalyzer = ({
  budget,
  persons,
  days,
  estimatedCost = 0,
}: BudgetAnalyzerProps) => {
  const breakdown = useMemo<BudgetBreakdown>(() => {
    const dailyBudget = budget / days;
    const perPersonBudget = budget / persons;
    const remaining = budget - estimatedCost;
    const percentUsed = budget > 0 ? (estimatedCost / budget) * 100 : 0;
    const isWithinBudget = estimatedCost <= budget;

    let warningLevel: WarningLevel = "none";
    if (percentUsed >= 100) {
      warningLevel = "high";
    } else if (percentUsed >= 85) {
      warningLevel = "medium";
    } else if (percentUsed >= 70) {
      warningLevel = "low";
    }

    return {
      totalBudget: budget,
      estimatedCost,
      remaining,
      percentUsed,
      dailyBudget,
      perPersonBudget,
      isWithinBudget,
      warningLevel,
    };
  }, [budget, persons, days, estimatedCost]);

  const getWarningColor = (level: WarningLevel) => {
    switch (level) {
      case "high":
        return "var(--color-error, #ef4444)";
      case "medium":
        return "var(--color-warning, #f59e0b)";
      case "low":
        return "var(--color-accent, #eab308)";
      default:
        return "var(--color-primary, #1fbf9a)";
    }
  };

  const getProgressWidth = () => {
    return `${Math.min(breakdown.percentUsed, 100)}%`;
  };

  return (
    <div className="budget-analyzer">
      <div className="budget-header">
        <h3>Budget Analysis</h3>
        <span
          className="budget-status"
          style={{ color: getWarningColor(breakdown.warningLevel!) }}>
          {breakdown.isWithinBudget ? "✓ Within Budget" : "⚠ Over Budget"}
        </span>
      </div>

      <div className="budget-progress">
        <div className="budget-progress-bar">
          <div
            className="budget-progress-fill"
            style={{
              width: getProgressWidth(),
              backgroundColor: getWarningColor(breakdown.warningLevel!),
            }}
          />
        </div>
        <div className="budget-progress-labels">
          <span>0%</span>
          <span>{breakdown.percentUsed.toFixed(0)}% used</span>
          <span>100%</span>
        </div>
      </div>

      <div className="budget-details">
        <div className="budget-item">
          <span className="budget-label">Total Budget</span>
          <span className="budget-value">{breakdown.totalBudget.toFixed(0)} ILS</span>
        </div>
        <div className="budget-item">
          <span className="budget-label">Estimated Cost</span>
          <span
            className="budget-value"
            style={{ color: getWarningColor(breakdown.warningLevel!) }}>
            {breakdown.estimatedCost.toFixed(0)} ILS
          </span>
        </div>
        <div className="budget-item">
          <span className="budget-label">Remaining</span>
          <span
            className="budget-value"
            style={{
              color: breakdown.remaining >= 0 ? "var(--color-primary)" : "var(--color-error)",
            }}>
            {breakdown.remaining.toFixed(0)} ILS
          </span>
        </div>
        <div className="budget-divider" />
        <div className="budget-item">
          <span className="budget-label">Per Day</span>
          <span className="budget-value">{breakdown.dailyBudget.toFixed(0)} ILS</span>
        </div>
        <div className="budget-item">
          <span className="budget-label">Per Person</span>
          <span className="budget-value">{breakdown.perPersonBudget.toFixed(0)} ILS</span>
        </div>
      </div>

      {breakdown.warningLevel !== "none" && (
        <div
          className="budget-warning"
          style={{
            backgroundColor: `${getWarningColor(breakdown.warningLevel!)}15`,
            borderColor: getWarningColor(breakdown.warningLevel!),
          }}>
          <span className="warning-icon">
            {breakdown.warningLevel === "high" ? "🚨" : breakdown.warningLevel === "medium" ? "⚠️" : "💡"}
          </span>
          <div className="warning-content">
            <strong>
              {breakdown.warningLevel === "high"
                ? "Budget Exceeded!"
                : breakdown.warningLevel === "medium"
                  ? "Budget Running Low"
                  : "Approaching Limit"}
            </strong>
            <p>
              {breakdown.warningLevel === "high"
                ? `You've exceeded your budget by ${Math.abs(breakdown.remaining).toFixed(0)} ILS. Consider reducing activities or increasing your budget.`
                : breakdown.warningLevel === "medium"
                  ? `Only ${breakdown.remaining.toFixed(0)} ILS remaining. You may want to adjust your plans.`
                  : `You're using ${breakdown.percentUsed.toFixed(0)}% of your budget. Still comfortable.`}
            </p>
          </div>
        </div>
      )}

      <div className="budget-tips">
        <h4>💡 Budget Tips</h4>
        <ul>
          {breakdown.isWithinBudget && breakdown.remaining > budget * 0.2 && (
            <li>Great job! You have room to add more activities.</li>
          )}
          {breakdown.isWithinBudget && breakdown.remaining <= budget * 0.2 && (
            <li>You're within budget. Consider setting aside some buffer.</li>
          )}
          {!breakdown.isWithinBudget && (
            <li>Look for free attractions or reduce the number of paid activities.</li>
          )}
          <li>Best value places are marked with ⭐ in your results.</li>
          <li>Consider visiting during off-peak hours for better deals.</li>
        </ul>
      </div>
    </div>
  );
};

export default BudgetAnalyzer;
