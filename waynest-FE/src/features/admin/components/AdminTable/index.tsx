import { Table, Button, Space } from "antd";
import { useTranslation } from "react-i18next";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import "./AdminTable.css";

interface AdminTableProps<T> {
  data: T[];
  columns: ColumnsType<T>;
  loading?: boolean;
  onEdit?: (record: T) => void;
  onDelete?: (record: T) => void;
  rowKey?: string | ((record: T) => string);
}

function AdminTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  onEdit,
  onDelete,
  rowKey = "id",
}: AdminTableProps<T>) {
  const { t } = useTranslation();
  
  const actionColumn = {
    title: t("admin.common.actions"),
    key: "actions",
    width: 120,
    render: (_: any, record: T) => (
      <Space size="middle">
        {onEdit && (
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          >
            {t("admin.common.edit")}
          </Button>
        )}
        {onDelete && (
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDelete(record)}
          >
            {t("admin.common.delete")}
          </Button>
        )}
      </Space>
    ),
  };

  const finalColumns = [...columns, actionColumn];

  return (
    <Table
      className="admin-table"
      columns={finalColumns}
      dataSource={data}
      loading={loading}
      rowKey={rowKey}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `${t("admin.common.totalItems")} ${total} ${t("admin.common.items")}`,
      }}
    />
  );
}

export default AdminTable;

