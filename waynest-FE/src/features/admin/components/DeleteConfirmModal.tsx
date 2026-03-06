import { Modal } from "antd";
import { ExclamationCircleFilled } from "@ant-design/icons";

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
  title = "Confirm Delete",
  content = "Are you sure you want to delete this item? This action cannot be undone.",
  loading = false,
}: DeleteConfirmModalProps) {
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
      title={title}
      onCancel={onCancel}
      onOk={handleConfirm}
      confirmLoading={loading}
      okText="Delete"
      okButtonProps={{ danger: true }}
      icon={<ExclamationCircleFilled style={{ color: "#ff4d4f" }} />}
    >
      <p>{content}</p>
    </Modal>
  );
}

export default DeleteConfirmModal;
