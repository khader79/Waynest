import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import "./Register.css";

import { AUTH_ENDPOINTS } from "../../../../api/endpoints";
import { postJson } from "../../../../api/apiService";
import { useTranslation } from "react-i18next";

type RegisterData = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
};

const Register = () => {
  const [data, setData] = useState<RegisterData>({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    // Validate passwords match
    if (data.password !== data.confirmPassword) {
      setErrorMessage(t("register.passwordsDoNotMatch"));
      setLoading(false);
      return;
    }

    // Validate password length
    if (data.password.length < 8) {
      setErrorMessage(t("register.passwordTooShort"));
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...registerData } = data;
      await postJson(AUTH_ENDPOINTS.SIGNUP, registerData);
      // Redirect to login page after successful registration
      navigate("/login");
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.message || t("register.registrationFailed"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof RegisterData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setData({ ...data, [field]: e.target.value });
  };

  return (
    <div className="register-page container-center">
      <div className="register-card">
        <div className="register-header">
          <h1>{t("register.title")}</h1>
          <p>{t("register.subtitle")}</p>
        </div>

        <form className="register-form" onSubmit={handleRegister}>
          <div className="input-group">
            <label>{t("register.firstName")}</label>
            <input
              type="text"
              placeholder={t("register.firstNamePlaceholder")}
              value={data.firstName}
              onChange={handleChange("firstName")}
              required
            />
          </div>

          <div className="input-group">
            <label>{t("register.lastName")}</label>
            <input
              type="text"
              placeholder={t("register.lastNamePlaceholder")}
              value={data.lastName}
              onChange={handleChange("lastName")}
              required
            />
          </div>

          <div className="input-group">
            <label>{t("register.email")}</label>
            <input
              type="email"
              placeholder={t("register.emailPlaceholder")}
              value={data.email}
              onChange={handleChange("email")}
              required
            />
          </div>

          <div className="input-group">
            <label>{t("register.username")}</label>
            <input
              type="text"
              placeholder={t("register.usernamePlaceholder")}
              value={data.username}
              onChange={handleChange("username")}
              required
            />
          </div>

          <div className="input-group">
            <label>{t("register.password")}</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("register.passwordPlaceholder")}
                value={data.password}
                onChange={handleChange("password")}
                required
                minLength={8}
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
                aria-label={showPassword ? t("register.hidePassword") : t("register.showPassword")}
                tabIndex={-1}
              >
                {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label>{t("register.confirmPassword")}</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder={t("register.confirmPasswordPlaceholder")}
                value={data.confirmPassword}
                onChange={handleChange("confirmPassword")}
                required
                minLength={8}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowConfirmPassword(!showConfirmPassword);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                aria-label={showConfirmPassword ? t("register.hidePassword") : t("register.showPassword")}
                tabIndex={-1}
              >
                {showConfirmPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
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
              <Link to="/login" className="register-link">
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
