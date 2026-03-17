import { useState, useEffect } from "react";
import { Button, message } from "antd";
import { useTranslation } from "react-i18next";
import { PlusOutlined } from "@ant-design/icons";
import AdminTable from "../../components/AdminTable/AdminTable";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { ADMIN_ENDPOINTS } from "../../../../api/endpoints";
import { get, postJson, patch, del } from "../../../../api/apiService";
import type { ColumnsType } from "antd/es/table";
import "./PlacePricingPage.css";

interface PlacePricing {
  id: string;
  basePrice: number;
  currencyCode: string;
  perPerson: boolean;
  maxPeople?: number;
  validFrom?: string;
  validTo?: string;
  createdAt: string;
}

function PlacePricingPage() {
  const { t } = useTranslation();
  const [pricings, setPricings] = useState<PlacePricing[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPricing, setSelectedPricing] = useState<PlacePricing | null>(
    null,
  );
  const [formLoading, setFormLoading] = useState(false);

  const fields: FormField[] = [
    { name: "basePrice", label: "Base Price", type: "number", required: true },
    {
      name: "currencyCode",
      label: "Currency Code",
      type: "text",
      required: true,
    },
    {
      name: "perPerson",
      label: "Per Person",
      type: "select",
      required: true,
      options: [
        { label: t("admin.common.yes"), value: true },
        { label: t("admin.common.no"), value: false },
      ],
    },
    { name: "maxPeople", label: "Max People", type: "number", required: false },
    { name: "validFrom", label: "Valid From", type: "date", required: false },
    { name: "validTo", label: "Valid To", type: "date", required: false },
  ];

  const columns: ColumnsType<PlacePricing> = [
    {
      title: "Base Price",
      dataIndex: "basePrice",
      key: "basePrice",
      render: (price: number, record: PlacePricing) =>
        `${price} ${record.currencyCode}`,
    },
    {
      title: "Per Person",
      dataIndex: "perPerson",
      key: "perPerson",
      render: (perPerson: boolean) =>
        perPerson ? t("admin.common.yes") : t("admin.common.no"),
    },
    {
      title: "Max People",
      dataIndex: "maxPeople",
      key: "maxPeople",
    },
    {
      title: "Valid From",
      dataIndex: "validFrom",
      key: "validFrom",
      render: (date: string) =>
        date ? new Date(date).toLocaleDateString() : "-",
    },
    {
      title: "Valid To",
      dataIndex: "validTo",
      key: "validTo",
      render: (date: string) =>
        date ? new Date(date).toLocaleDateString() : "-",
    },
    {
      title: t("admin.users.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const fetchPricings = async () => {
    try {
      setLoading(true);
      const data = await get(ADMIN_ENDPOINTS.PLACE_PRICING_LIST);
      setPricings(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error(
        t("admin.common.failedToLoad") +
          " " +
          t("admin.placePricing.title").toLowerCase(),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricings();
  }, []);

  const handleAdd = () => {
    setSelectedPricing(null);
    setModalOpen(true);
  };

  const handleEdit = (pricing: PlacePricing) => {
    setSelectedPricing(pricing);
    setModalOpen(true);
  };

  const handleDelete = (pricing: PlacePricing) => {
    setSelectedPricing(pricing);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      setFormLoading(true);
      if (selectedPricing) {
        await patch(
          ADMIN_ENDPOINTS.PLACE_PRICING_UPDATE(selectedPricing.id),
          values,
        );
        message.success(
          t("admin.placePricing.title").split(" ")[0] +
            " " +
            t("admin.common.updatedSuccessfully"),
        );
      } else {
        await postJson(ADMIN_ENDPOINTS.PLACE_PRICING_CREATE, values);
        message.success(
          t("admin.placePricing.title").split(" ")[0] +
            " " +
            t("admin.common.createdSuccessfully"),
        );
      }
      setModalOpen(false);
      setSelectedPricing(null);
      fetchPricings();
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          t("admin.common.failedToSave") +
            " " +
            t("admin.placePricing.title").toLowerCase(),
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPricing) return;
    try {
      setFormLoading(true);
      await del(ADMIN_ENDPOINTS.PLACE_PRICING_DELETE(selectedPricing.id));
      message.success(
        t("admin.placePricing.title").split(" ")[0] +
          " " +
          t("admin.common.deletedSuccessfully"),
      );
      setDeleteModalOpen(false);
      setSelectedPricing(null);
      fetchPricings();
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          t("admin.common.failedToDelete") +
            " " +
            t("admin.placePricing.title").toLowerCase(),
      );
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="place-pricing-page">
      <div className="place-pricing-page-header">
        <h1>{t("admin.placePricing.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          {t("admin.placePricing.addPlacePricing")}
        </Button>
      </div>
      <AdminTable
        data={pricings}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <AdminFormModal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedPricing(null);
        }}
        onSubmit={handleSubmit}
        title={
          selectedPricing
            ? t("admin.placePricing.editPlacePricing")
            : t("admin.placePricing.addPlacePricing")
        }
        initialValues={selectedPricing}
        fields={fields}
        loading={formLoading}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedPricing(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t("admin.placePricing.deletePlacePricing")}
        content={t("admin.placePricing.deleteConfirm")}
        loading={formLoading}
      />
    </div>
  );
}

export default PlacePricingPage;
