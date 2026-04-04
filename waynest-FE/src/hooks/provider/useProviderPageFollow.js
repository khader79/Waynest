import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/utils/errors";
import { followUser, getSocialGraphState, unfollowUser } from "@/api/social";
import { useAuth } from "@/context/AuthContext";
import { useProviderProfile } from "@/context/ProviderContext";

function sameUserId(a, b) {
  if (a == null || b == null) {
    return false;
  }
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

/**
 * Follow / unfollow the business owner on public provider pages (any logged-in user;
 * guests are sent to login). Merges public follower counts with authenticated graph state.
 */
export function useProviderPageFollow() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const { profile, profileLoading, ownerSocial, followTargetUserId } = useProviderProfile();
  const [graph, setGraph] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const ownerUserId = useMemo(() => {
    const col =
      typeof profile?.ownerUserId === "string" && profile.ownerUserId.trim()
        ? profile.ownerUserId.trim()
        : null;
    const ft =
      typeof followTargetUserId === "string" && followTargetUserId.trim()
        ? followTargetUserId.trim()
        : null;
    const nested =
      profile?.owner && typeof profile.owner.id === "string" ? profile.owner.id : null;
    return col || ft || nested || null;
  }, [profile, followTargetUserId]);

  useEffect(() => {
    const loadGraph = async () => {
      if (!isAuthenticated || !user?.id || !ownerUserId || sameUserId(user.id, ownerUserId)) {
        setGraph(null);
        return;
      }
      try {
        const state = await getSocialGraphState(ownerUserId);
        setGraph({
          followersCount: state.followersCount,
          following: state.following,
          followingCount: state.followingCount,
        });
      } catch {
        setGraph(null);
      }
    };
    void loadGraph();
  }, [isAuthenticated, user?.id, ownerUserId]);

  const displayGraph = useMemo(() => {
    if (graph) {
      return graph;
    }
    if (ownerSocial && typeof ownerSocial.followersCount === "number") {
      return {
        followersCount: ownerSocial.followersCount,
        followingCount: ownerSocial.followingCount ?? 0,
        following: false,
      };
    }
    return null;
  }, [graph, ownerSocial]);

  /** Logged-in viewer is the business owner — cannot follow own page */
  const viewerIsOwner = Boolean(user?.id && ownerUserId && sameUserId(user.id, ownerUserId));

  const canFollow = Boolean(ownerUserId && !viewerIsOwner);

  const handleFollow = useCallback(async () => {
    if (!ownerUserId || !canFollow) {
      return;
    }
    if (!isAuthenticated) {
      navigate("/login", {
        state: { from: `${location.pathname}${location.search}` },
      });
      return;
    }

    let effective = graph;
    if (!effective) {
      try {
        const state = await getSocialGraphState(ownerUserId);
        effective = {
          followersCount: state.followersCount,
          following: state.following,
          followingCount: state.followingCount,
        };
        setGraph(effective);
      } catch {
        toast.error(
          t("social.providerProfile.graphLoadFailed", {
            defaultValue: "Could not load follow state. Try again.",
          }),
        );
        return;
      }
    }

    try {
      if (effective.following) {
        await unfollowUser(ownerUserId);
      } else {
        await followUser(ownerUserId);
      }
      const state = await getSocialGraphState(ownerUserId);
      setGraph({
        followersCount: state.followersCount,
        following: state.following,
        followingCount: state.followingCount,
      });
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          t("social.providerProfile.followUpdateFailed", {
            defaultValue: "Failed to update follow state",
          }),
        ),
      );
    }
  }, [
    ownerUserId,
    canFollow,
    isAuthenticated,
    graph,
    navigate,
    location.pathname,
    location.search,
    t,
  ]);

  const showFollow = Boolean(canFollow && !profileLoading);

  return {
    displayGraph,
    showFollow,
    handleFollow,
    viewerIsOwner,
  };
}
