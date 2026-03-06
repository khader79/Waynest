import { useState, useEffect } from "react";
import { Button, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import AdminTable from "../../components/AdminTable";
import AdminFormModal from "../../components/AdminFormModal";
import type { FormField } from "../../components/AdminFormModal";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import { adminService } from "../../../../api/adminService";
import type { ColumnsType } from "antd/es/table";

interface City {
  id: string;
  name: string;
  stateName?: string;
  latitude?: number;
  longitude?: number;
  population?: number;
  createdAt: string;
}

function CitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fields: FormField[] = [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "stateName", label: "State Name", type: "text", required: false },
    { name: "latitude", label: "Latitude", type: "number", required: false },
    { name: "longitude", label: "Longitude", type: "number", required: false },
    { name: "population", label: "Population", type: "number", required: false },
  ];

  const columns: ColumnsType<City> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "State",
      dataIndex: "stateName",
      key: "stateName",
    },
    {
      title: "Population",
      dataIndex: "population",
      key: "population",
    },
    {
      title: "Latitude",
      dataIndex: "latitude",
      key: "latitude",
    },
    {
      title: "Longitude",
      dataIndex: "longitude",
      key: "longitude",
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const fetchCities = async () => {
    try {
      setLoading(true);
      const data = await adminService.fetchList("cities");
      setCities(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error("Failed to load cities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  const handleAdd = () => {
    setSelectedCity(null);
    setModalOpen(true);
  };

  const handleEdit = (city: City) => {
    setSelectedCity(city);
    setModalOpen(true);
  };

  const handleDelete = (city: City) => {
    setSelectedCity(city);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      setFormLoading(true);
      if (selectedCity) {
        await adminService.updateItem("cities", selectedCity.id, values);
        message.success("City updated successfully");
      } else {
        await adminService.createItem("cities", values);
        message.success("City created successfully");
      }
      setModalOpen(false);
      setSelectedCity(null);
      fetchCities();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to save city");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCity) return;
    try {
      setFormLoading(true);
      await adminService.deleteItem("cities", selectedCity.id);
      message.success("City deleted successfully");
      setDeleteModalOpen(false);
      setSelectedCity(null);
      fetchCities();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to delete city");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Cities Management</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add City
        </Button>
      </div>
      <AdminTable
        data={cities}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <AdminFormModal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedCity(null);
        }}
        onSubmit={handleSubmit}
        title={selectedCity ? "Edit City" : "Add City"}
        initialValues={selectedCity}
        fields={fields}
        loading={formLoading}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedCity(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete City"
        content={`Are you sure you want to delete city ${selectedCity?.name}?`}
        loading={formLoading}
      />
    </div>
  );
}

export default CitiesPage;
