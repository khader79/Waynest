import { Modal } from "antd";
import { useTranslation } from "react-i18next";
import { ExclamationCircleFilled } from "@ant-design/icons";
import "./DeleteConfirmModal.css";

interface DeleteConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  title?: string;
  content?: string;
  loading?: boolean;
}

function DeleteConfirmModal({
  open,
  onCancel,
  onConfirm,
  title,
  content,
  loading = false,
}: DeleteConfirmModalProps) {
  const { t } = useTranslation();
  const defaultTitle = title || t("admin.common.confirmDelete");
  const defaultContent = content || t("admin.common.deleteConfirmMessage");
  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  return (
    <Modal
      open={open}
      title={defaultTitle}
      onCancel={onCancel}
      onOk={handleConfirm}
      confirmLoading={loading}
      okText={t("admin.common.deleteButton")}
      okButtonProps={{ danger: true }}
      icon={<ExclamationCircleFilled className="delete-confirm-modal-icon" />}
    >
      <p>{defaultContent}</p>
    </Modal>
  );
}

export default DeleteConfirmModal;

