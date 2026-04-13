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
  const { profile, profileLoading, ownerSocial, followTargetUserId } =
    useProviderProfile();
  const [graph, setGraph] = useState(null);
  const [followLoading, setFollowLoading] = useState(false);
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
      profile?.owner && typeof profile.owner.id === "string"
        ? profile.owner.id
        : null;
    return col || ft || nested || null;
  }, [profile, followTargetUserId]);

  const loadGraph = useCallback(async () => {
    if (
      !isAuthenticated ||
      !user?.id ||
      !ownerUserId ||
      sameUserId(user.id, ownerUserId)
    ) {
      setGraph(null);
      return null;
    }
    try {
      const state = await getSocialGraphState(ownerUserId);
      const nextGraph = {
        followersCount: state.followersCount,
        following: state.following,
        followingCount: state.followingCount,
      };
      setGraph(nextGraph);
      return nextGraph;
    } catch {
      setGraph(null);
      return null;
    }
  }, [isAuthenticated, user?.id, ownerUserId]);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

  const displayGraph = useMemo(() => {
    const providerCounts =
      ownerSocial && typeof ownerSocial.followersCount === "number"
        ? {
            followersCount: ownerSocial.followersCount,
            followingCount: ownerSocial.followingCount ?? 0,
          }
        : null;

    if (graph) {
      return {
        followersCount: providerCounts?.followersCount ?? graph.followersCount,
        followingCount: providerCounts?.followingCount ?? graph.followingCount,
        following: graph.following,
      };
    }

    if (providerCounts) {
      return {
        followersCount: providerCounts.followersCount,
        followingCount: providerCounts.followingCount,
        following: false,
      };
    }

    return null;
  }, [graph, ownerSocial]);

  /** Logged-in viewer is the business owner — cannot follow own page */
  const viewerIsOwner = Boolean(
    user?.id && ownerUserId && sameUserId(user.id, ownerUserId),
  );

  const canFollow = Boolean(ownerUserId && !viewerIsOwner);

  const handleFollow = useCallback(async () => {
    if (!ownerUserId || !canFollow || followLoading) {
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
      effective = await loadGraph();
      if (!effective) {
        toast.error(
          t("social.providerProfile.graphLoadFailed", {
            defaultValue: "Could not load follow state. Try again.",
          }),
        );
        return;
      }
    }

    const nextFollowing = !effective.following;
    const nextFollowersCount = Math.max(
      0,
      (effective.followersCount ?? 0) + (nextFollowing ? 1 : -1),
    );
    setFollowLoading(true);
    setGraph({
      ...effective,
      followersCount: nextFollowersCount,
      following: nextFollowing,
    });

    try {
      if (effective.following) {
        await unfollowUser(ownerUserId);
      } else {
        await followUser(ownerUserId);
      }
    } catch (err) {
      await loadGraph();
      toast.error(
        getApiErrorMessage(
          err,
          t("social.providerProfile.followUpdateFailed", {
            defaultValue: "Failed to update follow state",
          }),
        ),
      );
    } finally {
      setFollowLoading(false);
    }
  }, [
    ownerUserId,
    canFollow,
    isAuthenticated,
    graph,
    followLoading,
    navigate,
    location.pathname,
    location.search,
    loadGraph,
    t,
  ]);

  const showFollow = Boolean(canFollow && !profileLoading);

  return {
    displayGraph,
    followLoading,
    showFollow,
    handleFollow,
    viewerIsOwner,
  };
}
