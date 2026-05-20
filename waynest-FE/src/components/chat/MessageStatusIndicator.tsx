import React from "react";
import { FiCheck, FiLoader } from "react-icons/fi";
import styles from "./MessageStatusIndicator.module.css";

interface MessageStatusIndicatorProps {
  status: "pending" | "sent" | "delivered" | "seen";
  isLoading?: boolean;
}

export const MessageStatusIndicator: React.FC<MessageStatusIndicatorProps> = ({
  status,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <span
        className={`${styles.indicator} ${styles.pending}`}
        title="Sending message">
        <FiLoader className={styles.icon} />
      </span>
    );
  }

  switch (status) {
    case "pending":
      return (
        <span
          className={`${styles.indicator} ${styles.pending}`}
          title="Pending">
          <FiLoader className={styles.icon} />
        </span>
      );
    case "sent":
      return (
        <span className={`${styles.indicator} ${styles.sent}`} title="Sent">
          <FiCheck className={styles.icon} />
        </span>
      );
    case "delivered":
      return (
        <span
          className={`${styles.indicator} ${styles.delivered}`}
          title="Delivered">
          <div className={styles.doubleCheck}>
            <FiCheck className={styles.icon} />
            <FiCheck className={styles.icon} />
          </div>
        </span>
      );
    case "seen":
      return (
        <span className={`${styles.indicator} ${styles.seen}`} title="Seen">
          <div className={styles.doubleCheck}>
            <FiCheck className={styles.icon} />
            <FiCheck className={styles.icon} />
          </div>
        </span>
      );
    default:
      return null;
  }
};
