import { useState, useEffect, useMemo } from "react";
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
import "./PlaceOpeningHoursPage.css";

interface PlaceOpeningHour {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  createdAt: string;
}

function PlaceOpeningHoursPage() {
  const { t } = useTranslation();
  const [openingHours, setOpeningHours] = useState<PlaceOpeningHour[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedOpeningHour, setSelectedOpeningHour] =
    useState<PlaceOpeningHour | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const DAYS_OF_WEEK = useMemo(
    () => [
      t("admin.placeOpeningHours.days.sunday"),
      t("admin.placeOpeningHours.days.monday"),
      t("admin.placeOpeningHours.days.tuesday"),
      t("admin.placeOpeningHours.days.wednesday"),
      t("admin.placeOpeningHours.days.thursday"),
      t("admin.placeOpeningHours.days.friday"),
      t("admin.placeOpeningHours.days.saturday"),
    ],
    [t],
  );

  const fields: FormField[] = useMemo(
    () => [
      {
        name: "dayOfWeek",
        label: t("admin.placeOpeningHours.dayOfWeek"),
        type: "select",
        required: true,
        options: DAYS_OF_WEEK.map((day, index) => ({
          label: day,
          value: index,
        })),
      },
      {
        name: "openTime",
        label: t("admin.placeOpeningHours.openTime"),
        type: "text",
        required: true,
        placeholder: "08:00",
      },
      {
        name: "closeTime",
        label: t("admin.placeOpeningHours.closeTime"),
        type: "text",
        required: true,
        placeholder: "17:00",
      },
    ],
    [DAYS_OF_WEEK, t],
  );

  const columns: ColumnsType<PlaceOpeningHour> = [
    {
      title: t("admin.placeOpeningHours.dayOfWeek"),
      dataIndex: "dayOfWeek",
      key: "dayOfWeek",
      render: (day: number) => DAYS_OF_WEEK[day],
    },
    {
      title: t("admin.placeOpeningHours.openTime"),
      dataIndex: "openTime",
      key: "openTime",
    },
    {
      title: t("admin.placeOpeningHours.closeTime"),
      dataIndex: "closeTime",
      key: "closeTime",
    },
    {
      title: t("admin.users.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const fetchOpeningHours = async () => {
    try {
      setLoading(true);
      const data = await get(ADMIN_ENDPOINTS.PLACE_OPENING_HOURS_LIST);
      setOpeningHours(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error(
        t("admin.common.failedToLoad") +
          " " +
          t("admin.placeOpeningHours.title").toLowerCase(),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpeningHours();
  }, []);

  const handleAdd = () => {
    setSelectedOpeningHour(null);
    setModalOpen(true);
  };

  const handleEdit = (openingHour: PlaceOpeningHour) => {
    setSelectedOpeningHour(openingHour);
    setModalOpen(true);
  };

  const handleDelete = (openingHour: PlaceOpeningHour) => {
    setSelectedOpeningHour(openingHour);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      setFormLoading(true);
      if (selectedOpeningHour) {
        await patch(
          ADMIN_ENDPOINTS.PLACE_OPENING_HOURS_UPDATE(selectedOpeningHour.id),
          values,
        );
        message.success(
          t("admin.placeOpeningHours.title").split(" ")[0] +
            " " +
            t("admin.common.updatedSuccessfully"),
        );
      } else {
        await postJson(ADMIN_ENDPOINTS.PLACE_OPENING_HOURS_CREATE, values);
        message.success(
          t("admin.placeOpeningHours.title").split(" ")[0] +
            " " +
            t("admin.common.createdSuccessfully"),
        );
      }
      setModalOpen(false);
      setSelectedOpeningHour(null);
      fetchOpeningHours();
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          t("admin.common.failedToSave") +
            " " +
            t("admin.placeOpeningHours.title").toLowerCase(),
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedOpeningHour) return;
    try {
      setFormLoading(true);
      await del(
        ADMIN_ENDPOINTS.PLACE_OPENING_HOURS_DELETE(selectedOpeningHour.id),
      );
      message.success(
        t("admin.placeOpeningHours.title").split(" ")[0] +
          " " +
          t("admin.common.deletedSuccessfully"),
      );
      setDeleteModalOpen(false);
      setSelectedOpeningHour(null);
      fetchOpeningHours();
    } catch (error: any) {
      message.error(
        error?.response?.data?.message ||
          t("admin.common.failedToDelete") +
            " " +
            t("admin.placeOpeningHours.title").toLowerCase(),
      );
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="place-opening-hours-page">
      <div className="place-opening-hours-page-header">
        <h1>{t("admin.placeOpeningHours.title")}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          {t("admin.placeOpeningHours.addPlaceOpeningHours")}
        </Button>
      </div>
      <AdminTable
        data={openingHours}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <AdminFormModal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedOpeningHour(null);
        }}
        onSubmit={handleSubmit}
        title={
          selectedOpeningHour
            ? t("admin.placeOpeningHours.editPlaceOpeningHours")
            : t("admin.placeOpeningHours.addPlaceOpeningHours")
        }
        initialValues={selectedOpeningHour}
        fields={fields}
        loading={formLoading}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelectedOpeningHour(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t("admin.placeOpeningHours.deletePlaceOpeningHours")}
        content={`${t("admin.placeOpeningHours.deleteConfirm")}?`}
        loading={formLoading}
      />
    </div>
  );
}

export default PlaceOpeningHoursPage;
