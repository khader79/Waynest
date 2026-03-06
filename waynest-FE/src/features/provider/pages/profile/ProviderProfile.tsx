import { useEffect, useState } from "react";
import { Card, Form, Input, Button, message, Select } from "antd";
import { ADMIN_ENDPOINTS } from "../../../../api/endpoints";
import { get, patch } from "../../../../api/apiService";
import { useAuth } from "../../../../context/AuthContext";

interface ProviderProfile {
  id: string;
  displayName: string;
  slug: string;
  providerType: string;
  phone: string;
  website?: string;
  verificationStatus: string;
}

function ProviderProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.userId) return;
      try {
        setLoading(true);
        const providers = await get(ADMIN_ENDPOINTS.PROVIDERS_LIST);
        // Find provider associated with current user
        const userProvider = Array.isArray(providers)
          ? providers.find((p: any) => p.id === user.userId) || providers[0]
          : null;
        if (userProvider) {
          setProfile(userProvider);
          form.setFieldsValue(userProvider);
        }
      } catch (error) {
        message.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, form]);

  const handleSubmit = async (values: any) => {
    if (!profile) return;
    try {
      setLoading(true);
      await patch(ADMIN_ENDPOINTS.PROVIDERS_UPDATE(profile.id), values);
      message.success("Profile updated successfully");
      setProfile({ ...profile, ...values });
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <h1 style={{ marginBottom: "24px" }}>Provider Profile</h1>
      <Card loading={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="displayName"
            label="Display Name"
            rules={[{ required: true, message: "Please input display name!" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="slug"
            label="Slug"
            rules={[{ required: true, message: "Please input slug!" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="providerType"
            label="Provider Type"
            rules={[{ required: true, message: "Please select provider type!" }]}
          >
            <Select>
              <Select.Option value="HOTEL">Hotel</Select.Option>
              <Select.Option value="RESTAURANT">Restaurant</Select.Option>
              <Select.Option value="TOUR_PROVIDER">Tour Provider</Select.Option>
              <Select.Option value="EVENT_ORGANIZER">Event Organizer</Select.Option>
              <Select.Option value="ACTIVITY_PROVIDER">Activity Provider</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="phone"
            label="Phone"
            rules={[{ required: true, message: "Please input phone!" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="website" label="Website">
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Save Changes
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default ProviderProfile;
