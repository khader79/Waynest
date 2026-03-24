import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/core/utils/errors";
import { fetchSocialFeed, type SocialPost } from "@/services/social/social.service";
import "./SocialFeed.css";

const ProviderSocialProfile = () => {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const [posts, setPosts] = useState<SocialPost[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await fetchSocialFeed("providers");
        setPosts(Array.isArray(payload) ? payload : []);
      } catch (error) {
        toast.error(
          getApiErrorMessage(
            error,
            t("social.providerProfile.loadFailed", {
              defaultValue: "Failed to load provider profile",
            }),
          ),
        );
      }
    };
    void load();
  }, [id]);

  const providerPosts = useMemo(
    () => posts.filter((post) => post.provider?.id === id || post.providerId === id),
    [posts, id],
  );

  return (
    <section className="social-feed-page">
      <h1>{t("social.providerProfile.title", { defaultValue: "Provider Profile" })}</h1>
      <p className="social-empty">
        {t("social.providerProfile.subtitle", {
          defaultValue: "Posts, places, and events highlights from this provider.",
        })}
      </p>
      <div className="social-post-list">
        {providerPosts.map((post) => (
          <article key={post.id} className="social-post-card">
            <h3>
              {post.title ||
                t("social.providerProfile.postFallback", { defaultValue: "Provider update" })}
            </h3>
            <p>{post.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default ProviderSocialProfile;

