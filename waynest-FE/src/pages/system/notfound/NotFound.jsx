import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import StatusPage from "@/components/shared/StatusPage";

const NotFound = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <StatusPage
      errorCode="404"
      errorcodeColor="red"
      title={t("statusPage.notFound.title", {
        defaultValue: "Oops! Page Not Found",
      })}
      subTitle={t("statusPage.notFound.subtitle", {
        defaultValue: "The page you are looking for doesn't exist.",
      })}
      buttonText={t("statusPage.notFound.button", {
        defaultValue: "Go Back",
      })}
      onButtonClick={() => navigate(-1)}
    />
  );
};

export default NotFound;
