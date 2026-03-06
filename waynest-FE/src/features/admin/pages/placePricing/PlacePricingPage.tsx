import { useState, useEffect } from "react";
import { Button, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import AdminTable from "../../components/AdminTable";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { adminService } from "../../../../api/adminService";
import type { ColumnsType } from "antd/es/table";

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
  const [pricings, setPricings] = useState<PlacePricing[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPricing, setSelectedPricing] = useState<PlacePricing | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fields: FormField[] = [
    { name: "basePrice", label: "Base Price", type: "number", required: true },
    { name: "currencyCode", label: "Currency Code", type: "text", required: true },
    {
      name: "perPerson",
      label: "Per Person",
      type: "select",
      required: true,
      options: [
        { label: "Yes", value: true },
        { label: "No", value: false },
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
      render: (price: number, record: PlacePricing) => `${price} ${record.currencyCode}`,
    },
    {
      title: "Per Person",
      dataIndex: "perPerson",
      key: "perPerson",
      render: (perPerson: boolean) => (perPerson ? "Yes" : "No"),
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
      render: (date: string) => date ? new Date(date).toLocaleDateString() : "-",
    },
    {
      title: "Valid To",
      dataIndex: "validTo",
      key: "validTo",
      render: (date: string) => date ? new Date(date).toLocaleDateString() : "-",
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const fetchPricings = async () => {
    try {
      setLoading(true);
      const data = await adminService.fetchList("placePricing");
      setPricings(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error("Failed to load place pricing");
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
        await adminService.updateItem("placePricing", selectedPricing.id, values);
        message.success("Place pricing updated successfully");
      } else {
        await adminService.createItem("placePricing", values);
        message.success("Place pricing created successfully");
      }
      setModalOpen(false);
      setSelectedPricing(null);
      fetchPricings();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to save place pricing");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPricing) return;
    try {
      setFormLoading(true);
      await adminService.deleteItem("placePricing", selectedPricing.id);
      message.success("Place pricing deleted successfully");
      setDeleteModalOpen(false);
      setSelectedPricing(null);
      fetchPricings();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to delete place pricing");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Place Pricing Management</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Pricing
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
        title={selectedPricing ? "Edit Place Pricing" : "Add Place Pricing"}
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
        title="Delete Place Pricing"
        content={`Are you sure you want to delete this pricing?`}
        loading={formLoading}
      />
    </div>
  );
}

export default PlacePricingPage;
