import { Link, useLocation } from "react-router-dom";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { useTranslation } from "react-i18next";
import { useRegisterForm } from "../../hooks/useRegisterForm";
import "./Register.css";

const Register = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const {
    errorMessage,
    formData,
    loading,
    setShowConfirmPassword,
    setShowPassword,
    showConfirmPassword,
    showPassword,
    submit,
    updateField,
  } = useRegisterForm();

  return (
    <div className="register-page container-center">
      <div className="register-card">
        <div className="register-header">
          <h1>{t("register.title")}</h1>
          <p>{t("register.subtitle")}</p>
        </div>

        <form
          className="register-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}>
          <div className="input-group">
            <label>{t("register.firstName")}</label>
            <input
              type="text"
              name="firstName"
              placeholder={t("register.firstNamePlaceholder")}
              value={formData.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>{t("register.lastName")}</label>
            <input
              type="text"
              name="lastName"
              placeholder={t("register.lastNamePlaceholder")}
              value={formData.lastName}
              onChange={(event) => updateField("lastName", event.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>{t("register.email")}</label>
            <input
              type="email"
              name="email"
              placeholder={t("register.emailPlaceholder")}
              value={formData.email}
              onChange={(event) => updateField("email", event.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>{t("register.username")}</label>
            <input
              type="text"
              name="username"
              placeholder={t("register.usernamePlaceholder")}
              value={formData.username}
              onChange={(event) => updateField("username", event.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>{t("register.password")}</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder={t("register.passwordPlaceholder")}
                value={formData.password}
                onChange={(event) => updateField("password", event.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setShowPassword(!showPassword);
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                aria-label={
                  showPassword
                    ? t("register.hidePassword")
                    : t("register.showPassword")
                }
                tabIndex={-1}>
                {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label>{t("register.confirmPassword")}</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder={t("register.confirmPasswordPlaceholder")}
                value={formData.confirmPassword}
                onChange={(event) =>
                  updateField("confirmPassword", event.target.value)
                }
                required
                minLength={8}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setShowConfirmPassword(!showConfirmPassword);
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                aria-label={
                  showConfirmPassword
                    ? t("register.hidePassword")
                    : t("register.showPassword")
                }
                tabIndex={-1}>
                {showConfirmPassword ? (
                  <AiOutlineEyeInvisible />
                ) : (
                  <AiOutlineEye />
                )}
              </button>
            </div>
          </div>

          {errorMessage && <div className="register-error">{errorMessage}</div>}

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? t("register.creatingAccount") : t("register.signUp")}
          </button>

          <div className="register-footer">
            <p>
              {t("register.alreadyHaveAccount")}{" "}
              <Link to="/login" state={location.state} className="register-link">
                {t("register.signIn")}
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
