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
import dayjs from "dayjs";
import "./AdminFormModal.css";

const { TextArea } = Input;

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
}) {
  const { t } = useTranslation();
  const [internalForm] = Form.useForm();
  const form = externalForm || internalForm;

  const normalizeFieldValue = (field, value) => {
    if (value === undefined || value === null) {
      return value;
    }

    if (field.type === "date" && dayjs.isDayjs(value)) {
      return value.format("YYYY-MM-DD");
    }

    if (
      field.type === "dateRange" &&
      Array.isArray(value) &&
      value.every((entry) => dayjs.isDayjs(entry))
    ) {
      return value.map((entry) => entry.format("YYYY-MM-DD"));
    }

    return value;
  };

  const normalizedInitialValues = useMemo(() => {
    if (!initialValues || typeof initialValues !== "object") {
      return undefined;
    }

    const nextValues = { ...initialValues };

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
          .filter((entry) => typeof entry === "string")
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
      const normalizedValues = fields.reduce((result, field) => {
        result[field.name] = normalizeFieldValue(field, values[field.name]);
        return result;
      }, {});
      await onSubmit(normalizedValues);
      form.resetFields();
    } catch (error) {
      const validationError = error;
      if (validationError.errorFields) {
        return;
      }
      message.error(t("admin.common.failedToSubmit"));
    }
  };

  const renderField = (field) => {
    const handleChange = (value) => {
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
      className="admin-form-modal"
    >
      <Form form={form} layout="vertical" className="admin-form-modal-form">
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
