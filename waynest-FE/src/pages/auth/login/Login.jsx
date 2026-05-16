import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLoginForm } from "@/hooks/public/useLoginForm";
import "./Login.css";

const Login = () => {
  const { t } = useTranslation();

  const {
    errorMessage,
    formData,
    loading,
    setShowPassword,
    showPassword,
    submit,
    updateField,
  } = useLoginForm();

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-header">
            <span className="login-badge">WAYNEST</span>

            <h1>{t("login.welcomeBack")}</h1>

            <p>{t("login.signIn")}</p>
          </div>

          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}>
            <div className="input-group">
              <label>{t("login.emailOrUsername")}</label>

              <input
                type="text"
                placeholder={t("login.enterEmailOrUsername")}
                value={formData.identifier}
                onChange={(event) =>
                  updateField("identifier", event.target.value)
                }
                required
              />
            </div>

            <div className="input-group">
              <label>{t("login.password")}</label>

              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("login.enterPassword")}
                  value={formData.password}
                  onChange={(event) =>
                    updateField("password", event.target.value)
                  }
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                </button>
              </div>
            </div>

            {errorMessage && <div className="login-error">{errorMessage}</div>}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? t("login.loggingIn") : t("login.loginButton")}
            </button>

            <p className="login-register-link">
              {t("login.noAccount")}{" "}
              <Link to="/register">{t("login.registerLink")}</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
