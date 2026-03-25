import type { Dispatch, SetStateAction } from "react";
import type { SocialPostVisibility } from "@/services/social/social.service";
import type { TripPlanSummary } from "@/features/trip-planner/types";
import { useTranslation } from "react-i18next";

type CreatePostCardProps = {
  publishing: boolean;
  hasComposerContent: boolean;
  savedPlans: TripPlanSummary[];
  savedPlansLoading: boolean;
  selectedTripPlanId: string;
  newPostTitle: string;
  newPostBody: string;
  newPostVisibility: SocialPostVisibility;
  onPublish: () => Promise<void>;
  setSelectedTripPlanId: Dispatch<SetStateAction<string>>;
  setNewPostTitle: Dispatch<SetStateAction<string>>;
  setNewPostBody: Dispatch<SetStateAction<string>>;
  setNewPostVisibility: Dispatch<SetStateAction<SocialPostVisibility>>;
};

const CreatePostCard = ({
  publishing,
  hasComposerContent,
  savedPlans,
  savedPlansLoading,
  selectedTripPlanId,
  newPostTitle,
  newPostBody,
  newPostVisibility,
  onPublish,
  setSelectedTripPlanId,
  setNewPostTitle,
  setNewPostBody,
  setNewPostVisibility,
}: CreatePostCardProps) => {
  const { t } = useTranslation();

  return (
    <article className="social-composer">
      <h2>{t("social.feed.composer.title", { defaultValue: "Share your trip" })}</h2>
      <input
        type="text"
        placeholder={t("social.feed.composer.postTitle", {
          defaultValue: "Post title (optional)",
        })}
        value={newPostTitle}
        onChange={(event) => setNewPostTitle(event.target.value)}
      />
      <textarea
        placeholder={t("social.feed.composer.bodyPlaceholder", {
          defaultValue: "Write something about your plan...",
        })}
        value={newPostBody}
        onChange={(event) => setNewPostBody(event.target.value)}
      />

      <div className="social-composer-row">
        <select
          value={selectedTripPlanId}
          onChange={(event) => setSelectedTripPlanId(event.target.value)}
          disabled={savedPlansLoading || savedPlans.length === 0}>
          {savedPlans.length === 0 ? (
            <option value="">
              {savedPlansLoading
                ? t("social.feed.composer.loadingPlans", { defaultValue: "Loading plans..." })
                : t("social.feed.composer.noPlans", {
                    defaultValue: "No saved plans available",
                  })}
            </option>
          ) : (
            savedPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title || `Trip Plan ${plan.id.slice(0, 6)}`}
              </option>
            ))
          )}
        </select>

        <select
          value={newPostVisibility}
          onChange={(event) =>
            setNewPostVisibility(event.target.value as SocialPostVisibility)
          }>
          <option value="PUBLIC">Public</option>
          <option value="FOLLOWERS">Followers</option>
          <option value="PRIVATE">Private</option>
        </select>

        <button
          type="button"
          onClick={() => void onPublish()}
          disabled={publishing || !hasComposerContent || !selectedTripPlanId}>
          {publishing
            ? t("social.feed.composer.publishing", { defaultValue: "Publishing..." })
            : t("social.feed.composer.publish", { defaultValue: "Publish" })}
        </button>
      </div>
    </article>
  );
};

export default CreatePostCard;

