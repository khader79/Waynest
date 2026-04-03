import { Button, Card, Form, Input, Select, Steps } from "antd";
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

const STEP0_FIELDS = ["displayName", "description", "city"];
const STEP1_FIELDS = ["providerType", "phone", "website"];

const ProviderApplyPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

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

  const goNext = async () => {
    const fields = step === 0 ? STEP0_FIELDS : STEP1_FIELDS;
    try {
      await form.validateFields(fields);
      setStep((s) => Math.min(s + 1, 2));
    } catch {
      /* validation message shown */
    }
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const onFinish = async () => {
    const values = await form.validateFields();
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
      setSubmitted(true);
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

  if (submitted) {
    return (
      <div className="provider-panel-page provider-panel-form-shell">
        <Card className="provider-panel-form-card">
          <h1 className="provider-panel-title">{t("provider.apply.successTitle")}</h1>
          <p className="provider-panel-subtitle">{t("provider.apply.successBody")}</p>
          <Button type="primary" onClick={() => navigate("/", { replace: true })}>
            {t("provider.apply.goHome")}
          </Button>
        </Card>
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

      <Steps
        current={step}
        style={{ marginBottom: 24 }}
        items={[
          { title: t("provider.apply.steps.business") },
          { title: t("provider.apply.steps.contact") },
          { title: t("provider.apply.steps.review") },
        ]}
      />

      <Card className="provider-panel-form-card">
        <Form form={form} layout="vertical" onFinish={onFinish}>
          {step === 0 ? (
            <>
              <h2 className="provider-panel-title" style={{ fontSize: "1.15rem" }}>
                {t("provider.apply.stepBusinessTitle")}
              </h2>
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
            </>
          ) : null}

          {step === 1 ? (
            <>
              <h2 className="provider-panel-title" style={{ fontSize: "1.15rem" }}>
                {t("provider.apply.stepContactTitle")}
              </h2>
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
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h2 className="provider-panel-title" style={{ fontSize: "1.15rem" }}>
                {t("provider.apply.stepReviewTitle")}
              </h2>
              <Form.Item shouldUpdate noStyle>
                {() => {
                  const v = form.getFieldsValue(true);
                  return (
                    <ul style={{ paddingLeft: 18, margin: "0 0 16px" }}>
                      <li>
                        <strong>{t("provider.profile.fields.displayName")}:</strong>{" "}
                        {v.displayName ?? "—"}
                      </li>
                      <li>
                        <strong>{t("provider.apply.city", { defaultValue: "City" })}:</strong>{" "}
                        {v.city ?? "—"}
                      </li>
                      <li>
                        <strong>{t("provider.profile.fields.providerType")}:</strong>{" "}
                        {v.providerType ?? "—"}
                      </li>
                      <li>
                        <strong>{t("provider.profile.fields.phone")}:</strong> {v.phone ?? "—"}
                      </li>
                    </ul>
                  );
                }}
              </Form.Item>
            </>
          ) : null}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {step > 0 ? (
              <Button onClick={goBack}>{t("provider.apply.back")}</Button>
            ) : null}
            {step < 2 ? (
              <Button type="primary" onClick={goNext}>
                {t("provider.apply.next")}
              </Button>
            ) : (
              <Button type="primary" htmlType="submit" loading={loading}>
                {t("provider.apply.submit", { defaultValue: "Submit application" })}
              </Button>
            )}
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default ProviderApplyPage;
