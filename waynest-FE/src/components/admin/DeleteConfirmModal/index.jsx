import { Modal } from "antd";
import { useTranslation } from "react-i18next";
import { ExclamationCircleFilled } from "@ant-design/icons";
import "./DeleteConfirmModal.css";

function DeleteConfirmModal({
  open,
  onCancel,
  onConfirm,
  title,
  content,
  loading = false,
  itemName,
}) {
  const { t } = useTranslation();
  const defaultTitle = title || t("admin.common.confirmDelete");
  const defaultContent =
    content ||
    (itemName
      ? t("admin.common.deleteConfirmWithName", {
          name: itemName,
          defaultValue: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
        })
      : t("admin.common.deleteConfirmMessage"));

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch {
      // Error handling is done in the parent component
    }
  };

  return (
    <Modal
      open={open}
      title={
        <span className="delete-confirm-modal-title">
          <ExclamationCircleFilled className="delete-confirm-modal-icon" />
          {defaultTitle}
        </span>
      }
      onCancel={onCancel}
      onOk={handleConfirm}
      confirmLoading={loading}
      okText={t("admin.common.deleteButton")}
      okButtonProps={{ danger: true }}
      cancelText={t("admin.common.cancel")}
      className="delete-confirm-modal"
      centered
      width={420}
    >
      <div className="delete-confirm-modal-body">
        <p className="delete-confirm-modal-content">{defaultContent}</p>
      </div>
    </Modal>
  );
}

export default DeleteConfirmModal;