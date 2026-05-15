import React from "react";
import { useTranslation } from "react-i18next";
import { FiCheckCircle } from "react-icons/fi";
import "./VerifiedBadge.css";

type Props = {
  size?: number;
  className?: string;
  title?: string;
};

const VerifiedBadge: React.FC<Props> = ({
  size = 14,
  className = "",
  title: propTitle,
}) => {
  const { t } = useTranslation();
  const title = propTitle || t("common.verifiedPlace");
  return (
    <span
      className={`verified-badge ${className}`}
      title={title}
      aria-label={title}>
      <FiCheckCircle size={size} />
    </span>
  );
};

export default VerifiedBadge;
