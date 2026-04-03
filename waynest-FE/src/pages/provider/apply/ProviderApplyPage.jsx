import { Button, Card, Form, Input, Select } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  fetchMyProviderApplication,
  submitProviderApplication,
} from "@/api/providerApplications";
import { getApiErrorMessage } from "@/utils/errors";
import "../../providerPanel.css";

const ProviderApplyPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const row = await fetchMyProviderApplication();
        if (!active) {
          return;
        }
        if (row?.status === "PENDING") {
          toast.info(
            t("provider.apply.pendingInfo", {
              defaultValue: "Your application is pending review.",
            }),
          );
          navigate("/", { replace: true });
          return;
        }
      } catch {
        /* no application yet */
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate, t]);

  const onFinish = async (values) => {
    const payload = { ...values };
    if (!payload.website?.trim()) {
      delete payload.website;
    }
    if (!payload.description?.trim()) {
      delete payload.description;
    }
    try {
      setLoading(true);
      await submitProviderApplication(payload);
      toast.success(
        t("provider.apply.submitted", {
          defaultValue: "Application submitted. An admin will review it soon.",
        }),
      );
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("provider.apply.submitError", {
            defaultValue: "Could not submit application.",
          }),
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="provider-panel-page">
        <p>{t("common.loading", { defaultValue: "Loading…" })}</p>
      </div>
    );
  }

  return (
    <div className="provider-panel-page provider-panel-form-shell">
      <h1 className="provider-panel-title">
        {t("provider.apply.title", { defaultValue: "Become a provider" })}
      </h1>
      <p className="provider-panel-subtitle" style={{ marginBottom: 16 }}>
        {t("provider.apply.subtitle", {
          defaultValue:
            "Submit your business details. After admin approval you will get access to business tools.",
        })}
      </p>
      <Card className="provider-panel-form-card">
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="displayName"
            label={t("provider.profile.fields.displayName")}
            rules={[
              {
                required: true,
                message: t("provider.profile.validation.displayName"),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label={t("provider.apply.description", { defaultValue: "Description" })}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="city"
            label={t("provider.apply.city", { defaultValue: "City name" })}
            rules={[
              {
                required: true,
                message: t("provider.apply.cityRequired", {
                  defaultValue: "Enter your city name as registered",
                }),
              },
            ]}
          >
            <Input placeholder="e.g. Amman" />
          </Form.Item>
          <Form.Item
            name="providerType"
            label={t("provider.profile.fields.providerType")}
            rules={[
              {
                required: true,
                message: t("provider.profile.validation.providerType"),
              },
            ]}
          >
            <Select>
              <Select.Option value="HOTEL">
                {t("provider.profile.providerTypes.HOTEL")}
              </Select.Option>
              <Select.Option value="RESTAURANT">
                {t("provider.profile.providerTypes.RESTAURANT")}
              </Select.Option>
              <Select.Option value="TOUR_PROVIDER">
                {t("provider.profile.providerTypes.TOUR_PROVIDER")}
              </Select.Option>
              <Select.Option value="EVENT_ORGANIZER">
                {t("provider.profile.providerTypes.EVENT_ORGANIZER")}
              </Select.Option>
              <Select.Option value="ACTIVITY_PROVIDER">
                {t("provider.profile.providerTypes.ACTIVITY_PROVIDER")}
              </Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="phone"
            label={t("provider.profile.fields.phone")}
            rules={[
              {
                required: true,
                message: t("provider.profile.validation.phone"),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="website" label={t("provider.profile.fields.website")}>
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t("provider.apply.submit", { defaultValue: "Submit application" })}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ProviderApplyPage;
