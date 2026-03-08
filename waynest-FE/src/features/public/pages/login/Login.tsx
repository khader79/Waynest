import { useState } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
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
  const [showPassword, setShowPassword] = useState(false);

  const { t } = useTranslation();
  const { login } = useAuth();

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      await post(AUTH_ENDPOINTS.LOGIN, data.identifier, data.password);
      await login();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || t("login.loginFailed"));
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
            <label>{t("login.emailOrUsername")}</label>
            <input
              type="text"
              placeholder={t("login.enterEmailOrUsername")}
              value={data.identifier}
              onChange={(e) => setData({ ...data, identifier: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label>{t("login.password")}</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("login.enterPassword")}
                value={data.password}
                onChange={(e) => setData({ ...data, password: e.target.value })}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPassword(!showPassword);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                aria-label={
                  showPassword
                    ? t("login.hidePassword")
                    : t("login.showPassword")
                }
                tabIndex={-1}>
                {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
              </button>
            </div>
          </div>

          {errorMessage && <div className="login-error">{errorMessage}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? t("login.loggingIn") : t("login.loginButton")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
