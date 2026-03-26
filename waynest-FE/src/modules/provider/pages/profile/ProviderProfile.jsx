import { Button, Card, Form, Input, Select } from "antd";
import { useTranslation } from "react-i18next";
import { useProviderProfileForm } from "../../hooks/useProviderProfileForm";
import "../../providerPanel.css";

function ProviderProfile() {
  const { t } = useTranslation();
  const { form, loading, submit } = useProviderProfileForm();

  return (
    <div className="provider-panel-page provider-panel-form-shell">
      <h1 className="provider-panel-title">{t("provider.profile.title")}</h1>
      <Card loading={loading} className="provider-panel-form-card">
        <Form form={form} layout="vertical" onFinish={submit}>
          <Form.Item
            name="displayName"
            label={t("provider.profile.fields.displayName")}
            rules={[
            {
              required: true,
              message: t("provider.profile.validation.displayName")
            }]
            }>
            <Input />
          </Form.Item>
          <Form.Item
            name="slug"
            label={t("provider.profile.fields.slug")}
            rules={[
            { required: true, message: t("provider.profile.validation.slug") }]
            }>
            <Input />
          </Form.Item>
          <Form.Item
            name="providerType"
            label={t("provider.profile.fields.providerType")}
            rules={[
            {
              required: true,
              message: t("provider.profile.validation.providerType")
            }]
            }>
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
            { required: true, message: t("provider.profile.validation.phone") }]
            }>
            <Input />
          </Form.Item>
          <Form.Item name="website" label={t("provider.profile.fields.website")}>
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t("provider.profile.actions.save")}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>);

}

export default ProviderProfile;