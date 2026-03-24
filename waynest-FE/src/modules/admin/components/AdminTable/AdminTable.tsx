import { Table, Button, Space } from "antd";
import { useTranslation } from "react-i18next";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import "./AdminTable.css";

interface AdminTableProps<T extends object> {
  data: T[];
  columns: ColumnsType<T>;
  loading?: boolean;
  onEdit?: (record: T) => void;
  onDelete?: (record: T) => void;
  rowKey?: string | ((record: T) => string);
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number, pageSize: number) => void;
}

function AdminTable<T extends object>({
  data,
  columns,
  loading = false,
  onEdit,
  onDelete,
  rowKey = "id",
  total,
  page = 1,
  pageSize = 10,
  onPageChange,
}: AdminTableProps<T>) {
  const { t } = useTranslation();

  const actionColumn: ColumnsType<T>[number] = {
    title: t("admin.common.actions"),
    key: "actions",
    width: 120,
    render: (_: unknown, record: T) => (
      <Space size="middle">
        {onEdit && (
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}>
            {t("admin.common.edit")}
          </Button>
        )}
        {onDelete && (
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDelete(record)}>
            {t("admin.common.delete")}
          </Button>
        )}
      </Space>
    ),
  };

  const resolvedColumns =
    onEdit || onDelete ? [...columns, actionColumn] : columns;

  return (
    <Table
      className="admin-table"
      columns={resolvedColumns}
      dataSource={data}
      loading={loading}
      rowKey={rowKey}
      pagination={{
        current: page,
        pageSize: pageSize,
        total: total,
        showSizeChanger: true,
        showQuickJumper: true,
        onChange: onPageChange,
        showTotal: (total) =>
          `${t("admin.common.totalItems")} ${total} ${t("admin.common.items")}`,
      }}
    />
  );
}

export default AdminTable;
