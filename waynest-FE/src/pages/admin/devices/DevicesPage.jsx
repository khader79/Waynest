import DevicesManager from "@/components/admin/DevicesManager";
import "./DevicesPage.css";

const DevicesPage = () => {
  return (
    <div className="admin-devices-page">
      <h1 className="admin-devices-title">Admin Devices</h1>
      <p className="admin-devices-subtitle">
        Manage allowed devices (fingerprints) that can sign in as admin.
      </p>
      <DevicesManager />
    </div>);

};

export default DevicesPage;