import { Link, useLocation } from "react-router-dom";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { useTranslation } from "react-i18next";
import { useRegisterForm } from "@/hooks/public/useRegisterForm";
import LogoIcon from "/images/waynest-icon.svg";
import "./Register.css";

const Register = () => {
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const {
    errorMessage,
    formData,
    loading,
    submit,
    setShowConfirmPassword,
    setShowPassword,
    showConfirmPassword,
    showPassword,
    updateField,
  } = useRegisterForm();

  return (
    <div className="register-page" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      <div className="register-card">
        <div className="register-card__header">
          <Link to="/" className="register-logo-link">
            <img src={LogoIcon} alt="Waynest" className="register-logo" />
          </Link>
          <h2 className="register-title">{t("register.signUp")}</h2>
        </div>
        <div className="register-card__body">
          <form
            className="register-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}>
            <div className="register-form__name-row">
              <div className="input-group">
                <label>{t("register.firstName")}</label>

                <input
                  type="text"
                  name="firstName"
                  placeholder={t("register.firstNamePlaceholder")}
                  value={formData.firstName}
                  onChange={(event) =>
                    updateField("firstName", event.target.value)
                  }
                  autoFocus
                  autoComplete="given-name"
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
                  onChange={(event) =>
                    updateField("lastName", event.target.value)
                  }
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label>{t("register.email")}</label>

                <input
                  type="email"
                  name="email"
                  placeholder={t("register.emailPlaceholder")}
                  value={formData.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  autoComplete="email"
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
                  onChange={(event) =>
                    updateField("username", event.target.value)
                  }
                  autoComplete="username"
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
                  onChange={(event) =>
                    updateField("password", event.target.value)
                  }
                  autoComplete="new-password"
                  required
                  minLength={8}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={(event) => {
                    event.preventDefault();
                    setShowPassword(!showPassword);
                  }}
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
                    setShowConfirmPassword(!showConfirmPassword);
                  }}
                  tabIndex={-1}>
                  {showConfirmPassword ? (
                    <AiOutlineEyeInvisible />
                  ) : (
                    <AiOutlineEye />
                  )}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="register-error">{errorMessage}</div>
            )}

            <button
              type="submit"
              className="register-button"
              disabled={loading}>
              {loading ? t("register.creatingAccount") : t("register.signUp")}
            </button>

            <div className="register-footer">
              <p>
                {t("register.alreadyHaveAccount")}{" "}
                <Link
                  to="/login"
                  state={location.state}
                  className="register-link">
                  {t("register.signIn")}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
