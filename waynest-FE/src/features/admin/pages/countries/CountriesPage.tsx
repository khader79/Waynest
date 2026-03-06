import { useState, useEffect } from "react";
import { Button, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import AdminTable from "../../components/AdminTable";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { adminService } from "../../../../api/adminService";
import type { ColumnsType } from "antd/es/table";

interface Country {
  id: string;
  name: string;
  nativeName?: string;
  alpha2Code: string;
  alpha3Code: string;
  numericCode?: string;
  region?: string;
  capital?: string;
  createdAt: string;
}

function CountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fields: FormField[] = [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "nativeName", label: "Native Name", type: "text", required: false },
    { name: "alpha2Code", label: "Alpha 2 Code", type: "text", required: true },
    { name: "alpha3Code", label: "Alpha 3 Code", type: "text", required: true },
    { name: "numericCode", label: "Numeric Code", type: "text", required: false },
    { name: "region", label: "Region", type: "text", required: false },
    { name: "capital", label: "Capital", type: "text", required: false },
  ];

  const columns: ColumnsType<Country> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Alpha 2",
      dataIndex: "alpha2Code",
      key: "alpha2Code",
    },
    {
      title: "Alpha 3",
      dataIndex: "alpha3Code",
      key: "alpha3Code",
    },
    {
      title: "Region",
      dataIndex: "region",
      key: "region",
    },
    {
      title: "Capital",
      dataIndex: "capital",
      key: "capital",
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const fetchCountries = async () => {
    try {
      setLoading(true);
      const data = await adminService.fetchList("countries");
      setCountries(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error("Failed to load countries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  const handleAdd = () => {
    setSelectedCountry(null);
    setModalOpen(true);
  };

  const handleEdit = (country: Country) => {
    setSelectedCountry(country);
    setModalOpen(true);
  };

  const handleDelete = (country: Country) => {
    setSelectedCountry(country);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      setFormLoading(true);
      if (selectedCountry) {
        await adminService.updateItem("countries", selectedCountry.id, values);
        message.success("Country updated successfully");
      } else {
        await adminService.createItem("countries", values);
        message.success("Country created successfully");
      }
      setModalOpen(false);
      setSelectedCountry(null);
      fetchCountries();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to save country");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCountry) return;
    try {
      setFormLoading(true);
      await adminService.deleteItem("countries", selectedCountry.id);
      message.success("Country deleted successfully");
      setDeleteModalOpen(false);
      setSelectedCountry(null);
      fetchCountries();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to delete country");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Countries Management</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Country
        </Button>
      </div>
      <AdminTable
        data={countries}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <AdminFormModal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedCountry(null);
        }}
        onSubmit={handleSubmit}
        title={selectedCountry ? "Edit Country" : "Add Country"}
        initialValues={selectedCountry}
        fields={fields}
        loading={formLoading}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedCountry(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Country"
        content={`Are you sure you want to delete country ${selectedCountry?.name}?`}
        loading={formLoading}
      />
    </div>
  );
}

export default CountriesPage;
