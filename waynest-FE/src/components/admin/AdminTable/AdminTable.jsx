import { useState, useMemo, useCallback } from "react";
import { Table, Button, Space, Input, Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import {
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  DownloadOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import "./AdminTable.css";

function AdminTable({
  data,
  columns,
  loading = false,
  onEdit,
  onDelete,
  onAdd,
  addLabel,
  rowKey = "id",
  total,
  page = 1,
  pageSize = 10,
  onPageChange,
  searchable = false,
  searchPlaceholder,
  onSearch,
  exportable = false,
  onExport,
  title,
  emptyText,
  extraActions,
}) {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState("");

  const handleSearch = useCallback(
    (value) => {
      setSearchText(value);
      if (onSearch) {
        onSearch(value);
      }
    },
    [onSearch],
  );

  const handleExport = useCallback(() => {
    if (onExport) {
      onExport(data);
    }
  }, [onExport, data]);

  const actionColumn = useMemo(
    () => ({
      title: t("admin.common.actions"),
      key: "actions",
      width: 100,
      className: "admin-table-actions-cell",
      render: (_, record) => (
        <Space size={4}>
          {onEdit && (
            <Tooltip title={t("admin.common.edit")}>
              <Button
                type="text"
                className="admin-table-action-btn"
                icon={<EditOutlined />}
                onClick={() => onEdit(record)}
              />
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title={t("admin.common.delete")}>
              <Button
                type="text"
                className="admin-table-action-btn admin-table-action-btn--danger"
                icon={<DeleteOutlined />}
                onClick={() => onDelete(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    }),
    [onEdit, onDelete, t],
  );

  const resolvedColumns = useMemo(
    () => (onEdit || onDelete ? [...columns, actionColumn] : columns),
    [columns, actionColumn, onEdit, onDelete],
  );

  const filteredData = useMemo(() => {
    if (!searchText || !searchable) return data;
    const q = searchText.toLowerCase();
    return (data || []).filter((record) =>
      columns.some((col) => {
        const val = record[col.dataIndex];
        return val != null && String(val).toLowerCase().includes(q);
      }),
    );
  }, [data, searchText, searchable, columns]);

  const locale = {
    emptyText: (
      <div className="admin-table-empty">
        <div className="admin-table-empty-icon">
          <SearchOutlined />
        </div>
        <p className="admin-table-empty-title">
          {emptyText || t("admin.common.noData", "No data")}
        </p>
      </div>
    ),
  };

  return (
    <div className="admin-table-wrapper">
      {/* Toolbar */}
      {(searchable || exportable || onAdd || title || extraActions) && (
        <div className="admin-table-toolbar">
          <div className="admin-table-toolbar-left">
            {title && <h3 className="admin-table-title">{title}</h3>}
          </div>
          <div className="admin-table-toolbar-right">
            {extraActions}
            {searchable && (
              <Input
                className="admin-table-search"
                prefix={<SearchOutlined />}
                placeholder={
                  searchPlaceholder ||
                  t("admin.common.search", "Search...")
                }
                value={searchText}
                onChange={(e) => handleSearch(e.target.value)}
                allowClear
              />
            )}
            {exportable && data?.length > 0 && (
              <Tooltip title={t("admin.common.export", "Export CSV")}>
                <Button
                  icon={<DownloadOutlined />}
                  className="admin-table-export-btn"
                  onClick={handleExport}
                >
                  {t("admin.common.export", "Export")}
                </Button>
              </Tooltip>
            )}
            {onAdd && addLabel && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className="admin-table-add-btn"
                onClick={onAdd}
              >
                {addLabel}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <Table
        className="admin-table"
        columns={resolvedColumns}
        dataSource={searchable ? filteredData : data}
        loading={loading}
        rowKey={rowKey}
        locale={locale}
        pagination={{
          current: page,
          pageSize,
          total: searchable ? filteredData.length : total,
          showSizeChanger: true,
          showQuickJumper: true,
          onChange: onPageChange,
          showTotal: (totalItems) =>
            `${t("admin.common.totalItems")} ${totalItems} ${t("admin.common.items")}`,
          size: "small",
        }}
        size="middle"
        scroll={{ x: "max-content" }}
      />
    </div>
  );
}

export default AdminTable;