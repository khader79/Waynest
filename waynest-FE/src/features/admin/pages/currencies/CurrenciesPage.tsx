import { useState, useEffect } from "react";
import { Button, message } from "antd";
import { useTranslation } from "react-i18next";
import { PlusOutlined } from "@ant-design/icons";
import AdminTable from "../../components/AdminTable";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { ADMIN_ENDPOINTS } from "../../../../api/endpoints";
import { get, postJson, patch, del } from "../../../../api/apiService";
import type { ColumnsType } from "antd/es/table";

interface Currency {
  id: string;
  code: string;
  name: string;
  fractionSize?: number;
  createdAt: string;
}

function CurrenciesPage() {
  const { t } = useTranslation();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fields: FormField[] = [
    { name: "code", label: "Code", type: "text", required: true },
    { name: "name", label: t("admin.places.name"), type: "text", required: true },
    { name: "fractionSize", label: "Fraction Size", type: "number", required: false },
  ];

  const columns: ColumnsType<Currency> = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
    },
    {
      title: t("admin.places.name"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Fraction Size",
      dataIndex: "fractionSize",
      key: "fractionSize",
    },
    {
      title: t("admin.users.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const data = await get(ADMIN_ENDPOINTS.CURRENCIES_LIST);
      setCurrencies(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error(t("admin.common.failedToLoad") + " " + t("admin.currencies.title").toLowerCase());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const handleAdd = () => {
    setSelectedCurrency(null);
    setModalOpen(true);
  };

  const handleEdit = (currency: Currency) => {
    setSelectedCurrency(currency);
    setModalOpen(true);
  };

  const handleDelete = (currency: Currency) => {
    setSelectedCurrency(currency);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      setFormLoading(true);
      if (selectedCurrency) {
        await patch(ADMIN_ENDPOINTS.CURRENCIES_UPDATE(selectedCurrency.id), values);
        message.success(t("admin.currencies.title").split(" ")[0] + " " + t("admin.common.updatedSuccessfully"));
      } else {
        await postJson(ADMIN_ENDPOINTS.CURRENCIES_CREATE, values);
        message.success(t("admin.currencies.title").split(" ")[0] + " " + t("admin.common.createdSuccessfully"));
      }
      setModalOpen(false);
      setSelectedCurrency(null);
      fetchCurrencies();
    } catch (error: any) {
      message.error(error?.response?.data?.message || t("admin.common.failedToSave") + " " + t("admin.currencies.title").toLowerCase());
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCurrency) return;
    try {
      setFormLoading(true);
      await del(ADMIN_ENDPOINTS.CURRENCIES_DELETE(selectedCurrency.id));
      message.success(t("admin.currencies.title").split(" ")[0] + " " + t("admin.common.deletedSuccessfully"));
      setDeleteModalOpen(false);
      setSelectedCurrency(null);
      fetchCurrencies();
    } catch (error: any) {
      message.error(error?.response?.data?.message || t("admin.common.failedToDelete") + " " + t("admin.currencies.title").toLowerCase());
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>{t("admin.currencies.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          {t("admin.currencies.addCurrency")}
        </Button>
      </div>
      <AdminTable
        data={currencies}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <AdminFormModal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedCurrency(null);
        }}
        onSubmit={handleSubmit}
        title={selectedCurrency ? t("admin.currencies.editCurrency") : t("admin.currencies.addCurrency")}
        initialValues={selectedCurrency}
        fields={fields}
        loading={formLoading}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedCurrency(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t("admin.currencies.deleteCurrency")}
        content={`${t("admin.currencies.deleteConfirm")} ${selectedCurrency?.code}?`}
        loading={formLoading}
      />
    </div>
  );
}

export default CurrenciesPage;
