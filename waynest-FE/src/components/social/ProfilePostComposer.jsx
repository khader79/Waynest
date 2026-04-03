import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/utils/errors";
import { useAuth } from "@/context/AuthContext";
import { extractTripPlans } from "@/utils/trips/dataNormalizers";
import { createSocialPost, uploadImage } from "@/services/social/social.service";
import { fetchSavedTripPlans } from "@/api/trips";
import CreatePostCard from "./CreatePostCard";

/**
 * Publish trip posts — only mounted on the viewer's own social profile (`/u/:username`).
 */
const ProfilePostComposer = ({ onPublished }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const [savedPlans, setSavedPlans] = useState([]);
  const [savedPlansLoading, setSavedPlansLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [newPostBody, setNewPostBody] = useState("");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [selectedTripPlanId, setSelectedTripPlanId] = useState("");
  const [newPostVisibility, setNewPostVisibility] = useState("PUBLIC");
  const [postImages, setPostImages] = useState([]);
  const [postUploadProgress, setPostUploadProgress] = useState(0);

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
        if (plans.length > 0) {
          setSelectedTripPlanId((c) => c || plans[0].id);
        }
      } catch (error) {
        setSavedPlans([]);
        toast.error(getApiErrorMessage(error, "Failed to load saved plans"));
      } finally {
        setSavedPlansLoading(false);
      }
    };

    void loadSavedPlans();
  }, [isAuthenticated]);

  const publish = async () => {
    if (!isAuthenticated) {
      toast.info("Login first");
      return;
    }
    if (!selectedTripPlanId) {
      toast.info("Select a plan first");
      return;
    }
    try {
      setPublishing(true);
      await createSocialPost({
        body: newPostBody.trim() || undefined,
        imageUrls: postImages,
        title: newPostTitle.trim() || undefined,
        tripPlanId: selectedTripPlanId,
        visibility: newPostVisibility,
      });
      setNewPostBody("");
      setNewPostTitle("");
      setPostImages([]);
      toast.success(t("social.feed.publishedToast", { defaultValue: "Published!" }));
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
        nextUrls.push(uploaded.url);
      }
      setPostImages((current) => [...current, ...nextUrls].slice(0, 6));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Image upload failed"));
    } finally {
      setPostUploadProgress(0);
      event.target.value = "";
    }
  };

  const hasComposerContent = useMemo(
    () => Boolean(newPostBody || newPostTitle || selectedTripPlanId),
    [newPostBody, newPostTitle, selectedTripPlanId],
  );

  return (
    <CreatePostCard
      publishing={publishing}
      hasComposerContent={hasComposerContent}
      savedPlans={savedPlans}
      savedPlansLoading={savedPlansLoading}
      selectedTripPlanId={selectedTripPlanId}
      newPostTitle={newPostTitle}
      newPostBody={newPostBody}
      newPostVisibility={newPostVisibility}
      postImages={postImages}
      uploadProgress={postUploadProgress}
      onPublish={publish}
      onPickPostImages={handlePickPostImages}
      onRemovePostImage={(index) =>
        setPostImages((current) => current.filter((_, idx) => idx !== index))
      }
      setSelectedTripPlanId={setSelectedTripPlanId}
      setNewPostTitle={setNewPostTitle}
      setNewPostBody={setNewPostBody}
      setNewPostVisibility={setNewPostVisibility}
    />
  );
};

export default ProfilePostComposer;
