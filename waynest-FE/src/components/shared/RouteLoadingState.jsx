import { useTranslation } from "react-i18next";
import "./RouteLoadingState.css";

export const RouteLoadingState = () => {
  const { t } = useTranslation();

  return (
    <div className="route-loading-state">
      <div className="route-loader">
        <div className="route-loader-ring" />
        <p>{t("routeLoading.loading", { defaultValue: "Loading…" })}</p>
      </div>
    </div>
  );
};
