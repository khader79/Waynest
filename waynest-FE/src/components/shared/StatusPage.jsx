import { useTranslation } from "react-i18next";
import { FiHome } from "react-icons/fi";
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
    <div className="status-page">
      <div className="status-page__bg" />
      <div className="status-page__card">
        {errorCode && (
          <h1 className={`status-page__code ${errorcodeColor ?? ""}`}>
            {errorCode}
          </h1>
        )}
        <h2 className="status-page__title">{title}</h2>
        <p className="status-page__desc">{subTitle}</p>
        <button onClick={onButtonClick} className="status-page__btn">
          <FiHome size={16} />
          {resolvedButtonText}
        </button>
      </div>
    </div>
  );
};

export default StatusPage;
