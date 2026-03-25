import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const CommunityTabPlaceholder = () => {
  const { t } = useTranslation();
  const { tab = "" } = useParams();

  const title = useMemo(() => {
    const cleaned = String(tab).trim().toLowerCase();
    if (!cleaned) return t("community.placeholder.title", { defaultValue: "Community" });

    const map: Record<string, string> = {
      friends: t("community.tabs.friends", { defaultValue: "Friends" }),
      memories: t("community.tabs.memories", { defaultValue: "Memories" }),
      groups: t("community.tabs.groups", { defaultValue: "Groups" }),
      video: t("community.tabs.video", { defaultValue: "Video" }),
      marketplace: t("community.tabs.marketplace", { defaultValue: "Marketplace" }),
      events: t("community.tabs.events", { defaultValue: "Events" }),
    };

    return map[cleaned] ?? cleaned;
  }, [tab, t]);

  return (
    <section className="social-feed-page">
      <div className="social-feed-header">
        <h1>{title}</h1>
        <Link to="/social" className="social-feed-header__link-back" style={{ marginLeft: "auto" }}>
          {t("community.placeholder.backToSocial", { defaultValue: "Back to Social" })}
        </Link>
      </div>

      <article className="social-composer" style={{ marginTop: 16 }}>
        <p className="social-empty" style={{ margin: 0 }}>
          {t("community.placeholder.description", {
            defaultValue:
              "This section is coming soon. In the meantime, use Social Feed for sharing travel plans.",
          })}
        </p>
      </article>
    </section>
  );
};

export default CommunityTabPlaceholder;

