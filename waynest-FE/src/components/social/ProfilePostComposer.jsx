import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/utils/errors";
import { useAuth } from "@/context/AuthContext";
import { extractTripPlans } from "@/utils/trips/dataNormalizers";
import {
  createSocialPost,
  uploadImage,
} from "@/services/social/social.service";
import { fetchSavedTripPlans } from "@/api/trips";
import CreatePostCard from "./CreatePostCard";

/**
 * Publish trip posts — only mounted on the viewer's own social profile (`/u/:username`).
 */
const ProfilePostComposer = ({ onPublished, initialTripPlanId = "" }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const [savedPlans, setSavedPlans] = useState([]);
  const [savedPlansLoading, setSavedPlansLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [newPostBody, setNewPostBody] = useState("");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [selectedTripPlanId, setSelectedTripPlanId] = useState("");
  const [newPostVisibility, setNewPostVisibility] = useState("PUBLIC");
  const [postImages, setPostImages] = useState([]);
  const [postUploadProgress, setPostUploadProgress] = useState(0);
  const [locationLabel, setLocationLabel] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(
    /** @type {{ placeId: string; label: string; lat: number; lng: number; slug: string } | null} */ (
      null
    ),
  );

  useEffect(() => {
    if (initialTripPlanId) {
      setSelectedTripPlanId(initialTripPlanId);
    }
  }, [initialTripPlanId]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSavedPlans([]);
      setSelectedTripPlanId("");
      return;
    }

    const loadSavedPlans = async () => {
      try {
        setSavedPlansLoading(true);
        const payload = await fetchSavedTripPlans();
        const plans = extractTripPlans(payload).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
        setSavedPlans(plans);
      } catch (error) {
        setSavedPlans([]);
        toast.error(getApiErrorMessage(error, "Failed to load saved plans"));
      } finally {
        setSavedPlansLoading(false);
      }
    };

    void loadSavedPlans();
  }, [isAuthenticated]);

  const canPublish = useMemo(() => {
    const text = Boolean(newPostBody.trim() || newPostTitle.trim());
    const hasTrip = Boolean(selectedTripPlanId);
    const hasImgs = postImages.length > 0;
    const hasLoc = Boolean(selectedPlace || locationLabel.trim());
    return text || hasTrip || hasImgs || hasLoc;
  }, [
    newPostBody,
    newPostTitle,
    selectedTripPlanId,
    postImages,
    locationLabel,
    selectedPlace,
  ]);

  const publish = async () => {
    if (!isAuthenticated) {
      toast.info("Login first");
      return;
    }
    if (!canPublish) {
      toast.info(
        t("social.feed.composer.needContent", {
          defaultValue: "Add text, photos, a place, or attach a saved plan",
        }),
      );
      return;
    }
    try {
      setPublishing(true);
      const placeId = selectedPlace?.placeId;
      await createSocialPost({
        body: newPostBody.trim() || undefined,
        imageUrls: postImages.length ? postImages : undefined,
        title: newPostTitle.trim() || undefined,
        tripPlanId: selectedTripPlanId || undefined,
        visibility: newPostVisibility,
        placeId: placeId || undefined,
        locationLabel:
          !placeId && locationLabel.trim() ? locationLabel.trim() : undefined,
      });
      setNewPostBody("");
      setNewPostTitle("");
      setPostImages([]);
      setLocationLabel("");
      setSelectedPlace(null);
      setSelectedTripPlanId("");
      toast.success(
        t("social.feed.publishedToast", { defaultValue: "Published!" }),
      );
      onPublished?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Publish failed"));
    } finally {
      setPublishing(false);
    }
  };

  const handlePickPostImages = async (event) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const nextUrls = [];
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          toast.error("Only image files are allowed");
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error("Image size must be less than 5MB");
          continue;
        }
        const uploaded = await uploadImage(file, setPostUploadProgress);
        nextUrls.push(uploaded.path);
      }
      setPostImages((current) => [...current, ...nextUrls].slice(0, 6));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Image upload failed"));
    } finally {
      setPostUploadProgress(0);
      event.target.value = "";
    }
  };

  return (
    <CreatePostCard
      publishing={publishing}
      canPublish={canPublish}
      savedPlans={savedPlans}
      savedPlansLoading={savedPlansLoading}
      selectedTripPlanId={selectedTripPlanId}
      newPostTitle={newPostTitle}
      newPostBody={newPostBody}
      newPostVisibility={newPostVisibility}
      postImages={postImages}
      uploadProgress={postUploadProgress}
      locationLabel={locationLabel}
      selectedPlace={selectedPlace}
      onPublish={publish}
      onPickPostImages={handlePickPostImages}
      onRemovePostImage={(index) =>
        setPostImages((current) => current.filter((_, idx) => idx !== index))
      }
      setSelectedTripPlanId={setSelectedTripPlanId}
      setNewPostTitle={setNewPostTitle}
      setNewPostBody={setNewPostBody}
      setNewPostVisibility={setNewPostVisibility}
      setLocationLabel={setLocationLabel}
      setSelectedPlace={setSelectedPlace}
      setLocating={setLocating}
      locating={locating}
    />
  );
};

export default ProfilePostComposer;
