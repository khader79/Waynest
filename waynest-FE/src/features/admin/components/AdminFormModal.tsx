import { Modal, Form, Input, Select, InputNumber, DatePicker, message } from "antd";
import { useEffect } from "react";

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
  type: "text" | "email" | "password" | "number" | "select" | "textarea" | "date" | "dateRange";
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
      message.error("Failed to submit form");
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
            style={{ width: "100%" }}
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
        return <DatePicker style={{ width: "100%" }} onChange={handleChange} />;
      case "dateRange":
        return <DatePicker.RangePicker style={{ width: "100%" }} onChange={handleChange} />;
      default:
        return <Input placeholder={field.placeholder} onChange={(e) => handleChange(e.target.value)} />;
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
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        {fields.map((field) => (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            rules={[
              {
                required: field.required,
                message: `Please input ${field.label}!`,
              },
            ]}
          >
            {renderField(field)}
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
}

export default AdminFormModal;
