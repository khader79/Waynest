import { useTranslation } from "react-i18next";
import PanelLayout from "@/layouts/PanelLayout";

const AdminLayout = () => {
  const { t } = useTranslation();
  return <PanelLayout role="admin" title={t("adminLayout.title")} />;
};

export default AdminLayout;
