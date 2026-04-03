import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Switch,
  Table,
  Image,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  createProviderPlace,
  fetchProviderPlaces,
  updateProviderPlace,
} from "@/api/provider";
import { searchCities } from "@/api/catalog";
import "../../providerPanel.css";

const PLACE_TYPES = [
  "HOTEL",
  "RESTAURANT",
  "ACTIVITY",
  "TOUR",
  "LANDMARK",
  "CAFE",
  "PARK",
  "SHOP",
];

const extractRows = (payload) => {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray(payload.data)
      ? payload.data
      : [];
  return list.filter(Boolean);
};

const extractCities = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
};

const cityLabel = (c) => {
  const name = typeof c?.name === "string" ? c.name : "";
  const countryName =
    typeof c?.country?.name === "string"
      ? c.country.name
      : typeof c?.countryName === "string"
        ? c.countryName
        : "";
  if (name && countryName) {
    return `${name}, ${countryName}`;
  }
  return name || countryName || String(c?.id ?? "");
};

const ProviderPlaces = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [citySearchInput, setCitySearchInput] = useState("");
  const [debouncedCitySearch, setDebouncedCitySearch] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedCitySearch(citySearchInput), 300);
    return () => clearTimeout(id);
  }, [citySearchInput]);

  const citiesQuery = useQuery({
    queryKey: ["catalog", "cities", "select", debouncedCitySearch],
    queryFn: () => searchCities(debouncedCitySearch, 1, 120),
    enabled: open,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const placesQuery = useQuery({
    queryKey: ["provider", "places"],
    queryFn: fetchProviderPlaces,
  });

  const cityOptions = useMemo(() => {
    const rows = extractCities(citiesQuery.data);
    const opts = rows
      .filter((c) => c && typeof c.id === "string")
      .map((c) => ({
        value: c.id,
        label: cityLabel(c),
      }));
    if (editing?.city?.id && !opts.some((o) => o.value === editing.city.id)) {
      opts.unshift({
        value: editing.city.id,
        label: cityLabel(editing.city),
      });
    }
    return opts;
  }, [citiesQuery.data, editing]);

  const places = extractRows(placesQuery.data);

  const saveMutation = useMutation({
    mutationFn: async ({ id, values }) => {
      const payload = {
        name: values.name,
        description: values.description,
        type: values.type,
        latitude: Number(values.latitude),
        longitude: Number(values.longitude),
        cityId: values.cityId,
        isActive: values.isActive,
      };
      if (values.slug?.trim()) {
        payload.slug = values.slug.trim();
      }
      if (id) {
        return updateProviderPlace(id, payload);
      }
      return createProviderPlace(payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["provider", "places"] });
      setOpen(false);
      setEditing(null);
      setCitySearchInput("");
      setDebouncedCitySearch("");
      form.resetFields();
    },
    onError: () => {
      message.error(t("provider.places.saveError", { defaultValue: "Could not save place" }));
    },
  });

  const openCreate = () => {
    setEditing(null);
    setCitySearchInput("");
    setDebouncedCitySearch("");
    form.setFieldsValue({
      isActive: true,
      type: "RESTAURANT",
    });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    const cityName = row.city?.name ?? "";
    setCitySearchInput(cityName);
    setDebouncedCitySearch(cityName);
    form.setFieldsValue({
      name: row.name,
      description: row.description,
      type: row.type,
      latitude: row.latitude != null ? Number(row.latitude) : undefined,
      longitude: row.longitude != null ? Number(row.longitude) : undefined,
      cityId: row.city?.id ?? row.cityId,
      isActive: row.isActive !== false,
      slug: row.slug,
    });
    setOpen(true);
  };

  const columns = [
    {
      title: t("provider.places.table.image", { defaultValue: "" }),
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 72,
      render: (url) =>
        url ? (
          <Image src={url} alt="" width={56} height={56} style={{ objectFit: "cover" }} />
        ) : (
          <div className="provider-panel-place-image-placeholder" style={{ width: 56, height: 56 }} />
        ),
    },
    {
      title: t("provider.places.table.name", { defaultValue: "Name" }),
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("provider.places.table.type", { defaultValue: "Type" }),
      dataIndex: "type",
      key: "type",
    },
    {
      title: t("provider.places.table.city", { defaultValue: "City" }),
      key: "city",
      render: (_, row) => row.city?.name ?? "—",
    },
    {
      title: t("provider.places.table.rating", { defaultValue: "Rating" }),
      dataIndex: "ratingAverage",
      key: "ratingAverage",
      render: (v) => (v != null ? Number(v).toFixed(1) : "—"),
    },
    {
      title: t("provider.places.table.active", { defaultValue: "Status" }),
      dataIndex: "isActive",
      key: "isActive",
      render: (v) => (v ? t("provider.common.active") : t("provider.common.inactive")),
    },
    {
      title: t("provider.places.table.actions", { defaultValue: "Actions" }),
      key: "actions",
      render: (_, row) => (
        <Button type="link" onClick={() => openEdit(row)}>
          {t("provider.places.edit", { defaultValue: "Edit" })}
        </Button>
      ),
    },
  ];

  return (
    <div className="provider-panel-page">
      <div className="provider-panel-header">
        <h1 className="provider-panel-title">{t("provider.places.title")}</h1>
        <Button type="primary" onClick={openCreate}>
          {t("provider.places.add", { defaultValue: "Add place" })}
        </Button>
      </div>

      <div className="provider-panel-table-wrap">
        <Table
          rowKey="id"
          loading={placesQuery.isLoading}
          columns={columns}
          dataSource={places}
          pagination={{ pageSize: 10 }}
        />
      </div>

      <Modal
        title={
          editing
            ? t("provider.places.modalEdit", { defaultValue: "Edit place" })
            : t("provider.places.modalCreate", { defaultValue: "Add place" })
        }
        open={open}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          setCitySearchInput("");
          setDebouncedCitySearch("");
          form.resetFields();
        }}
        footer={null}
        destroyOnHidden
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => saveMutation.mutate({ id: editing?.id, values })}
        >
          <Form.Item
            name="name"
            label={t("provider.places.fields.name", { defaultValue: "Name" })}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label={t("provider.places.fields.description", { defaultValue: "Description" })}
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="type"
            label={t("provider.places.fields.type", { defaultValue: "Type" })}
            rules={[{ required: true }]}
          >
            <Select
              options={PLACE_TYPES.map((x) => ({
                value: x,
                label: x,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="cityId"
            label={t("provider.places.fields.city", { defaultValue: "City" })}
            rules={[{ required: true }]}
            extra={
              !citiesQuery.isFetching &&
              !citiesQuery.isError &&
              cityOptions.length === 0
                ? t("provider.places.citiesEmptyHint", {
                    defaultValue:
                      "No cities in the database yet. Ask an admin to run seed or import cities.",
                  })
                : null
            }
          >
            <Select
              showSearch
              allowClear
              placeholder={t("provider.places.cityPlaceholder", {
                defaultValue: "Type to search cities…",
              })}
              filterOption={false}
              onSearch={setCitySearchInput}
              onClear={() => setCitySearchInput("")}
              options={cityOptions}
              loading={citiesQuery.isFetching}
              notFoundContent={
                citiesQuery.isFetching
                  ? t("common.loading", { defaultValue: "Loading…" })
                  : citiesQuery.isError
                    ? t("provider.places.citiesLoadFailed", {
                        defaultValue: "Failed to load",
                      })
                    : t("provider.places.noCities", { defaultValue: "No cities" })
              }
            />
          </Form.Item>
          <Form.Item
            name="latitude"
            label={t("provider.places.fields.latitude", { defaultValue: "Latitude" })}
            rules={[{ required: true }]}
          >
            <InputNumber step={0.000001} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="longitude"
            label={t("provider.places.fields.longitude", { defaultValue: "Longitude" })}
            rules={[{ required: true }]}
          >
            <InputNumber step={0.000001} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="slug" label={t("provider.places.fields.slug", { defaultValue: "Slug (optional)" })}>
            <Input />
          </Form.Item>
          <Form.Item
            name="isActive"
            label={t("provider.places.fields.active", { defaultValue: "Active" })}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
              {t("provider.places.save", { defaultValue: "Save" })}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProviderPlaces;
