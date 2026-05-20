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

    // Bind methods
    this.handleRetry = this.handleRetry.bind(this);
    this.handleGoHome = this.handleGoHome.bind(this);
    this.logError = this.logError.bind(this);
    this.handleWindowError = this.handleWindowError.bind(this);
    this.handleUnhandledRejection = this.handleUnhandledRejection.bind(this);
  }

  static getDerivedStateFromError(/* error */) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    this.logError(error, errorInfo);
  }

  // Global error handlers
  handleWindowError(event) {
    const error = event.error || new Error(event.message);
    const errorInfo = {
      componentStack: "",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    };
    this.setState({ hasError: true, error, errorInfo });
    this.logError(error, errorInfo);
  }

  handleUnhandledRejection(event) {
    let error = event.reason;
    if (!(error instanceof Error)) {
      error = new Error(String(error));
    }
    const errorInfo = {
      componentStack: "",
      promise: event.promise,
    };
    this.setState({ hasError: true, error, errorInfo });
    this.logError(error, errorInfo);
  }

  // Enhanced error logging
  logError(error, errorInfo) {
    // Log to console in development
    if (process.env.NODE_ENV !== "production") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    // TODO: Integrate with error reporting service (Sentry, LogRocket, etc.)
    // Example:
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(error, { extra: errorInfo });
    // }

    // You could also send to your own logging endpoint here
    // fetch('/api/log-error', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ 
    //     error: error.message,
    //     stack: error.stack,
    //     componentStack: errorInfo.componentStack,
    //     url: window.location.href,
    //     timestamp: new Date().toISOString()
    //   })
    // }).catch(() => {}); // Fail silently to avoid error loops
  }

  componentDidMount() {
    // Set up global error listeners
    window.addEventListener("error", this.handleWindowError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    // Clean up global error listeners
    window.removeEventListener("error", this.handleWindowError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  handleRetry() {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  handleGoHome() {
    window.location.href = "/";
  }

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
