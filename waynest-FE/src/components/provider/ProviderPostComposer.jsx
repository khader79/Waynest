import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { fetchProviderEvents, fetchProviderPlaces } from "@/api/provider";
import {
  createProviderPost,
  uploadImage,
} from "@/services/social/social.service";
import { getApiErrorMessage } from "@/utils/errors";
import CreatePostCard from "@/components/social/CreatePostCard";

const formatPlaceLabel = (place) => {
  const city = place?.city?.name?.trim();
  const name = place?.name?.trim() ?? "";
  return city ? `${name}, ${city}` : name;
};

const formatEventLabel = (event) => {
  if (!event) return "";
  const date =
    event.startDate && typeof event.startDate === "string"
      ? new Date(event.startDate).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";
  return `${event.title}${date ? ` · ${date}` : ""}`;
};

const ProviderPostComposer = ({ onPublished }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const [places, setPlaces] = useState([]);
  const [events, setEvents] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);

  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [locationLabel, setLocationLabel] = useState("");

  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostBody, setNewPostBody] = useState("");
  const [newPostVisibility, setNewPostVisibility] = useState("PUBLIC");
  const [postImages, setPostImages] = useState([]);
  const [postUploadProgress, setPostUploadProgress] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedTripPlanId] = useState("");

  useEffect(() => {
    let active = true;
    setPlacesLoading(true);
    void fetchProviderPlaces()
      .then((payload) => {
        if (!active) return;
        const rows = Array.isArray(payload)
          ? payload
          : payload &&
              typeof payload === "object" &&
              Array.isArray(payload.data)
            ? payload.data
            : [];
        setPlaces(rows.filter(Boolean));
      })
      .catch((error) => {
        if (active) {
          setPlaces([]);
          toast.error(
            getApiErrorMessage(
              error,
              t("provider.businessFeed.placesLoadFailed", {
                defaultValue: "Could not load your places",
              }),
            ),
          );
        }
      })
      .finally(() => {
        if (active) {
          setPlacesLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    let active = true;
    setEventsLoading(true);
    void fetchProviderEvents()
      .then((payload) => {
        if (!active) return;
        const rows = Array.isArray(payload)
          ? payload
          : payload &&
              typeof payload === "object" &&
              Array.isArray(payload.data)
            ? payload.data
            : [];
        setEvents(rows.filter(Boolean));
      })
      .catch((error) => {
        if (active) {
          setEvents([]);
          toast.error(
            getApiErrorMessage(
              error,
              t("provider.businessFeed.eventsLoadFailed", {
                defaultValue: "Could not load your events",
              }),
            ),
          );
        }
      })
      .finally(() => {
        if (active) {
          setEventsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [t]);

  const placeButtons = useMemo(() => places.slice(0, 6), [places]);
  const canPublish = useMemo(() => {
    const hasText = Boolean(newPostBody.trim() || newPostTitle.trim());
    const hasImages = postImages.length > 0;
    const hasLocation = Boolean(selectedPlace || locationLabel.trim());
    const hasEvent = Boolean(selectedEventId);
    return hasText || hasImages || hasLocation || hasEvent;
  }, [
    newPostBody,
    newPostTitle,
    postImages,
    selectedPlace,
    locationLabel,
    selectedEventId,
  ]);

  const resetForm = () => {
    setNewPostBody("");
    setNewPostTitle("");
    setPostImages([]);
    setSelectedPlace(null);
    setLocationLabel("");
    setSelectedEventId("");
    setNewPostVisibility("PUBLIC");
  };

  const handlePickPostImages = async (event) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const nextUrls = [];
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          toast.error(
            t("social.feed.composer.invalidImage", {
              defaultValue: "Only image files are allowed",
            }),
          );
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(
            t("social.feed.composer.imageTooLarge", {
              defaultValue: "Image size must be less than 5MB",
            }),
          );
          continue;
        }
        const uploaded = await uploadImage(file, setPostUploadProgress);
        nextUrls.push(uploaded.path);
      }
      setPostImages((current) => [...current, ...nextUrls].slice(0, 6));
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("provider.businessFeed.imageUploadFailed", {
            defaultValue: "Image upload failed",
          }),
        ),
      );
    } finally {
      setPostUploadProgress(0);

      event.target.value = "";
    }
  };

  const handlePlaceSelect = (place) => {
    const label = formatPlaceLabel(place);
    if (!label) return;
    setSelectedPlace({
      placeId: place.id,
      label,
      lat: Number.isFinite(Number(place.latitude))
        ? Number(place.latitude)
        : undefined,
      lng: Number.isFinite(Number(place.longitude))
        ? Number(place.longitude)
        : undefined,
      slug: place.slug,
    });
    setLocationLabel(label);
  };

  const publish = async () => {
    if (!isAuthenticated) {
      toast.info(
        t("social.feed.loginFirst", { defaultValue: "Please login first" }),
      );
      return;
    }
    if (!canPublish) {
      toast.info(
        t("social.feed.composer.needContent", {
          defaultValue:
            "Add text, photos, a place, an event, or attach a saved plan",
        }),
      );
      return;
    }
    try {
      setPublishing(true);
      const payload = {
        title: newPostTitle.trim() || undefined,
        body: newPostBody.trim() || undefined,
        imageUrls: postImages.length ? postImages : undefined,
        visibility: newPostVisibility,
        placeId: selectedPlace?.placeId || undefined,
        locationLabel:
          !selectedPlace && locationLabel.trim()
            ? locationLabel.trim()
            : undefined,
        eventId: selectedEventId || undefined,
      };
      await createProviderPost(payload);
      toast.success(
        t("provider.businessFeed.composer.postSuccess", {
          defaultValue: "Business post published",
        }),
      );
      resetForm();
      onPublished?.();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("provider.businessFeed.composer.postFailed", {
            defaultValue: "Could not publish the post",
          }),
        ),
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <section className="provider-business-feed__composer">
      <div className="provider-business-feed__composer-header">
        <div>
          <p className="provider-business-feed__composer-eyebrow">
            {t("provider.businessFeed.composer.eyebrow", {
              defaultValue: "Business posts",
            })}
          </p>
          <h3 className="provider-business-feed__composer-title">
            {t("provider.businessFeed.composer.title", {
              defaultValue: "Share an update from your business",
            })}
          </h3>
        </div>
        <p className="provider-business-feed__composer-hint">
          {t("provider.businessFeed.composer.hint", {
            defaultValue:
              "Link updates to your places or events so guests know what’s new.",
          })}
        </p>
      </div>

      <CreatePostCard
        publishing={publishing}
        canPublish={canPublish}
        savedPlans={[]}
        savedPlansLoading={false}
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
        setSelectedTripPlanId={() => {}}
        setNewPostTitle={setNewPostTitle}
        setNewPostBody={setNewPostBody}
        setNewPostVisibility={setNewPostVisibility}
        setLocationLabel={setLocationLabel}
        setSelectedPlace={setSelectedPlace}
        setLocating={setLocating}
        locating={locating}
        showSavedPlanSelect={false}
      />

      <div className="provider-business-feed__composer-meta">
        <div className="provider-business-feed__composer-section">
          <div className="provider-business-feed__composer-section-head">
            <span>
              {t("provider.businessFeed.composer.placesTitle", {
                defaultValue: "Attach a place",
              })}
            </span>
            <p className="provider-business-feed__composer-small">
              {t("provider.businessFeed.composer.placesHint", {
                defaultValue: "Tap one of your venues to pin it to the post.",
              })}
            </p>
          </div>
          {placesLoading ? (
            <p className="provider-business-feed__composer-loading">
              {t("common.loading", { defaultValue: "Loading…" })}
            </p>
          ) : (
            <div className="provider-business-feed__composer-place-list">
              {placeButtons.length === 0 ? (
                <p className="provider-business-feed__composer-empty">
                  {t("provider.businessFeed.composer.noPlaces", {
                    defaultValue: "Add a place first to link it here.",
                  })}
                </p>
              ) : (
                placeButtons.map((place) => {
                  const label = formatPlaceLabel(place);
                  const active = selectedPlace?.placeId === place.id;
                  return (
                    <button
                      key={place.id}
                      type="button"
                      className={`provider-business-feed__composer-place${
                        active ? " is-active" : ""
                      }`}
                      onClick={() => handlePlaceSelect(place)}
                    >
                      {label || place.id}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="provider-business-feed__composer-section">
          <label
            className="provider-business-feed__composer-section-head"
            htmlFor="provider-event-select"
          >
            <span>
              {t("provider.businessFeed.composer.eventTitle", {
                defaultValue: "Link an event",
              })}
            </span>
            <p className="provider-business-feed__composer-small">
              {t("provider.businessFeed.composer.eventHint", {
                defaultValue:
                  "Optional — highlight tickets and dates you manage.",
              })}
            </p>
          </label>
          <select
            id="provider-event-select"
            className="provider-business-feed__composer-event-select"
            value={selectedEventId}
            onChange={(event) => setSelectedEventId(event.target.value)}
            disabled={eventsLoading}
          >
            <option value="">
              {t("provider.businessFeed.composer.eventPlaceholder", {
                defaultValue: "No event linked",
              })}
            </option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {formatEventLabel(event)}
              </option>
            ))}
          </select>
          {eventsLoading && (
            <p className="provider-business-feed__composer-loading">
              {t("common.loading", { defaultValue: "Loading…" })}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProviderPostComposer;
