import { useTranslation } from "react-i18next";
import "./StatusPage.css";

const StatusPage = ({
  title,
  subTitle,
  errorCode,
  buttonText,
  onButtonClick,
  errorcodeColor,
}) => {
  const { t } = useTranslation();
  const resolvedButtonText =
    buttonText ?? t("statusPage.backHome", { defaultValue: "Back Home" });

  return (
    <div className="status-page-container container-center">
      {errorCode && <h1 className={errorcodeColor}>{errorCode}</h1>}
      <h2>{title}</h2>
      <p>{subTitle}</p>
      <button onClick={onButtonClick} className="btn-primary">
        {resolvedButtonText}
      </button>
    </div>
  );
};

export default StatusPage;
