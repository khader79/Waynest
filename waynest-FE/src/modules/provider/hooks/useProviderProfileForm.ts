import { Form, message } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/core/providers/AuthContext";
import { getApiErrorMessage } from "@/core/utils/errors";
import { fetchProviders, updateProvider } from "@/services/provider/provider.service";

interface ProviderProfile {
  id: string;
  displayName: string;
  slug: string;
  providerType: string;
  phone: string;
  website?: string;
  verificationStatus: string;
}

export const useProviderProfileForm = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.userId) {
        return;
      }

      try {
        setLoading(true);
        const providers = await fetchProviders();
        const userProvider = Array.isArray(providers)
          ? providers.find(
              (provider: { id?: string }) => provider.id === user.userId,
            ) ?? providers[0]
          : null;

        if (userProvider) {
          setProfile(userProvider);
          form.setFieldsValue(userProvider);
        }
      } catch {
        message.error(t("provider.profile.feedback.loadError"));
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [form, t, user?.userId]);

  const submit = async (values: Record<string, unknown>) => {
    if (!profile) {
      return;
    }

    try {
      setLoading(true);
      await updateProvider(profile.id, values);
      message.success(t("provider.profile.feedback.updateSuccess"));
      setProfile({
        ...profile,
        ...values,
      } as ProviderProfile);
    } catch (error) {
      message.error(
        getApiErrorMessage(error, t("provider.profile.feedback.updateError")),
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    loading,
    submit,
  };
};
