// React import not needed with the automatic JSX runtime
import { useIsMutating } from "@tanstack/react-query";
import { Spin } from "antd";
import "./AdminNetworkOverlay.css";

export default function AdminNetworkOverlay() {
  const mutatingCount = useIsMutating();

  if (!mutatingCount) return null;

  return (
    <div className="admin-network-overlay" aria-live="polite">
      <div className="admin-network-overlay-inner">
        <Spin />
        <div className="admin-network-overlay-text">Processing…</div>
      </div>
    </div>
  );
}
