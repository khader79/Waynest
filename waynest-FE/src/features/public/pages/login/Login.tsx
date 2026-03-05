import { useState } from "react";
import "./Login.css";

import { AUTH_ENDPOINTS } from "../../../../api/endpoints";
import { useAuth } from "../../../../context/AuthContext";
import { post } from "../../../../api/apiService";
import { useTranslation } from "react-i18next";

type LoginData = {
  identifier: string;
  password: string;
};

const Login = () => {
  const [data, setData] = useState<LoginData>({
    identifier: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { t } = useTranslation();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      await post(AUTH_ENDPOINTS.LOGIN, data.identifier, data.password);
      await login();
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message || "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page container-center">
      <div className="login-card">
        <div className="login-header">
          <h1>{t("login.welcomeBack")}</h1>
          <p>{t("login.signIn")}</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="input-group">
            <label>Email Or Username</label>
            <input
              type="text"
              placeholder="Enter your email or username"
              value={data.identifier}
              onChange={(e) => setData({ ...data, identifier: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={data.password}
              onChange={(e) => setData({ ...data, password: e.target.value })}
              required
            />
          </div>

          {errorMessage && <div className="login-error">{errorMessage}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
