import { useEffect, useMemo, useRef, useState } from "react";
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
  Tabs,
  TimePicker,
  Upload,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/context/CurrencyContext";
import dayjs from "dayjs";
import {
  createProviderPlace,
  fetchProviderPlaces,
  updateProviderPlace,
  requestProviderPlaceVerification,
} from "@/api/provider";
import { get } from "@/api/request";
import { searchCities } from "@/api/catalog";
import { uploadImage } from "@/services/social/social.service";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import {
  getResolvedPlaceImageUrl,
  pickPlaceImageField,
} from "@/utils/placeImage";
import "../../providerPanel.css";
import "./ProviderPlaces.css";

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

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "ILS", "JOD", "AED", "SAR"].map(
  (c) => ({
    value: c,
    label: c,
  }),
);

const GEO_LOCATION_MESSAGE_KEY = "provider-places-geo";

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

const defaultOpeningHoursForm = () =>
  [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    closed: true,
    openTime: dayjs("09:00", "HH:mm"),
    closeTime: dayjs("17:00", "HH:mm"),
  }));

const parseTimeToDayjs = (raw) => {
  if (!raw || typeof raw !== "string") {
    return dayjs("09:00", "HH:mm");
  }
  const short = raw.length >= 5 ? raw.slice(0, 5) : raw;
  const d = dayjs(short, "HH:mm");
  return d.isValid() ? d : dayjs("09:00", "HH:mm");
};

const buildOpeningHoursFromServer = (serverRows) => {
  const byDay = new Map((serverRows || []).map((r) => [r.dayOfWeek, r]));
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
    const r = byDay.get(dayOfWeek);
    if (!r) {
      return {
        dayOfWeek,
        closed: true,
        openTime: dayjs("09:00", "HH:mm"),
        closeTime: dayjs("17:00", "HH:mm"),
      };
    }
    return {
      dayOfWeek,
      closed: false,
      openTime: parseTimeToDayjs(r.openTime),
      closeTime: parseTimeToDayjs(r.closeTime),
    };
  });
};

const mapPricingsFromServer = (rows) => {
  if (!rows?.length) {
    return [
      {
        basePrice: 0,
        currencyCode: "USD",
        perPerson: false,
        maxPeople: undefined,
        validFrom: undefined,
        validTo: undefined,
      },
    ];
  }
  return rows.map((r) => ({
    basePrice: r.basePrice != null ? Number(r.basePrice) : 0,
    currencyCode: typeof r.currencyCode === "string" ? r.currencyCode : "USD",
    perPerson: Boolean(r.perPerson),
    maxPeople: r.maxPeople != null ? Number(r.maxPeople) : undefined,
    validFrom: r.validFrom ? dayjs(r.validFrom) : undefined,
    validTo: r.validTo ? dayjs(r.validTo) : undefined,
  }));
};

const ProviderPlaces = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [citySearchInput, setCitySearchInput] = useState("");
  const [debouncedCitySearch, setDebouncedCitySearch] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const geoRequestInFlightRef = useRef(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [failedTableImagesById, setFailedTableImagesById] = useState({});

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

  const tagsQuery = useQuery({
    queryKey: ["tags", "public-list"],
    queryFn: () => get("/tag"),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const placesQuery = useQuery({
    queryKey: ["provider", "places"],
    queryFn: fetchProviderPlaces,
  });

  useEffect(() => {
    setFailedTableImagesById({});
  }, [placesQuery.data]);

  const tagOptions = useMemo(() => {
    const raw = tagsQuery.data;
    const list = Array.isArray(raw) ? raw : raw?.data;
    if (!Array.isArray(list)) {
      return [];
    }
    return list
      .filter((x) => x && typeof x.id === "string")
      .map((x) => ({ value: x.id, label: x.name ?? x.id }));
  }, [tagsQuery.data]);

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

  // get currencies from global context (fetched from API)
  const { currencies } = useCurrency();

  const currencyOptions = useMemo(() => {
    if (Array.isArray(currencies) && currencies.length > 0) {
      return currencies.filter(Boolean).map((c) => {
        const code = c.code ?? c.iso ?? c.id ?? String(c);
        const label = c.code
          ? `${c.code}${c.name ? ` — ${c.name}` : ""}`
          : code;
        return { value: code, label };
      });
    }
    return CURRENCY_OPTIONS;
  }, [currencies]);

  const places = extractRows(placesQuery.data);

  const dayLabels = useMemo(
    () => [
      t("provider.places.days.sun", { defaultValue: "Sun" }),
      t("provider.places.days.mon", { defaultValue: "Mon" }),
      t("provider.places.days.tue", { defaultValue: "Tue" }),
      t("provider.places.days.wed", { defaultValue: "Wed" }),
      t("provider.places.days.thu", { defaultValue: "Thu" }),
      t("provider.places.days.fri", { defaultValue: "Fri" }),
      t("provider.places.days.sat", { defaultValue: "Sat" }),
    ],
    [t],
  );

  const applyCoordsFromCityId = (cityId) => {
    if (!cityId) return;
    const rows = extractCities(citiesQuery.data);
    let c = rows.find((x) => x.id === cityId);
    if (!c && editing?.city?.id === cityId) {
      c = editing.city;
    }
    if (!c) return;
    const lat = c.latitude != null ? Number(c.latitude) : NaN;
    const lng = c.longitude != null ? Number(c.longitude) : NaN;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      form.setFieldsValue({ latitude: lat, longitude: lng });
    }
  };

  const fillCoordsFromDeviceLocation = () => {
    if (geoRequestInFlightRef.current) {
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      message.error({
        key: GEO_LOCATION_MESSAGE_KEY,
        content: t("provider.places.geoNotSupported", {
          defaultValue: "Location is not available in this browser.",
        }),
      });
      return;
    }

    geoRequestInFlightRef.current = true;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        geoRequestInFlightRef.current = false;
        setGeoLoading(false);
        form.setFieldsValue({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        message.success({
          key: GEO_LOCATION_MESSAGE_KEY,
          content: t("provider.places.geoFilled", {
            defaultValue: "Coordinates updated from your location.",
          }),
        });
      },
      () => {
        geoRequestInFlightRef.current = false;
        setGeoLoading(false);
        message.error({
          key: GEO_LOCATION_MESSAGE_KEY,
          content: t("provider.places.geoDenied", {
            defaultValue:
              "Could not read your location. Check browser permissions.",
          }),
        });
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
    );
  };

  const buildPayload = (values, placeId) => {
    const openingPayload = (values.openingHours || [])
      .filter((row) => row && !row.closed)
      .map((row) => ({
        dayOfWeek: row.dayOfWeek,
        openTime: row.openTime.format("HH:mm"),
        closeTime: row.closeTime.format("HH:mm"),
      }));

    const pricingPayload = (values.pricings || [])
      .filter((row) => row && row.currencyCode && row.basePrice != null)
      .map((row) => ({
        basePrice: Number(row.basePrice),
        currencyCode: String(row.currencyCode).trim().toUpperCase().slice(0, 3),
        perPerson: Boolean(row.perPerson),
        maxPeople: row.maxPeople != null ? Number(row.maxPeople) : undefined,
        validFrom: row.validFrom ? row.validFrom.toISOString() : undefined,
        validTo: row.validTo ? row.validTo.toISOString() : undefined,
      }));

    const payload = {
      name: values.name,
      description: values.description,
      type: values.type,
      latitude: Number(values.latitude),
      longitude: Number(values.longitude),
      cityId: values.cityId,
      isActive: values.isActive,
      tagIds: Array.isArray(values.tagIds) ? values.tagIds : undefined,
      imageUrl: values.imageUrl?.trim() || undefined,
      openingHours: openingPayload,
      pricings: pricingPayload,
    };

    if (values.slug?.trim()) {
      payload.slug = values.slug.trim();
    }

    return placeId
      ? updateProviderPlace(placeId, payload)
      : createProviderPlace(payload);
  };

  const saveMutation = useMutation({
    mutationFn: async ({ id, values }) => buildPayload(values, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["provider", "places"] });
      setOpen(false);
      setEditing(null);
      setCitySearchInput("");
      setDebouncedCitySearch("");
      form.resetFields();
    },
    onError: () => {
      message.error(
        t("provider.places.saveError", {
          defaultValue: "Could not save place",
        }),
      );
    },
  });

  const requestVerificationMutation = useMutation({
    mutationFn: async ({ id }) => requestProviderPlaceVerification(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["provider", "places"] });
      message.success(
        t("provider.places.verificationRequested", {
          defaultValue: "Verification request sent",
        }),
      );
    },
    onError: () => {
      message.error(
        t("provider.places.verificationRequestFailed", {
          defaultValue: "Could not send verification request",
        }),
      );
    },
  });

  const openCreate = () => {
    setEditing(null);
    setCitySearchInput("");
    setDebouncedCitySearch("");
    form.setFieldsValue({
      isActive: true,
      type: "RESTAURANT",
      openingHours: defaultOpeningHoursForm(),
      pricings: [
        {
          basePrice: 0,
          currencyCode: "USD",
          perPerson: false,
        },
      ],
      tagIds: [],
    });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    const cityName = row.city?.name ?? "";
    setCitySearchInput(cityName);
    setDebouncedCitySearch(cityName);
    const latFromPlace = row.latitude != null ? Number(row.latitude) : NaN;
    const lngFromPlace = row.longitude != null ? Number(row.longitude) : NaN;
    const latFromCity =
      row.city?.latitude != null ? Number(row.city.latitude) : NaN;
    const lngFromCity =
      row.city?.longitude != null ? Number(row.city.longitude) : NaN;
    form.setFieldsValue({
      name: row.name,
      description: row.description,
      type: row.type,
      latitude: Number.isFinite(latFromPlace)
        ? latFromPlace
        : Number.isFinite(latFromCity)
          ? latFromCity
          : undefined,
      longitude: Number.isFinite(lngFromPlace)
        ? lngFromPlace
        : Number.isFinite(lngFromCity)
          ? lngFromCity
          : undefined,
      cityId: row.city?.id ?? row.cityId,
      isActive: row.isActive !== false,
      slug: row.slug,
      imageUrl: pickPlaceImageField(row) || undefined,
      tagIds: Array.isArray(row.tags) ? row.tags.map((x) => x.id) : [],
      openingHours: buildOpeningHoursFromServer(row.openingHours),
      pricings: mapPricingsFromServer(row.pricings),
    });
    setOpen(true);
  };

  const handleCoverUpload = async (file) => {
    try {
      setCoverUploading(true);
      const { path } = await uploadImage(file);
      form.setFieldValue("imageUrl", path);
      message.success(
        t("provider.places.coverUploaded", {
          defaultValue: "Cover image uploaded",
        }),
      );
    } catch {
      message.error(
        t("provider.places.coverUploadError", {
          defaultValue: "Upload failed",
        }),
      );
    } finally {
      setCoverUploading(false);
    }
    return false;
  };

  const columns = [
    {
      title: t("provider.places.table.image", { defaultValue: "" }),
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 76,
      render: (_, row) => {
        const resolvedImageUrl = getResolvedPlaceImageUrl(row);
        const showImage =
          Boolean(resolvedImageUrl) && failedTableImagesById[row.id] !== true;

        return showImage ? (
          <img
            src={resolvedImageUrl}
            alt=""
            width={56}
            height={56}
            style={{ objectFit: "cover", borderRadius: 10 }}
            onError={() =>
              setFailedTableImagesById((current) => ({
                ...current,
                [row.id]: true,
              }))
            }
          />
        ) : (
          <div
            className="provider-panel-place-image-placeholder"
            aria-label={row.name}
            style={{ width: 56, height: 56 }}>
            {row.name}
          </div>
        );
      },
    },
    {
      title: t("provider.places.table.name", { defaultValue: "Name" }),
      dataIndex: "name",
      key: "name",
      render: (name, row) => (
        <div className="provider-place-name-cell">
          <span>{name}</span>
          {row.isVerified ? (
            <span
              className="provider-verified-badge"
              title={t("provider.places.verified", {
                defaultValue: "Verified",
              })}>
              {t("provider.places.verifiedShort", { defaultValue: "Verified" })}
            </span>
          ) : row.verificationRequested ? (
            <span
              className="provider-verify-requested-badge"
              title={t("provider.places.requested", {
                defaultValue: "Requested",
              })}>
              {t("provider.places.requestedShort", {
                defaultValue: "Requested",
              })}
            </span>
          ) : null}
        </div>
      ),
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
      title: t("provider.places.table.verified", { defaultValue: "Verified" }),
      dataIndex: "isVerified",
      key: "isVerified",
      width: 96,
      render: (v) =>
        v
          ? t("provider.places.yes", { defaultValue: "Yes" })
          : t("provider.places.no", { defaultValue: "No" }),
    },
    {
      title: t("provider.places.table.active", { defaultValue: "Status" }),
      dataIndex: "isActive",
      key: "isActive",
      render: (v) =>
        v ? t("provider.common.active") : t("provider.common.inactive"),
    },
    {
      title: t("provider.places.table.actions", { defaultValue: "Actions" }),
      key: "actions",
      render: (_, row) => (
        <Space>
          <Button type="link" onClick={() => openEdit(row)}>
            {t("provider.places.edit", { defaultValue: "Edit" })}
          </Button>
          {!row.isVerified && !row.verificationRequested ? (
            <Button
              type="link"
              onClick={() =>
                Modal.confirm({
                  title: t("provider.places.requestVerificationConfirmTitle", {
                    defaultValue: "Request verification",
                  }),
                  content: t(
                    "provider.places.requestVerificationConfirmContent",
                    {
                      defaultValue: "Send a verification request to the admin?",
                    },
                  ),
                  onOk: () =>
                    requestVerificationMutation.mutate({ id: row.id }),
                })
              }>
              {t("provider.places.requestVerification", {
                defaultValue: "Request verification",
              })}
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  const modalTheme = {
    token: {
      colorBgContainer: "var(--panel-surface-strong)",
      colorBgElevated: "var(--panel-surface-strong)",
      colorBorder: "var(--panel-border-strong)",
      colorBorderSecondary: "var(--panel-border)",
      colorText: "var(--color-text-primary)",
      colorTextSecondary: "var(--color-text-secondary)",
      colorPrimary: "var(--color-primary)",
    },
  };

  const coverPreview = Form.useWatch("imageUrl", form);

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
          scroll={{ x: true }}
        />
      </div>

      <Modal
        className="provider-places-modal"
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
        width={720}>
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(changed) => {
            if (Object.prototype.hasOwnProperty.call(changed, "cityId")) {
              applyCoordsFromCityId(changed.cityId);
            }
          }}
          onFinish={(values) =>
            saveMutation.mutate({ id: editing?.id, values })
          }>
          <Tabs
            defaultActiveKey="basic"
            items={[
              {
                key: "basic",
                label: t("provider.places.tabBasic", {
                  defaultValue: "Basic",
                }),
                children: (
                  <div className="provider-places-tab-inner">
                    {editing ? (
                      <div className="provider-places-readonly-metrics">
                        <span>
                          {t("provider.places.ratingAvg", {
                            defaultValue: "Avg rating",
                          })}
                          :{" "}
                          {editing.ratingAverage != null
                            ? Number(editing.ratingAverage).toFixed(1)
                            : "—"}
                        </span>
                        <span>
                          {t("provider.places.ratingCount", {
                            defaultValue: "Reviews",
                          })}
                          : {editing.ratingCount ?? 0}
                        </span>
                        <span>
                          {t("provider.places.verifiedLabel", {
                            defaultValue: "Verified",
                          })}
                          :{" "}
                          {editing.isVerified
                            ? t("provider.places.yes", {
                                defaultValue: "Yes",
                              })
                            : t("provider.places.no", { defaultValue: "No" })}
                        </span>
                      </div>
                    ) : null}

                    <Form.Item
                      name="name"
                      label={t("provider.places.fields.name", {
                        defaultValue: "Name",
                      })}
                      rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item
                      name="description"
                      label={t("provider.places.fields.description", {
                        defaultValue: "Description",
                      })}
                      rules={[{ required: true }]}>
                      <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item
                      name="type"
                      label={t("provider.places.fields.type", {
                        defaultValue: "Type",
                      })}
                      rules={[{ required: true }]}>
                      <Select
                        options={PLACE_TYPES.map((x) => ({
                          value: x,
                          label: x,
                        }))}
                      />
                    </Form.Item>

                    <Form.Item
                      label={t("provider.places.fields.cover", {
                        defaultValue: "Cover image",
                      })}>
                      <Space wrap>
                        <Upload
                          accept="image/*"
                          showUploadList={false}
                          beforeUpload={handleCoverUpload}>
                          <Button loading={coverUploading}>
                            {t("provider.places.uploadCover", {
                              defaultValue: "Upload image",
                            })}
                          </Button>
                        </Upload>
                        <Button
                          type="link"
                          onClick={() =>
                            form.setFieldValue("imageUrl", undefined)
                          }>
                          {t("provider.places.clearCover", {
                            defaultValue: "Remove",
                          })}
                        </Button>
                      </Space>
                      <Form.Item name="imageUrl" hidden>
                        <Input />
                      </Form.Item>
                      {coverPreview ? (
                        <img
                          className="provider-places-cover-preview"
                          src={resolveMediaUrl(coverPreview)}
                          alt=""
                        />
                      ) : null}
                    </Form.Item>

                    <Form.Item
                      name="cityId"
                      label={t("provider.places.fields.city", {
                        defaultValue: "City",
                      })}
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
                      }>
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
                            ? t("common.loading", {
                                defaultValue: "Loading…",
                              })
                            : citiesQuery.isError
                              ? t("provider.places.citiesLoadFailed", {
                                  defaultValue: "Failed to load",
                                })
                              : t("provider.places.noCities", {
                                  defaultValue: "No cities",
                                })
                        }
                      />
                    </Form.Item>

                    <div className="provider-places-coords-row">
                      <Form.Item
                        name="latitude"
                        className="provider-places-coords-field"
                        label={t("provider.places.fields.latitude", {
                          defaultValue: "Latitude",
                        })}
                        rules={[{ required: true }]}>
                        <InputNumber
                          step={0.000001}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <Form.Item
                        name="longitude"
                        className="provider-places-coords-field"
                        label={t("provider.places.fields.longitude", {
                          defaultValue: "Longitude",
                        })}
                        rules={[{ required: true }]}>
                        <InputNumber
                          step={0.000001}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                      <div className="provider-places-coords-action">
                        <span className="provider-places-coords-action-label">
                          {t("provider.places.location", {
                            defaultValue: "Location",
                          })}
                        </span>
                        <Button
                          type="default"
                          loading={geoLoading}
                          onClick={fillCoordsFromDeviceLocation}>
                          {t("provider.places.useMyLocation", {
                            defaultValue: "Use my location",
                          })}
                        </Button>
                      </div>
                    </div>
                    <p className="provider-places-coords-hint">
                      {t("provider.places.coordsHint", {
                        defaultValue:
                          "Choosing a city fills coordinates when available. You can refine with GPS or edit manually.",
                      })}
                    </p>

                    <Form.Item
                      name="slug"
                      label={t("provider.places.fields.slug", {
                        defaultValue: "Slug (optional)",
                      })}>
                      <Input />
                    </Form.Item>

                    <Form.Item
                      name="tagIds"
                      label={t("provider.places.fields.tags", {
                        defaultValue: "Tags",
                      })}>
                      <Select
                        mode="multiple"
                        allowClear
                        options={tagOptions}
                        placeholder="—"
                      />
                    </Form.Item>

                    <Form.Item
                      name="isActive"
                      label={t("provider.places.fields.active", {
                        defaultValue: "Active",
                      })}
                      valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </div>
                ),
              },
              {
                key: "hours",
                label: t("provider.places.tabHours", {
                  defaultValue: "Opening hours",
                }),
                children: (
                  <div className="provider-places-tab-inner">
                    <p className="provider-places-muted">
                      {t("provider.places.hoursHint", {
                        defaultValue:
                          "Toggle days open and set times (24h). Closed days are not saved.",
                      })}
                    </p>
                    <div className="provider-places-day-grid">
                      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="provider-places-pricing-card">
                          <div className="provider-places-day-row">
                            <span className="provider-places-day-name">
                              {dayLabels[i]}
                            </span>
                            <Form.Item
                              name={["openingHours", i, "closed"]}
                              valuePropName="checked"
                              label={null}
                              style={{ marginBottom: 0 }}>
                              <Switch
                                checkedChildren={t("provider.places.closed", {
                                  defaultValue: "Off",
                                })}
                                unCheckedChildren={t("provider.places.open", {
                                  defaultValue: "Open",
                                })}
                              />
                            </Form.Item>
                            <Form.Item
                              noStyle
                              dependencies={[["openingHours", i, "closed"]]}>
                              {() => {
                                const closed = form.getFieldValue([
                                  "openingHours",
                                  i,
                                  "closed",
                                ]);
                                return (
                                  <Form.Item
                                    name={["openingHours", i, "openTime"]}
                                    style={{ marginBottom: 0 }}
                                    rules={
                                      closed
                                        ? []
                                        : [
                                            {
                                              required: true,
                                              message: t("common.required"),
                                            },
                                          ]
                                    }>
                                    <TimePicker
                                      format="HH:mm"
                                      minuteStep={15}
                                      disabled={closed}
                                    />
                                  </Form.Item>
                                );
                              }}
                            </Form.Item>
                            <Form.Item
                              noStyle
                              dependencies={[["openingHours", i, "closed"]]}>
                              {() => {
                                const closed = form.getFieldValue([
                                  "openingHours",
                                  i,
                                  "closed",
                                ]);
                                return (
                                  <Form.Item
                                    name={["openingHours", i, "closeTime"]}
                                    style={{ marginBottom: 0 }}
                                    rules={
                                      closed
                                        ? []
                                        : [
                                            {
                                              required: true,
                                              message: t("common.required"),
                                            },
                                          ]
                                    }>
                                    <TimePicker
                                      format="HH:mm"
                                      minuteStep={15}
                                      disabled={closed}
                                    />
                                  </Form.Item>
                                );
                              }}
                            </Form.Item>
                            <Form.Item
                              name={["openingHours", i, "dayOfWeek"]}
                              hidden>
                              <Input />
                            </Form.Item>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                key: "pricing",
                label: t("provider.places.tabPricing", {
                  defaultValue: "Pricing",
                }),
                children: (
                  <div className="provider-places-tab-inner">
                    <p className="provider-places-muted">
                      {t("provider.places.pricingHint", {
                        defaultValue:
                          "Add one or more price rows (currency, optional per-person, validity window).",
                      })}
                    </p>
                    <Form.List name="pricings">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map((field) => (
                            <div
                              key={field.key}
                              className="provider-places-pricing-card">
                              <Space
                                wrap
                                style={{ width: "100%" }}
                                align="start">
                                <Form.Item
                                  label={t("provider.places.price", {
                                    defaultValue: "Price",
                                  })}
                                  name={[field.name, "basePrice"]}
                                  rules={[{ required: true }]}>
                                  <InputNumber
                                    min={0}
                                    step={0.01}
                                    style={{ minWidth: 120 }}
                                  />
                                </Form.Item>
                                <Form.Item
                                  label={t("provider.places.currency", {
                                    defaultValue: "Currency",
                                  })}
                                  name={[field.name, "currencyCode"]}
                                  rules={[{ required: true }]}>
                                  <Select
                                    options={currencyOptions}
                                    style={{ width: 100 }}
                                  />
                                </Form.Item>
                                <Form.Item
                                  label={t("provider.places.perPerson", {
                                    defaultValue: "Per person",
                                  })}
                                  name={[field.name, "perPerson"]}
                                  valuePropName="checked">
                                  <Switch />
                                </Form.Item>
                                <Form.Item
                                  label={t("provider.places.maxPeople", {
                                    defaultValue: "Max people",
                                  })}
                                  name={[field.name, "maxPeople"]}>
                                  <InputNumber min={1} style={{ width: 100 }} />
                                </Form.Item>
                                <Form.Item
                                  label={t("provider.places.validFrom", {
                                    defaultValue: "Valid from",
                                  })}
                                  name={[field.name, "validFrom"]}>
                                  <DatePicker
                                    showTime
                                    style={{ minWidth: 180 }}
                                  />
                                </Form.Item>
                                <Form.Item
                                  label={t("provider.places.validTo", {
                                    defaultValue: "Valid to",
                                  })}
                                  name={[field.name, "validTo"]}>
                                  <DatePicker
                                    showTime
                                    style={{ minWidth: 180 }}
                                  />
                                </Form.Item>
                                <Button
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => remove(field.name)}>
                                  {t("common.remove", {
                                    defaultValue: "Remove",
                                  })}
                                </Button>
                              </Space>
                            </div>
                          ))}
                          <Button
                            type="dashed"
                            onClick={() =>
                              add({
                                basePrice: 0,
                                currencyCode:
                                  currencyOptions[0]?.value ?? "USD",
                                perPerson: false,
                              })
                            }
                            block
                            icon={<PlusOutlined />}>
                            {t("provider.places.addPriceRow", {
                              defaultValue: "Add price row",
                            })}
                          </Button>
                        </>
                      )}
                    </Form.List>
                  </div>
                ),
              },
            ]}
          />

          <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={saveMutation.isPending}
              size="large"
              block>
              {t("provider.places.save", { defaultValue: "Save" })}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProviderPlaces;
