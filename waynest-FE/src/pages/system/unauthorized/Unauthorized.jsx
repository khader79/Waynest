import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { getDefaultDashboardPath } from "@/utils/routing";
import StatusPage from "@/components/shared/StatusPage";

const Unauthorized = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { t } = useTranslation();

  const handleBack = () => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    const target = getDefaultDashboardPath(user?.role);
    navigate(target, { replace: true });
  };

  return (
    <StatusPage
      errorCode="401"
      errorcodeColor="orange"
      title={t("statusPage.unauthorized.title", {
        defaultValue: "Access Denied",
      })}
      subTitle={t("statusPage.unauthorized.subtitle", {
        defaultValue: "You don't have permission to view this page.",
      })}
      buttonText={t("statusPage.unauthorized.button", {
        defaultValue: "Go Back",
      })}
      onButtonClick={handleBack}
    />
  );
};

export default Unauthorized;
