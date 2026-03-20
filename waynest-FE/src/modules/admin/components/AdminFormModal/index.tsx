import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  message,
} from "antd";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import dayjs, { type Dayjs } from "dayjs";
import "./AdminFormModal.css";

const { TextArea } = Input;

interface AdminFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  title: string;
  initialValues?: object;
  fields: FormField[];
  loading?: boolean;
  form?: ReturnType<typeof Form.useForm>[0];
  onFieldChange?: Record<string, (value: unknown) => void>;
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
  options?: { label: string; value: string | number | boolean }[];
  placeholder?: string;
  min?: number;
  max?: number;
  multiple?: boolean;
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

  const normalizeFieldValue = (field: FormField, value: unknown) => {
    if (value === undefined || value === null) {
      return value;
    }

    if (field.type === "date" && dayjs.isDayjs(value)) {
      return (value as Dayjs).format("YYYY-MM-DD");
    }

    if (
      field.type === "dateRange" &&
      Array.isArray(value) &&
      value.every((entry) => dayjs.isDayjs(entry))
    ) {
      return (value as Dayjs[]).map((entry) => entry.format("YYYY-MM-DD"));
    }

    return value;
  };

  const normalizedInitialValues = useMemo(() => {
    if (!initialValues || typeof initialValues !== "object") {
      return undefined as Record<string, unknown> | undefined;
    }

    const nextValues = { ...(initialValues as Record<string, unknown>) };

    fields.forEach((field) => {
      const currentValue = nextValues[field.name];
      if (!currentValue) {
        return;
      }

      if (field.type === "date" && typeof currentValue === "string") {
        nextValues[field.name] = dayjs(currentValue);
      }

      if (field.type === "dateRange" && Array.isArray(currentValue)) {
        nextValues[field.name] = currentValue
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => dayjs(entry));
      }
    });

    return nextValues;
  }, [fields, initialValues]);

  useEffect(() => {
    if (open) {
      form.resetFields();
      if (normalizedInitialValues) {
        form.setFieldsValue(normalizedInitialValues);
      }
    }
  }, [form, normalizedInitialValues, open]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const normalizedValues = fields.reduce<Record<string, unknown>>((result, field) => {
        result[field.name] = normalizeFieldValue(field, values[field.name]);
        return result;
      }, {});
      await onSubmit(normalizedValues);
      form.resetFields();
    } catch (error: unknown) {
      const validationError = error as { errorFields?: unknown[] };
      if (validationError.errorFields) {
        return;
      }
      message.error(t("admin.common.failedToSubmit"));
    }
  };

  const renderField = (field: FormField) => {
    const handleChange = (value: unknown) => {
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
            mode={field.multiple ? "multiple" : undefined}
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
