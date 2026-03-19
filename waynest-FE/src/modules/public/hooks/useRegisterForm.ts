import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getApiErrorMessage } from "@/core/utils/errors";
import {
  registerUser,
  type RegisterPayload,
} from "@/services/auth/auth.service";

type RegisterFormState = RegisterPayload & {
  confirmPassword: string;
};

const INITIAL_FORM_STATE: RegisterFormState = {
  firstName: "",
  lastName: "",
  email: "",
  username: "",
  password: "",
  confirmPassword: "",
};

export const useRegisterForm = () => {
  const [formData, setFormData] = useState<RegisterFormState>(INITIAL_FORM_STATE);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const updateField = (field: keyof RegisterFormState, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
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
      navigate("/verify-email", {
        state: {
          identifier: registerPayload.email || registerPayload.username,
          password: formData.password,
        },
      });
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, t("register.registrationFailed")),
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
    updateField,
  };
};
