import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import { getApiErrorMessage } from "@/utils/errors";
import {
  registerUser } from

"@/api/auth";





const INITIAL_FORM_STATE = {
  firstName: "",
  lastName: "",
  email: "",
  username: "",
  password: "",
  confirmPassword: ""
};

export const useRegisterForm = () => {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

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
      [field]: value
    }));
  };

  const submit = async () => {
    setLoading(true);
    setErrorMessage(null);

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage(t("register.passwordsDoNotMatch"));
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setErrorMessage(t("register.passwordTooShort"));
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...registerPayload } = formData;
      void confirmPassword;
      await registerUser(registerPayload);
      const redirectTo = resolveRedirectPath();
      if (redirectTo) {
        localStorage.setItem(STORAGE_KEYS.pendingAuthRedirect, redirectTo);
      }
      navigate("/verify-email", {
        state: {
          identifier: registerPayload.email || registerPayload.username,
          password: formData.password,
          redirectTo
        }
      });
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, t("register.registrationFailed"))
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    errorMessage,
    formData,
    loading,
    setShowConfirmPassword,
    setShowPassword,
    showConfirmPassword,
    showPassword,
    submit,
    updateField
  };
};