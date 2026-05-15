import { useTranslation } from "react-i18next";
import DevicesManager from "@/components/admin/DevicesManager";
import "./DevicesPage.css";

const DevicesPage = () => {
  const { t } = useTranslation();
  return (
    <div className="crud-page">
      <div className="crud-page-header">
        <div className="crud-page-header-left">
          <h1 className="crud-page-title">
            {t("admin.devices.devicesPageTitle", "Devices")}
          </h1>
          <p className="crud-page-subtitle">
            {t("admin.devices.subtitle", {
              defaultValue: "Manage registered devices",
            })}
          </p>
        </div>
      </div>
      <DevicesManager />
    </div>
  );
};

export default DevicesPage;
