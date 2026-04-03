


import { useTranslation } from "react-i18next";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import { formatTripPlanDisplayName } from "@/utils/trips/formatTripPlanDisplayName";

















const CreatePostCard = ({
  publishing,
  hasComposerContent,
  savedPlans,
  savedPlansLoading,
  selectedTripPlanId,
  newPostTitle,
  newPostBody,
  newPostVisibility,
  postImages,
  uploadProgress,
  onPublish,
  onPickPostImages,
  onRemovePostImage,
  setSelectedTripPlanId,
  setNewPostTitle,
  setNewPostBody,
  setNewPostVisibility
}) => {
  const { t } = useTranslation();

  return (
    <article className="social-composer">
      <div className="social-composer-header">
        <div>
          <p className="social-composer-eyebrow">
            {t("social.feed.composer.eyebrow", { defaultValue: "Publish to Waynest" })}
          </p>
          <h2>{t("social.feed.composer.title", { defaultValue: "Share your trip" })}</h2>
        </div>
        <p className="social-composer-helper">
          {t("social.feed.composer.helper", {
            defaultValue: "Attach a saved AI route, add context, and post it to the traveler network."
          })}
        </p>
      </div>
      <input
        type="text"
        placeholder={t("social.feed.composer.postTitle", {
          defaultValue: "Post title (optional)"
        })}
        value={newPostTitle}
        onChange={(event) => setNewPostTitle(event.target.value)} />
      
      <textarea
        placeholder={t("social.feed.composer.bodyPlaceholder", {
          defaultValue: "Write something about your plan..."
        })}
        value={newPostBody}
        onChange={(event) => setNewPostBody(event.target.value)} />

      <div className="social-formField">
        <span>{t("social.feed.composer.images", { defaultValue: "Post images" })}</span>
        <input type="file" accept="image/*" multiple onChange={onPickPostImages} />
        {uploadProgress > 0 && uploadProgress < 100 ? (
          <small>{t("social.feed.composer.uploading", { defaultValue: "Uploading..." })} {uploadProgress}%</small>
        ) : null}
        {postImages.length > 0 ? (
          <div className="social-post-images-grid">
            {postImages.map((url, idx) => (
              <div key={`${url}-${idx}`} className="social-post-image-item">
                <img src={resolveMediaUrl(url)} alt={`post-${idx}`} className="social-post-image" />
                <button type="button" onClick={() => onRemovePostImage(idx)}>Remove</button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      

      <div className="social-composer-row">
        <select
          value={selectedTripPlanId}
          onChange={(event) => setSelectedTripPlanId(event.target.value)}
          disabled={savedPlansLoading || savedPlans.length === 0}>
          {savedPlans.length === 0 ?
          <option value="">
              {savedPlansLoading ?
            t("social.feed.composer.loadingPlans", { defaultValue: "Loading plans..." }) :
            t("social.feed.composer.noPlans", {
              defaultValue: "No saved plans available"
            })}
            </option> :

          savedPlans.map((plan) =>
          <option key={plan.id} value={plan.id}>
                {formatTripPlanDisplayName(plan, t)}
              </option>
          )
          }
        </select>

        <select
          value={newPostVisibility}
          onChange={(event) =>
          setNewPostVisibility(event.target.value)
          }>
          <option value="PUBLIC">Public</option>
          <option value="FOLLOWERS">Followers</option>
          <option value="PRIVATE">Private</option>
        </select>

        <button
          className="social-composer-submit"
          type="button"
          onClick={() => void onPublish()}
          disabled={publishing || !hasComposerContent || !selectedTripPlanId || (uploadProgress > 0 && uploadProgress < 100)}>
          {publishing ?
          t("social.feed.composer.publishing", { defaultValue: "Publishing..." }) :
          t("social.feed.composer.publish", { defaultValue: "Publish" })}
        </button>
      </div>
    </article>);

};

export default CreatePostCard;