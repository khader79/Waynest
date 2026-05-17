import { useCallback, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { FiImage } from "react-icons/fi";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import { formatTripPlanDisplayName } from "@/utils/trips/formatTripPlanDisplayName";
import { ComposerPlaceField } from "./ComposerPlaceField";
import { SocialComposerSelect } from "./SocialComposerSelect";
import "@/components/provider/Composer.css";

const CreatePostCard = ({
  publishing,
  canPublish,
  savedPlans,
  savedPlansLoading,
  selectedTripPlanId,
  newPostTitle,
  newPostBody,
  newPostVisibility,
  postImages,
  uploadProgress,
  locationLabel,
  selectedPlace,
  onPublish,
  onPickPostImages,
  onRemovePostImage,
  setSelectedTripPlanId,
  setNewPostTitle,
  setNewPostBody,
  setNewPostVisibility,
  setLocationLabel,
  setSelectedPlace,
  setLocating,
  locating,
  showSavedPlanSelect = true,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const files = e.dataTransfer?.files;
      if (!files?.length) return;
      const synthetic = { target: { files, value: "" } };
      void onPickPostImages(synthetic);
    },
    [onPickPostImages],
  );

  const planOptions = useMemo(() => {
    const emptyLabel = savedPlansLoading
      ? t("social.feed.composer.loadingPlans", {
          defaultValue: "Loading plans…",
        })
      : savedPlans.length === 0
        ? t("social.feed.composer.noPlans", { defaultValue: "No saved plans" })
        : t("social.feed.composer.planOptional", {
            defaultValue: "No plan attached",
          });
    return [
      { value: "", label: emptyLabel },
      ...savedPlans.map((plan) => ({
        value: plan.id,
        label: formatTripPlanDisplayName(plan, t),
      })),
    ];
  }, [savedPlans, savedPlansLoading, t]);

  const { user } = useAuth();

  const visibilityOptions = useMemo(() => {
    const isProvider = user?.role === "PROVIDER";
    if (isProvider) {
      return [
        {
          value: "PUBLIC",
          label: t("social.feed.composer.visPublic", {
            defaultValue: "Public",
          }),
        },
        {
          value: "FOLLOWERS",
          label: t("social.feed.composer.visFollowers", {
            defaultValue: "Followers",
          }),
        },
      ];
    }
    return [
      {
        value: "PUBLIC",
        label: t("social.feed.composer.visPublic", { defaultValue: "Public" }),
      },
      {
        value: "FRIENDS",
        label: t("social.feed.composer.visFriends", {
          defaultValue: "Friends",
        }),
      },
      {
        value: "PRIVATE",
        label: t("social.feed.composer.visPrivate", {
          defaultValue: "Private",
        }),
      },
    ];
  }, [t, user]);

  const uploadBusy = uploadProgress > 0 && uploadProgress < 100;
  const publishDisabled = publishing || !canPublish || uploadBusy;

  return (
    <article className="social-composer">
      <div className="social-composer-header">
        <div>
          <p className="social-composer-eyebrow">
            {t("social.feed.composer.eyebrow", {
              defaultValue: "Publish to Waynest",
            })}
          </p>
          <h2>
            {t("social.feed.composer.title", {
              defaultValue: "Share your trip",
            })}
          </h2>
        </div>
        <p className="social-composer-helper">
          {t("social.feed.composer.helper", {
            defaultValue:
              "Write a note, add photos or a place, or attach a saved plan — publish what matters to you.",
          })}
        </p>
      </div>

      <div className="social-composer-stack">
        <label className="social-composer-field">
          <span className="social-composer-field__label">
            {t("social.feed.composer.postTitle", { defaultValue: "Title" })}
          </span>
          <input
            type="text"
            className="social-composer-field__input"
            placeholder={t("social.feed.composer.postTitlePlaceholder", {
              defaultValue: "Post title (optional)",
            })}
            value={newPostTitle}
            onChange={(event) => setNewPostTitle(event.target.value)}
          />
        </label>

        <label className="social-composer-field">
          <span className="social-composer-field__label">
            {t("social.feed.composer.bodyLabel", {
              defaultValue: "What’s on your mind?",
            })}
          </span>
          <textarea
            className="social-composer-field__textarea"
            placeholder={t("social.feed.composer.bodyPlaceholder", {
              defaultValue:
                "Write something about your trip, a tip, or a moment…",
            })}
            value={newPostBody}
            onChange={(event) => setNewPostBody(event.target.value)}
            rows={4}
          />
        </label>
      </div>

      <div className="social-composer-extras">
        <div className="social-composer-extra">
          <div className="social-composer-extra__head">
            <FiImage aria-hidden className="social-composer-extra__icon" />
            <span className="social-composer-extra__title">
              {t("social.feed.composer.imagesSection", {
                defaultValue: "Photos",
              })}
            </span>
          </div>
          <p className="social-composer-extra__hint">
            {t("social.feed.composer.imagesHint", {
              defaultValue: "PNG or JPG, up to 6 images · 5MB each",
            })}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="social-composer-file-input"
            onChange={onPickPostImages}
          />
          <button
            type="button"
            className={`social-composer-dropzone${dragOver ? " social-composer-dropzone--active" : ""}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={openFilePicker}
          >
            <FiImage aria-hidden className="social-composer-dropzone__glyph" />
            <span className="social-composer-dropzone__text">
              {t("social.feed.composer.dropzone", {
                defaultValue: "Drop images here or click to browse",
              })}
            </span>
          </button>
          {uploadBusy ? (
            <p className="social-composer-upload-status" role="status">
              {t("social.feed.composer.uploading", {
                defaultValue: "Uploading…",
              })}{" "}
              {uploadProgress}%
            </p>
          ) : null}
          {postImages.length > 0 ? (
            <div className="social-post-images-grid">
              {postImages.map((url, idx) => (
                <div key={`${url}-${idx}`} className="social-post-image-item">
                  <img
                    src={resolveMediaUrl(url)}
                    alt=""
                    className="social-post-image"
                  />
                  <button
                    type="button"
                    className="social-post-image-remove"
                    onClick={() => onRemovePostImage(idx)}
                  >
                    {t("social.feed.composer.removeImage", {
                      defaultValue: "Remove",
                    })}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <ComposerPlaceField
          value={locationLabel}
          onChange={setLocationLabel}
          selectedPlace={selectedPlace}
          onSelectPlace={setSelectedPlace}
          locating={locating}
          onLocatingChange={setLocating}
        />
      </div>

      <div className="social-composer-footer">
        {showSavedPlanSelect ? (
          <div className="social-composer-footer__field social-composer-footer__field--grow">
            <SocialComposerSelect
              id="composer-saved-plan"
              label={t("social.feed.composer.planLabel", {
                defaultValue: "Saved plan",
              })}
              value={selectedTripPlanId}
              onChange={setSelectedTripPlanId}
              options={planOptions}
              disabled={savedPlansLoading}
            />
          </div>
        ) : null}

        <div className="social-composer-footer__field social-composer-footer__field--narrow">
          <SocialComposerSelect
            id="composer-visibility"
            label={t("social.feed.composer.visibilityLabel", {
              defaultValue: "Who can see",
            })}
            value={newPostVisibility}
            onChange={setNewPostVisibility}
            options={visibilityOptions}
          />
        </div>

        <div className="social-composer-footer__submit-wrap">
          <button
            className="social-composer-submit"
            type="button"
            onClick={() => void onPublish()}
            disabled={publishDisabled}
          >
            {publishing
              ? t("social.feed.composer.publishing", {
                  defaultValue: "Publishing…",
                })
              : t("social.feed.composer.publish", { defaultValue: "Publish" })}
          </button>
        </div>
      </div>
    </article>
  );
};

export default CreatePostCard;
