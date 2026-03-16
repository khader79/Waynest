import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  message,
} from "antd";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./AdminFormModal.css";

const { TextArea } = Input;

interface AdminFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => Promise<void>;
  title: string;
  initialValues?: any;
  fields: FormField[];
  loading?: boolean;
  form?: ReturnType<typeof Form.useForm>[0];
  onFieldChange?: Record<string, (value: any) => void>;
}

export type FormField = {
  name: string;
  label: string;
  type:
    | "text"
    | "email"
    | "password"
    | "number"
    | "select"
    | "textarea"
    | "date"
    | "dateRange";
  required?: boolean;
  options?: { label: string; value: any }[];
  placeholder?: string;
  min?: number;
  max?: number;
};

function AdminFormModal({
  open,
  onCancel,
  onSubmit,
  title,
  initialValues,
  fields,
  loading = false,
  form: externalForm,
  onFieldChange,
}: AdminFormModalProps) {
  const { t } = useTranslation();
  const [internalForm] = Form.useForm();
  const form = externalForm || internalForm;

  useEffect(() => {
    if (open) {
      form.resetFields();
      if (initialValues) {
        form.setFieldsValue(initialValues);
      }
    }
  }, [open, initialValues, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
      form.resetFields();
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(t("admin.common.failedToSubmit"));
    }
  };

  const renderField = (field: FormField) => {
    const handleChange = (value: any) => {
      if (onFieldChange && onFieldChange[field.name]) {
        onFieldChange[field.name](value);
      }
    };

    switch (field.type) {
      case "text":
      case "email":
      case "password":
        return (
          <Input
            type={field.type}
            placeholder={field.placeholder}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
      case "number":
        return (
          <InputNumber
            className="admin-form-modal-full-width"
            min={field.min}
            max={field.max}
            placeholder={field.placeholder}
            onChange={handleChange}
          />
        );
      case "textarea":
        return (
          <TextArea
            rows={4}
            placeholder={field.placeholder}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
      case "select":
        return (
          <Select
            placeholder={field.placeholder}
            options={field.options}
            onChange={handleChange}
          />
        );
      case "date":
        return (
          <DatePicker
            className="admin-form-modal-full-width"
            onChange={handleChange}
          />
        );
      case "dateRange":
        return (
          <DatePicker.RangePicker
            className="admin-form-modal-full-width"
            onChange={handleChange}
          />
        );
      default:
        return (
          <Input
            placeholder={field.placeholder}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      className="admin-form-modal">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="admin-form-modal-form">
        {fields.map((field) => (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            rules={[
              {
                required: field.required,
                message: `${t("admin.common.pleaseInput")} ${field.label}!`,
              },
            ]}>
            {renderField(field)}
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
}

export default AdminFormModal;
