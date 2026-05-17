import { useTranslation } from "react-i18next";
import ProviderPostComposer from "@/components/provider/ProviderPostComposer";
import "@/pages/providerPanel.css";
import "@/pages/provider/ProviderCreatePostTweaks.css";

const ProviderCreatePostPage = () => {
  const { t } = useTranslation();

  return (
    <section className="provider-panel-page provider-create-post">
      <div className="provider-panel-header">
        <h1 className="provider-panel-title">
          {t("provider.createPost.title", { defaultValue: "Create post" })}
        </h1>
        <p className="provider-panel-subtitle">
          {t("provider.createPost.subtitle", {
            defaultValue:
              "Share updates, offers, or announcements with your guests.",
          })}
        </p>
      </div>
      <div className="provider-create-post__composer-wrap">
        <ProviderPostComposer />
      </div>
    </section>
  );
};

export default ProviderCreatePostPage;
