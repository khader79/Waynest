import { useTranslation } from "react-i18next";
import PanelLayout from "@/layouts/PanelLayout";

const AdminLayout = () => {
  const { t } = useTranslation();
  return (
    <PanelLayout
      role="admin"
      title={t("admin.controlCenter", { defaultValue: "Admin control center" })}
    />
  );
};

export default AdminLayout;
