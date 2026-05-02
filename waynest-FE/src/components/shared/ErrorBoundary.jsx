import React from "react";
import { Empty, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
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
            backgroundColor: "var(--color-bg)",
            padding: "20px",
          }}>
          <Empty
            description="Something went wrong"
            style={{ marginBottom: "20px" }}
          />
          <p
            style={{
              color: "var(--color-text-secondary)",
              marginBottom: "20px",
            }}>
            We encountered an unexpected error. Please try refreshing the page.
          </p>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={this.handleReset}
            size="large">
            Return to Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
