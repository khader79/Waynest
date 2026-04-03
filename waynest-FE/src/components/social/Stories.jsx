import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { resolveMediaUrl } from "@/utils/mediaUrl";









const defaultBackground =
"https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=600&q=75&auto=format&fit=crop";

const Stories = ({
  stories,
  loading = false,
  onCreateStory,
  onViewStory,
  onDeleteStory,
  actorId,
}) => {
  const { t } = useTranslation();
  const [activeAuthorIndex, setActiveAuthorIndex] = useState(null);
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  const activeStoryGroup =
  activeAuthorIndex === null ? null : stories[activeAuthorIndex] ?? null;
  const activeStory = activeStoryGroup?.items[activeItemIndex] ?? null;

  const safeActiveAuthorIndex = activeAuthorIndex ?? -1;
  const canMovePrev = Boolean(activeStoryGroup && (activeItemIndex > 0 || safeActiveAuthorIndex > 0));
  const canMoveNext = Boolean(
    activeStoryGroup && (
    activeItemIndex < activeStoryGroup.items.length - 1 ||
    safeActiveAuthorIndex < stories.length - 1)
  );

  const progressValue = useMemo(() => {
    if (!activeStoryGroup) {
      return 0;
    }
    return (activeItemIndex + 1) / activeStoryGroup.items.length * 100;
  }, [activeItemIndex, activeStoryGroup]);

  useEffect(() => {
    if (!activeStory) {
      return;
    }

    void onViewStory?.(activeStory.id);

    const timer = window.setTimeout(() => {
      if (!canMoveNext) {
        setActiveAuthorIndex(null);
        setActiveItemIndex(0);
        return;
      }

      setActiveItemIndex((current) => {
        if (!activeStoryGroup) {
          return current;
        }
        if (current < activeStoryGroup.items.length - 1) {
          return current + 1;
        }
        setActiveAuthorIndex((authorIndex) =>
        authorIndex === null ? authorIndex : Math.min(authorIndex + 1, stories.length - 1)
        );
        return 0;
      });
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [activeStory, activeStoryGroup, canMoveNext, onViewStory, stories.length]);

  const openStory = (authorIndex) => {
    setActiveAuthorIndex(authorIndex);
    setActiveItemIndex(0);
  };

  const moveStory = (direction) => {
    if (!activeStoryGroup || activeAuthorIndex === null) {
      return;
    }

    if (direction === "prev") {
      if (activeItemIndex > 0) {
        setActiveItemIndex((current) => current - 1);
        return;
      }
      if (activeAuthorIndex > 0) {
        const previousAuthorIndex = activeAuthorIndex - 1;
        const previousGroup = stories[previousAuthorIndex];
        setActiveAuthorIndex(previousAuthorIndex);
        setActiveItemIndex(Math.max(previousGroup.items.length - 1, 0));
      }
      return;
    }

    if (activeItemIndex < activeStoryGroup.items.length - 1) {
      setActiveItemIndex((current) => current + 1);
      return;
    }

    if (activeAuthorIndex < stories.length - 1) {
      setActiveAuthorIndex(activeAuthorIndex + 1);
      setActiveItemIndex(0);
      return;
    }

    setActiveAuthorIndex(null);
    setActiveItemIndex(0);
  };

  return (
    <>
      <section
        className="fb3-storiesSection"
        aria-label={t("stories.sectionTitle", { defaultValue: "Stories" })}>
        <div className="fb3-sectionHeader">
          <div>
            <p className="fb3-sectionEyebrow">
              {t("stories.eyebrow", { defaultValue: "Traveler snapshots" })}
            </p>
            <h2 className="fb3-cardTitle">
              {t("stories.sectionTitle", { defaultValue: "Stories" })}
            </h2>
          </div>
        </div>

        <div className="fb3-storiesRow">
          <button
            type="button"
            className="fb3-storyTile fb3-storyCreateTile"
            onClick={onCreateStory}>
            <div className="fb3-storyCreateIcon">+</div>
            <span className="fb3-storyName">{t("stories.create", { defaultValue: "Create Story" })}</span>
          </button>

          {loading ?
          <div className="fb3-storyTile fb3-storyTile--empty">
              <span className="fb3-storyName">
                {t("common.loading", { defaultValue: "Loading…" })}
              </span>
            </div> :
          stories.length === 0 ?
          <div className="fb3-storyTile fb3-storyTile--empty">
              <span className="fb3-storyName">
                {t("stories.empty", {
                defaultValue: "No stories yet. Start the first traveler snapshot."
              })}
              </span>
            </div> :

          stories.map((story, index) => {
            const initial = story.authorName.trim().charAt(0).toUpperCase() || "U";
            const bg = resolveMediaUrl(story.latestImageUrl) || defaultBackground;
            return (
              <button
                key={story.authorId}
                type="button"
                className="fb3-storyTile"
                style={{ backgroundImage: `url(${bg})` }}
                onClick={() => openStory(index)}>
                  <div className="fb3-storyAvatarWrap">
                    <div className="fb3-storyAvatar" aria-hidden="true">
                      {story.avatarUrl ?
                    <img src={story.avatarUrl} alt={story.authorName} /> :

                    initial
                    }
                    </div>
                  </div>
                  <span className="fb3-storyName">{story.authorName}</span>
                </button>);

          })
          }
        </div>
      </section>

      {activeStory ?
      <div className="social-modalBackdrop" role="presentation" onClick={() => setActiveAuthorIndex(null)}>
          <div
          className="social-storyViewer"
          role="dialog"
          aria-modal="true"
          aria-label={t("stories.viewerTitle", { defaultValue: "Story viewer" })}
          onClick={(event) => event.stopPropagation()}>
            <div className="social-storyViewer__progress">
              <div
              className="social-storyViewer__progressBar"
              style={{ width: `${progressValue}%` }} />
            
            </div>

            <div className="social-storyViewer__mediaWrap">
              <img
              src={resolveMediaUrl(activeStory.imageUrl) || defaultBackground}
              alt={activeStory.caption || activeStoryGroup?.authorName || "Story"}
              className="social-storyViewer__media" />
            
              <button
              type="button"
              className="social-storyViewer__close"
              onClick={() => setActiveAuthorIndex(null)}>
                {t("common.close", { defaultValue: "Close" })}
              </button>
              {activeStory?.author?.id && actorId === activeStory.author.id ? (
                <button
                  type="button"
                  className="social-storyViewer__close"
                  style={{ right: "96px" }}
                  onClick={async () => {
                    await onDeleteStory?.(activeStory.id);
                    setActiveAuthorIndex(null);
                    setActiveItemIndex(0);
                  }}>
                  Delete
                </button>
              ) : null}
              <div className="social-storyViewer__overlay">
                <div>
                  <strong>{activeStoryGroup?.authorName}</strong>
                  <span>{new Date(activeStory.createdAt).toLocaleString()}</span>
                </div>
                {activeStory.caption ? <p>{activeStory.caption}</p> : null}
              </div>
            </div>

            <div className="social-storyViewer__actions">
              <button type="button" disabled={!canMovePrev} onClick={() => moveStory("prev")}>
                {t("stories.previous", { defaultValue: "Previous" })}
              </button>
              <button type="button" disabled={!canMoveNext} onClick={() => moveStory("next")}>
                {t("stories.next", { defaultValue: "Next" })}
              </button>
            </div>
          </div>
        </div> :
      null}
    </>);

};

export default Stories;