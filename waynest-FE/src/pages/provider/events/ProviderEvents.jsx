import { useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Switch,
  Table,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import {
  createProviderEvent,
  fetchProviderEvents,
  fetchProviderPlaces,
  updateProviderEvent,
} from "@/api/provider";
import "../../providerPanel.css";

const extractRows = (payload) => {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray(payload.data)
      ? payload.data
      : [];
  return list.filter(Boolean);
};

const ProviderEvents = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const placesQuery = useQuery({
    queryKey: ["provider", "places"],
    queryFn: fetchProviderPlaces,
  });

  const eventsQuery = useQuery({
    queryKey: ["provider", "events"],
    queryFn: fetchProviderEvents,
  });

  const venueOptions = useMemo(() => {
    const rows = extractRows(placesQuery.data);
    return rows.map((p) => ({
      value: p.id,
      label: p.name,
    }));
  }, [placesQuery.data]);

  const events = extractRows(eventsQuery.data);

  const saveMutation = useMutation({
    mutationFn: async ({ id, values }) => {
      const payload = {
        title: values.title,
        description: values.description || undefined,
        venueId: values.venueId,
        startDate: values.startDate?.toISOString(),
        endDate: values.endDate?.toISOString(),
        availableTickets: values.availableTickets,
        ticketPrice: values.ticketPrice,
        currencyCode: (values.currencyCode || "ILS").toUpperCase().slice(0, 3),
        isActive: values.isActive,
      };
      if (id) {
        return updateProviderEvent(id, payload);
      }
      return createProviderEvent(payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["provider", "events"] });
      setOpen(false);
      setEditing(null);
      form.resetFields();
    },
    onError: () => {
      message.error(t("provider.events.saveError", { defaultValue: "Could not save event" }));
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({
      currencyCode: "ILS",
      isActive: true,
      availableTickets: 0,
      ticketPrice: 0,
    });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    form.setFieldsValue({
      title: row.title,
      description: row.description,
      venueId: row.venue?.id ?? row.venueId,
      startDate: row.startDate ? dayjs(row.startDate) : undefined,
      endDate: row.endDate ? dayjs(row.endDate) : undefined,
      availableTickets: row.availableTickets,
      ticketPrice: Number(row.ticketPrice),
      currencyCode: row.currencyCode || "ILS",
      isActive: row.isActive !== false,
    });
    setOpen(true);
  };

  const columns = [
    {
      title: t("provider.events.columns.title", { defaultValue: "Title" }),
      dataIndex: "title",
      key: "title",
    },
    {
      title: t("provider.events.columns.venue", { defaultValue: "Venue" }),
      key: "venue",
      render: (_, row) => row.venue?.name ?? "—",
    },
    {
      title: t("provider.events.columns.start", { defaultValue: "Starts" }),
      dataIndex: "startDate",
      key: "startDate",
      render: (d) => (d ? new Date(d).toLocaleString() : "—"),
    },
    {
      title: t("provider.events.columns.price", { defaultValue: "Price" }),
      key: "price",
      render: (_, row) =>
        `${Number(row.ticketPrice ?? 0)} ${row.currencyCode ?? ""}`.trim(),
    },
    {
      title: t("provider.events.columns.active", { defaultValue: "Active" }),
      dataIndex: "isActive",
      key: "isActive",
      render: (v) => (v ? t("provider.common.active") : t("provider.common.inactive")),
    },
    {
      title: t("provider.events.columns.actions", { defaultValue: "Actions" }),
      key: "actions",
      render: (_, row) => (
        <Button type="link" onClick={() => openEdit(row)}>
          {t("provider.events.edit", { defaultValue: "Edit" })}
        </Button>
      ),
    },
  ];

  return (
    <div className="provider-panel-page">
      <div className="provider-panel-header">
        <h1 className="provider-panel-title">
          {t("provider.events.title", { defaultValue: "Events" })}
        </h1>
        <Button type="primary" onClick={openCreate} disabled={!venueOptions.length}>
          {t("provider.events.add", { defaultValue: "New event" })}
        </Button>
      </div>
      {!venueOptions.length && !placesQuery.isLoading ? (
        <p className="provider-panel-empty provider-panel-empty-compact">
          {t("provider.events.needVenue", {
            defaultValue: "Create a place first to host events.",
          })}
        </p>
      ) : null}
      <div className="provider-panel-table-wrap">
        <Table
          rowKey="id"
          loading={eventsQuery.isLoading}
          columns={columns}
          dataSource={events}
          pagination={{ pageSize: 10 }}
        />
      </div>

      <Modal
        title={
          editing
            ? t("provider.events.modalEdit", { defaultValue: "Edit event" })
            : t("provider.events.modalCreate", { defaultValue: "Create event" })
        }
        open={open}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) =>
            saveMutation.mutate({ id: editing?.id, values })
          }
        >
          <Form.Item
            name="title"
            label={t("provider.events.fields.title", { defaultValue: "Title" })}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label={t("provider.events.fields.description", {
              defaultValue: "Description",
            })}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="venueId"
            label={t("provider.events.fields.venue", { defaultValue: "Venue (place)" })}
            rules={[{ required: true }]}
          >
            <Select options={venueOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Space size="large" wrap>
            <Form.Item
              name="startDate"
              label={t("provider.events.fields.start", { defaultValue: "Start" })}
              rules={[{ required: true }]}
            >
              <DatePicker showTime />
            </Form.Item>
            <Form.Item
              name="endDate"
              label={t("provider.events.fields.end", { defaultValue: "End" })}
              rules={[{ required: true }]}
            >
              <DatePicker showTime />
            </Form.Item>
          </Space>
          <Space size="large" wrap>
            <Form.Item
              name="availableTickets"
              label={t("provider.events.fields.tickets", {
                defaultValue: "Available tickets",
              })}
              rules={[{ required: true }]}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="ticketPrice"
              label={t("provider.events.fields.price", { defaultValue: "Ticket price" })}
              rules={[{ required: true }]}
            >
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="currencyCode"
              label={t("provider.events.fields.currency", { defaultValue: "Currency" })}
              rules={[{ required: true, len: 3 }]}
            >
              <Input maxLength={3} style={{ width: 96 }} />
            </Form.Item>
          </Space>
          <Form.Item
            name="isActive"
            label={t("provider.events.fields.active", { defaultValue: "Published" })}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
              {t("provider.events.save", { defaultValue: "Save" })}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProviderEvents;
