import React from "react";
import i18n from "@/i18n";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(/* error */) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "24px",
            gap: "16px",
            textAlign: "center",
          }}>
          <span style={{ fontSize: "48px", lineHeight: 1 }}>⚠️</span>
          <h1
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "var(--color-text-primary)",
            }}>
            {i18n.t("errorBoundary.title", {
              defaultValue: "Something went wrong",
            })}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              color: "var(--color-text-secondary)",
              maxWidth: "420px",
              lineHeight: 1.6,
            }}>
            {i18n.t("errorBoundary.message", {
              defaultValue:
                "We encountered an unexpected error. You can try again or return home.",
            })}
          </p>
          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: "10px 24px",
                borderRadius: "999px",
                border: "none",
                background: "var(--color-primary-gradient)",
                color: "var(--panel-text-on-accent)",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "var(--panel-shadow-accent)",
              }}>
              {i18n.t("errorBoundary.tryAgain", {
                defaultValue: "Try Again",
              })}
            </button>
            <button
              onClick={this.handleGoHome}
              style={{
                padding: "10px 24px",
                borderRadius: "999px",
                border: "1px solid var(--panel-border)",
                background: "var(--panel-surface)",
                color: "var(--color-text-primary)",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
              }}>
              {i18n.t("errorBoundary.goHome", {
                defaultValue: "Go Home",
              })}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
