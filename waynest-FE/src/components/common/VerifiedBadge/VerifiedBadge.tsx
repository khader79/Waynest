import React from "react";
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
  title = "Verified place",
}) => {
  return (
    <span className={`verified-badge ${className}`} title={title} aria-label={title}>
      <FiCheckCircle size={size} />
    </span>
  );
};

export default VerifiedBadge;
