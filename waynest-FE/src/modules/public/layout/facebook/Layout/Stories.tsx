import { useMemo } from "react";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import type { SocialPost } from "@/services/social/social.service";

type StoryTile = {
  key: string;
  name: string;
  avatarUrl: string | null;
  backgroundUrl: string | null;
};

const defaultBackground =
  "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=600&q=75&auto=format&fit=crop";

type StoriesProps = {
  posts: SocialPost[];
};

const Stories = ({ posts }: StoriesProps) => {
  const { t } = useTranslation();

  const stories = useMemo(() => {
    const map = new Map<string, StoryTile>();
    (posts ?? []).forEach((post) => {
      const authorKey = String(post.author?.id ?? post.authorId ?? "");
      if (!authorKey || map.has(authorKey)) return;

      const name =
        post.author?.username ??
        t("social.feed.traveler", { defaultValue: "Traveler" });

      const avatarUrl = post.author?.avatarUrl ?? null;
      map.set(authorKey, {
        key: authorKey,
        name,
        avatarUrl,
        backgroundUrl: avatarUrl,
      });
    });

    return Array.from(map.values()).slice(0, 10);
  }, [posts, t]);

  const onCreateStory = () => {
    toast.info(t("stories.createComingSoon", { defaultValue: "Story creation coming soon." }));
  };

  return (
    <section aria-label={t("stories.sectionTitle", { defaultValue: "Stories" })}>
      <div className="fb3-storiesRow">
        <button
          type="button"
          className="fb3-storyTile fb3-storyCreateTile"
          onClick={onCreateStory}>
          <div className="fb3-storyCreateIcon">+</div>
          <span className="fb3-storyName">{t("stories.create", { defaultValue: "Create Story" })}</span>
        </button>

        {stories.map((story) => {
          const initial = story.name.trim().charAt(0).toUpperCase() || "U";
          const bg = story.backgroundUrl ?? defaultBackground;
          return (
            <div
              key={story.key}
              className="fb3-storyTile"
              style={{ backgroundImage: `url(${bg})` }}>
              <div className="fb3-storyAvatarWrap">
                <div className="fb3-storyAvatar" aria-hidden="true">
                  {story.avatarUrl ? (
                    <img src={story.avatarUrl} alt={story.name} />
                  ) : (
                    initial
                  )}
                </div>
              </div>
              <span className="fb3-storyName">{story.name}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Stories;

