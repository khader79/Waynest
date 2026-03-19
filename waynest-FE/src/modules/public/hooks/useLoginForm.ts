import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { STORAGE_KEYS } from "@/core/constants/storageKeys";
import { getApiErrorMessage } from "@/core/utils/errors";
import { getDefaultDashboardPath } from "@/core/utils/routing";
import { useAuth } from "@/core/providers/AuthContext";
import {
  loginWithCredentials,
  type LoginPayload,
} from "@/services/auth/auth.service";
import { resendEmailVerificationCode } from "@/services/auth/emailVerification.service";

export const useLoginForm = () => {
  const [formData, setFormData] = useState<LoginPayload>({
    identifier: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login } = useAuth();

  const updateField = (field: keyof LoginPayload, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      await loginWithCredentials(formData);
      const authenticatedUser = await login();

      if (authenticatedUser) {
        navigate(getDefaultDashboardPath(authenticatedUser.role));
      }
    } catch (error) {
      const apiMessage = getApiErrorMessage(error, t("login.loginFailed"));

      if (apiMessage === "Please verify your email first") {
        localStorage.setItem(
          STORAGE_KEYS.pendingLoginCredentials,
          JSON.stringify(formData),
        );

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
          state: formData,
        });
        return;
      }

      if (apiMessage === "Device not allowed") {
        setErrorMessage("هذا الجهاز غير مصرح به. تواصل مع المسؤول لإضافة جهازك.");
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
