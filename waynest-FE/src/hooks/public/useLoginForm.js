import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import { getApiErrorMessage } from "@/utils/errors";
import { navigateAfterAuth } from "@/utils/routing";
import { useAuth } from "@/context/AuthContext";
import { loginWithCredentials } from "@/api/auth";
import { resendEmailVerificationCode } from "@/api/auth";

export const useLoginForm = () => {
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { login } = useAuth();

  const resolveRedirectPath = () => {
    const fromState = location.state?.from;
    if (typeof fromState === "string" && fromState.trim()) {
      return fromState;
    }
    if (fromState && typeof fromState === "object" && fromState.pathname) {
      return `${fromState.pathname}${fromState.search ?? ""}`;
    }
    const stored = localStorage.getItem(STORAGE_KEYS.pendingAuthRedirect);
    return stored && stored.trim() ? stored : null;
  };

  const updateField = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await loginWithCredentials({
        identifier: formData.identifier.trim(),
        password: formData.password,
      });
      const authenticatedUser = await login();
      const redirectTo = resolveRedirectPath();
      localStorage.removeItem(STORAGE_KEYS.pendingAuthRedirect);

      if (authenticatedUser) {
        navigateAfterAuth(navigate, authenticatedUser, redirectTo);
      }
    } catch (error) {
      const apiMessage = getApiErrorMessage(error, t("login.loginFailed"));

      if (apiMessage === "Please verify your email first") {
        localStorage.setItem(
          STORAGE_KEYS.pendingLoginCredentials,
          JSON.stringify(formData),
        );
        const redirectTo = resolveRedirectPath();
        if (redirectTo) {
          localStorage.setItem(STORAGE_KEYS.pendingAuthRedirect, redirectTo);
        }

        try {
          await resendEmailVerificationCode(formData.identifier);
          toast.success("Verification code sent.");
        } catch (resendError) {
          toast.error(
            getApiErrorMessage(
              resendError,
              "Failed to resend verification code.",
            ),
          );
        }

        navigate("/verify-email", {
          state: { ...formData, redirectTo },
        });
        return;
      }

      if (apiMessage === "Device not allowed") {
        setErrorMessage(t("login.deviceNotAllowed"));
        return;
      }

      setErrorMessage(apiMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    errorMessage,
    formData,
    loading,
    setShowPassword,
    showPassword,
    submit,
    updateField,
  };
};
