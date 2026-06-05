import { useMemo, useState } from "react";
import { Form, Button, Tooltip, Tag, Space, Image } from "antd";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import AdminFormModal from "@/components/admin/AdminFormModal";
import AdminTable from "@/components/admin/AdminTable/AdminTable";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { useCityOptions } from "@/hooks/admin/useCityOptions";
import { useProviderOptions } from "@/hooks/admin/useProviderOptions";
import { useTagOptions } from "@/hooks/admin/useTagOptions";
import { useCrudPage } from "@/hooks/admin/useCrudPage";
import { extractAdminCollection } from "@/utils/adminCollection";
import { placesAdminService } from "@/api/admin";
import { postJson } from "@/api/request";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import "./PlacesPage.css";

const PLACE_TYPES = [
  { label: "Hotel",      value: "HOTEL" },
  { label: "Restaurant", value: "RESTAURANT" },
  { label: "Activity",   value: "ACTIVITY" },
  { label: "Tour",       value: "TOUR" },
  { label: "Landmark",   value: "LANDMARK" },
  { label: "Cafe",       value: "CAFE" },
  { label: "Park",       value: "PARK" },
  { label: "Shop",       value: "SHOP" },
  { label: "Museum",     value: "MUSEUM" },
  { label: "Beach",      value: "BEACH" },
];

const TYPE_COLOR = {
  HOTEL:"blue", RESTAURANT:"orange", ACTIVITY:"green", TOUR:"purple",
  LANDMARK:"gold", CAFE:"brown", PARK:"green", SHOP:"magenta",
  MUSEUM:"geekblue", BEACH:"cyan",
};

function PlacesPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [backfilling, setBackfilling] = useState("");

  const query = useMemo(
    () => ({ page, pageSize, search: searchQuery || undefined }),
    [page, pageSize, searchQuery],
  );

  const { cities }    = useCityOptions("Failed to load cities");
  const { providers } = useProviderOptions("Failed to load providers");
  const { tags }      = useTagOptions("Failed to load tags");

  const {
    closeDelete, closeForm, confirmDelete,
    isDeleteOpen, isFormOpen, loading,
    openCreate, openDelete, openEdit,
    records, selectedRecord, submit, submitting, total,
  } = useCrudPage({
    service: placesAdminService,
    query,
    mapListResponse: extractAdminCollection,
    messages: {
      loadError:      "Failed to load places",
      saveError:      "Failed to save place",
      deleteError:    "Failed to delete place",
      createdSuccess: "Place created successfully",
      updatedSuccess: "Place updated successfully",
      deletedSuccess: "Place deleted successfully",
    },
  });

  // ── Backfill actions ──────────────────────────────────────────────────────
  const runBackfill = async (endpoint, label) => {
    setBackfilling(endpoint);
    try {
      const res = await postJson(endpoint, {});
      toast.success(
        `${label} complete: ${res.updated ?? res.total ?? 0} updated, ${res.notFound ?? 0} not found`,
      );
    } catch (err) {
      toast.error(`${label} failed: ${err?.message ?? "Unknown error"}`);
    } finally {
      setBackfilling("");
    }
  };

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = [
    {
      title: "Image",
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 72,
      render: (url, record) => {
        const resolved = resolveMediaUrl(url);
        return resolved ? (
          <Image
            src={resolved}
            alt={record.name}
            width={56}
            height={42}
            style={{ objectFit: "cover", borderRadius: 6 }}
            fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 42'%3E%3Crect width='56' height='42' fill='%23e2e8f0'/%3E%3C/svg%3E"
          />
        ) : (
          <div style={{
            width: 56, height: 42, borderRadius: 6,
            background: "#f1f5f9", display: "flex",
            alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>🖼</div>
        );
      },
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          {record.city?.name && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>📍 {record.city.name}</div>
          )}
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type) => type ? <Tag color={TYPE_COLOR[type] ?? "default"}>{type}</Tag> : "-",
    },
    {
      title: "Coords",
      key: "coords",
      render: (_, record) =>
        record.latitude && record.longitude
          ? <span style={{ fontSize: 12, color: "#6b7280" }}>{Number(record.latitude).toFixed(4)}, {Number(record.longitude).toFixed(4)}</span>
          : <Tag color="red">Missing</Tag>,
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => (
        <Space size={4}>
          <Tag color={record.isActive ? "green" : "red"}>{record.isActive ? "Active" : "Inactive"}</Tag>
          {record.isVerified && <Tag color="blue">Verified ✓</Tag>}
        </Space>
      ),
    },
    {
      title: "Rating",
      dataIndex: "ratingAverage",
      key: "ratingAverage",
      render: (r) => r != null ? `⭐ ${Number(r).toFixed(1)}` : "-",
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d) => d ? new Date(d).toLocaleDateString() : "-",
    },
  ];

  // ── Form fields ───────────────────────────────────────────────────────────
  const fields = useMemo(() => {
    const cityOpts = cities.map((c) => ({ label: c.name, value: c.id }));
    if (selectedRecord?.city?.id && !cityOpts.some(o => o.value === selectedRecord.city.id)) {
      cityOpts.unshift({ label: selectedRecord.city.name ?? selectedRecord.city.id, value: selectedRecord.city.id });
    }

    const provOpts = [
      { label: "— None —", value: null },
      ...providers.map((p) => ({ label: p.displayName, value: p.id })),
    ];
    if (selectedRecord?.provider?.id && !provOpts.some(o => o.value === selectedRecord.provider.id)) {
      provOpts.push({ label: selectedRecord.provider.displayName ?? selectedRecord.provider.id, value: selectedRecord.provider.id });
    }

    return [
      { name: "name",        label: "Name",        type: "text",     required: true },
      { name: "slug",        label: "Slug",        type: "text",     required: true },
      { name: "description", label: "Description", type: "textarea", required: true },
      { name: "address",     label: "Address",     type: "text",     required: false },
      { name: "imageUrl",    label: "Image URL",   type: "text",     required: false,
        placeholder: "https://... (leave blank to auto-fetch from Google Places)" },
      {
        name: "type", label: "Type", type: "select", required: true,
        options: PLACE_TYPES,
      },
      { name: "city",     label: "City",     type: "select", required: true,  options: cityOpts },
      { name: "provider", label: "Provider", type: "select", required: false, options: provOpts },
      {
        name: "tags", label: "Tags", type: "select", required: false, multiple: true,
        options: tags.map((tag) => ({ label: tag.name, value: tag.id })),
      },
      { name: "latitude",  label: "Latitude",  type: "number", required: true },
      { name: "longitude", label: "Longitude", type: "number", required: true },
      {
        name: "isActive", label: "Active", type: "select", required: false,
        options: [{ label: "Yes", value: true }, { label: "No", value: false }],
      },
      {
        name: "isVerified", label: "Verified", type: "select", required: false,
        options: [{ label: "Yes", value: true }, { label: "No", value: false }],
      },
    ];
  }, [cities, providers, tags, selectedRecord]);

  // Auto-fill coords from city selection
  const handleCityChange = (cityId) => {
    if (typeof cityId !== "string") return;
    const city = cities.find((c) => c.id === cityId);
    if (city?.latitude && city?.longitude) {
      form.setFieldsValue({ latitude: city.latitude, longitude: city.longitude });
    }
  };

  return (
    <div className="crud-page">
      {/* Header */}
      <div className="crud-page-header">
        <div className="crud-page-header-left">
          <h1 className="crud-page-title">Places</h1>
          <p className="crud-page-subtitle">Manage places and venues</p>
        </div>

        {/* Backfill action buttons */}
        <div className="crud-page-header-right" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Tooltip title="Fetch real images from Google Places for all places without images">
            <Button
              type="default"
              loading={backfilling === "/place/backfill-images"}
              onClick={() => runBackfill("/place/backfill-images", "Image backfill")}
              icon={<span>🖼</span>}>
              Backfill Images
            </Button>
          </Tooltip>
          <Tooltip title="Fetch accurate GPS coordinates from Google Places for all places (force updates all)">
            <Button
              type="default"
              loading={backfilling === "/place/backfill-coordinates"}
              onClick={() => runBackfill("/place/backfill-coordinates?force=true", "Coordinate backfill")}
              icon={<span>📍</span>}>
              Fix Coordinates
            </Button>
          </Tooltip>
          <Tooltip title="Clear the place images Redis cache so all places re-fetch fresh images">
            <Button
              type="default"
              loading={backfilling === "/place-images/cache/flush"}
              onClick={async () => {
                setBackfilling("/place-images/cache/flush");
                try {
                  const res = await fetch(`${import.meta.env.VITE_API_URL}/place-images/cache/flush`);
                  const data = await res.json();
                  toast.success(data.message ?? "Cache flushed");
                } catch {
                  toast.error("Failed to flush cache");
                } finally {
                  setBackfilling("");
                }
              }}
              icon={<span>🗑</span>}>
              Flush Cache
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Table */}
      <AdminTable
        data={records}
        columns={columns}
        loading={loading}
        onEdit={openEdit}
        onDelete={openDelete}
        onAdd={openCreate}
        addLabel="Add place"
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage, nextPageSize) => { setPage(nextPage); setPageSize(nextPageSize); }}
        searchable
        searchPlaceholder="Search places..."
        onSearch={setSearchQuery}
        exportable
        title="Places"
      />

      {/* Create / Edit modal */}
      <AdminFormModal
        open={isFormOpen}
        onCancel={() => { closeForm(); form.resetFields(); }}
        onSubmit={submit}
        title={selectedRecord ? "Edit place" : "Add place"}
        initialValues={
          selectedRecord
            ? {
                ...selectedRecord,
                city:     selectedRecord.city?.id ?? null,
                provider: selectedRecord.provider?.id ?? null,
                tags:     selectedRecord.tags?.map((tag) => tag.id) ?? [],
              }
            : { isActive: true, isVerified: false }
        }
        fields={fields}
        loading={submitting}
        form={form}
        onFieldChange={{ city: handleCityChange }}
      />

      {/* Delete confirm */}
      <DeleteConfirmModal
        open={isDeleteOpen}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title="Delete place"
        content={`Are you sure you want to delete "${selectedRecord?.name ?? ""}"?`}
        loading={submitting}
      />
    </div>
  );
}

export default PlacesPage;
