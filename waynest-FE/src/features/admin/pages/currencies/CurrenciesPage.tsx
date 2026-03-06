import { useState, useEffect } from "react";
import { Button, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import AdminTable from "../../components/AdminTable";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { adminService } from "../../../../api/adminService";
import type { ColumnsType } from "antd/es/table";

interface Currency {
  id: string;
  code: string;
  name: string;
  fractionSize?: number;
  createdAt: string;
}

function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fields: FormField[] = [
    { name: "code", label: "Code", type: "text", required: true },
    { name: "name", label: "Name", type: "text", required: true },
    { name: "fractionSize", label: "Fraction Size", type: "number", required: false },
  ];

  const columns: ColumnsType<Currency> = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Fraction Size",
      dataIndex: "fractionSize",
      key: "fractionSize",
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const data = await adminService.fetchList("currencies");
      setCurrencies(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error("Failed to load currencies");
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
        await adminService.updateItem("currencies", selectedCurrency.id, values);
        message.success("Currency updated successfully");
      } else {
        await adminService.createItem("currencies", values);
        message.success("Currency created successfully");
      }
      setModalOpen(false);
      setSelectedCurrency(null);
      fetchCurrencies();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to save currency");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCurrency) return;
    try {
      setFormLoading(true);
      await adminService.deleteItem("currencies", selectedCurrency.id);
      message.success("Currency deleted successfully");
      setDeleteModalOpen(false);
      setSelectedCurrency(null);
      fetchCurrencies();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to delete currency");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Currencies Management</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Currency
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
        title={selectedCurrency ? "Edit Currency" : "Add Currency"}
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
        title="Delete Currency"
        content={`Are you sure you want to delete currency ${selectedCurrency?.code}?`}
        loading={formLoading}
      />
    </div>
  );
}

export default CurrenciesPage;
