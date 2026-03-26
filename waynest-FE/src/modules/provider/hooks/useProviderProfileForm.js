import { Form, message } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getApiErrorMessage } from "@/core/utils/errors";
import {
  fetchProviderProfile,
  updateMyProviderProfile } from
"@/modules/provider/api";











export const useProviderProfileForm = () => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const providerPayload = await fetchProviderProfile();
        if (providerPayload && typeof providerPayload === "object") {
          const nextProfile = providerPayload;
          setProfile(nextProfile);
          form.setFieldsValue(nextProfile);
        }
      } catch {
        message.error(t("provider.profile.feedback.loadError"));
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [form, t]);

  const submit = async (values) => {
    if (!profile) {
      return;
    }

    try {
      setLoading(true);
      await updateMyProviderProfile(values);
      message.success(t("provider.profile.feedback.updateSuccess"));
      setProfile({
        ...profile,
        ...values
      });
    } catch (error) {
      message.error(
        getApiErrorMessage(error, t("provider.profile.feedback.updateError"))
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    loading,
    submit
  };
};