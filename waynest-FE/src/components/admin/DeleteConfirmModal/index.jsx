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
  loading = false
}) {
  const { t } = useTranslation();
  const defaultTitle = title || t("admin.common.confirmDelete");
  const defaultContent = content || t("admin.common.deleteConfirmMessage");
  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch {

      // Error handling is done in the parent component
    }};

  const modalTitle =
  <span>
      <ExclamationCircleFilled className="delete-confirm-modal-icon" />
      {defaultTitle}
    </span>;


  return (
    <Modal
      open={open}
      title={modalTitle}
      onCancel={onCancel}
      onOk={handleConfirm}
      confirmLoading={loading}
      okText={t("admin.common.deleteButton")}
      okButtonProps={{ danger: true }}
      className="delete-confirm-modal">
      
      <p>{defaultContent}</p>
    </Modal>);

}

export default DeleteConfirmModal;