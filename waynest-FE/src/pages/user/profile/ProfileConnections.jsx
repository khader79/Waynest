import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiArrowLeft, FiArrowRight, FiSearch } from "react-icons/fi";
import { toast } from "react-toastify";
import {
  blockUser,
  fetchFriends,
  fetchMyFollowers,
  fetchMyFollowing,
  muteUser,
  removeFriendship,
} from "@/api/social";
import {
  fetchPublicUserFollowers,
  fetchPublicUserFollowing,
  fetchPublicUserFriends,
} from "@/api/public";
import { getResolvedAvatarUrl, handleAvatarImageError } from "@/utils/avatar";
import { getApiErrorMessage } from "@/utils/errors";
import "./ProfileConnections.css";

const LISTS = /** @type {const} */ (["friends", "followers", "following"]);

/**
 * @param {{
 *   list: "friends" | "followers" | "following";
 *   subjectUsername?: string;
 * }} props
 */
const ProfileConnections = ({ list, subjectUsername }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeActionKey, setActiveActionKey] = useState(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 320);
    return () => window.clearTimeout(id);
  }, [search]);

  const title = useMemo(() => {
    if (list === "friends") {
      return t("profile.connectionsFriends", { defaultValue: "Friends" });
    }
    if (list === "followers") {
      return t("profile.connectionsFollowers", { defaultValue: "Followers" });
    }
    return t("profile.connectionsFollowing", { defaultValue: "Following" });
  }, [list, t]);

  const backHref = subjectUsername
    ? `/u/${encodeURIComponent(subjectUsername)}`
    : "/profile";

  const isRTL =
    typeof document !== "undefined" && document.documentElement.dir === "rtl";
  const backText = subjectUsername
    ? t("profile.connectionsBackUser", { defaultValue: "Back" })
    : t("profile.connectionsBack", { defaultValue: "Back" });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let payload;
      if (subjectUsername) {
        if (list === "friends") {
          payload = await fetchPublicUserFriends(
            subjectUsername,
            debouncedSearch,
          );
        } else if (list === "followers") {
          payload = await fetchPublicUserFollowers(
            subjectUsername,
            debouncedSearch,
          );
        } else {
          payload = await fetchPublicUserFollowing(
            subjectUsername,
            debouncedSearch,
          );
        }
      } else if (list === "friends") {
        payload = await fetchFriends(debouncedSearch);
      } else if (list === "followers") {
        payload = await fetchMyFollowers(debouncedSearch);
      } else {
        payload = await fetchMyFollowing(debouncedSearch);
      }
      setRows(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          t("profile.connectionsLoadFailed", {
            defaultValue: "Could not load list.",
          }),
        ),
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, list, subjectUsername, t]);

  const showFriendActions = list === "friends" && !subjectUsername;

  const isActionLoading = (personId, action) =>
    activeActionKey === `${personId}:${action}`;

  const handleRemoveFriend = async (person) => {
    const friendId = person?.userId || person?.id || "";
    if (!friendId) return;

    setActiveActionKey(`${friendId}:remove`);
    try {
      await removeFriendship(friendId);
      await load();
      toast.success(t("friends.removed", { defaultValue: "Friend removed" }));
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          t("profile.connectionsActionFailed", {
            defaultValue: "Action failed.",
          }),
        ),
      );
    } finally {
      setActiveActionKey(null);
    }
  };

  const handleMuteFriend = async (person) => {
    const friendId = person?.userId || person?.id || "";
    if (!friendId) return;

    setActiveActionKey(`${friendId}:mute`);
    try {
      await muteUser(friendId);
      toast.success(t("friends.muted", { defaultValue: "Muted" }));
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          t("profile.connectionsActionFailed", {
            defaultValue: "Action failed.",
          }),
        ),
      );
    } finally {
      setActiveActionKey(null);
    }
  };

  const handleBlockFriend = async (person) => {
    const friendId = person?.userId || person?.id || "";
    if (!friendId) return;

    setActiveActionKey(`${friendId}:block`);
    try {
      await blockUser(friendId);
      await load();
      toast.success(t("friends.blocked", { defaultValue: "Blocked" }));
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          t("profile.connectionsActionFailed", {
            defaultValue: "Action failed.",
          }),
        ),
      );
    } finally {
      setActiveActionKey(null);
    }
  };

  useEffect(() => {
    void load();
  }, [load]);

  if (!LISTS.includes(list)) {
    return null;
  }

  return (
    <section className="profile-conn">
      <div className="profile-conn__bar">
        <button
          type="button"
          className="profile-conn__back"
          aria-label={backText}
          onClick={() => {
            try {
              if (
                typeof window !== "undefined" &&
                window.history &&
                window.history.length > 1
              ) {
                navigate(-1);
                return;
              }
            } catch {
              /* ignore and fallback to href */
            }
            navigate(backHref);
          }}>
          {!isRTL && <FiArrowLeft aria-hidden />}
          {backText}
          {isRTL && <FiArrowRight aria-hidden />}
        </button>
        <h1 className="profile-conn__title">
          {title}
          {subjectUsername ? (
            <span className="profile-conn__subject"> @{subjectUsername}</span>
          ) : null}
        </h1>
      </div>

      <div className="profile-conn__searchWrap">
        <FiSearch className="profile-conn__searchIcon" aria-hidden />
        <input
          type="search"
          className="profile-conn__search"
          placeholder={t("profile.connectionsSearchPlaceholder", {
            defaultValue: "Search by name or username…",
          })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {error ? <p className="profile-conn__error">{error}</p> : null}

      {loading ? (
        <p className="profile-conn__status">
          {t("profile.connectionsLoading", { defaultValue: "Loading…" })}
        </p>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <p className="profile-conn__empty">
          {debouncedSearch
            ? t("profile.connectionsEmptySearch", {
                defaultValue: "No people match your search.",
              })
            : t("profile.connectionsEmptyList", {
                defaultValue: "No one to show here yet.",
              })}
        </p>
      ) : null}

      <ul className="profile-conn__list">
        {rows.map((person) => {
          const name =
            `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() ||
            person.username;
          const avatar = getResolvedAvatarUrl(person);
          const initial = (person.username || name || "?")
            .trim()
            .charAt(0)
            .toUpperCase();
          const key = person.userId || person.id || person.username;
          const friendId = person.userId || person.id || "";
          return (
            <li key={key}>
              <div className="profile-conn__row">
                <Link
                  to={`/u/${encodeURIComponent(person.username)}`}
                  className="profile-conn__rowLink">
                  <div className="profile-conn__avatar">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt=""
                        className="profile-conn__avatarImg"
                        onError={handleAvatarImageError}
                      />
                    ) : (
                      <span className="profile-conn__avatarInitial">
                        {initial}
                      </span>
                    )}
                  </div>
                  <div className="profile-conn__meta">
                    <span className="profile-conn__name">{name}</span>
                    <span className="profile-conn__handle">
                      @{person.username}
                    </span>
                  </div>
                </Link>

                {showFriendActions ? (
                  <div className="profile-conn__rowActions">
                    <button
                      type="button"
                      className="profile-conn__actionBtn profile-conn__actionBtn--danger"
                      disabled={isActionLoading(friendId, "remove")}
                      onClick={() => void handleRemoveFriend(person)}>
                      {t("friends.remove", {
                        defaultValue: "Remove friend",
                      })}
                    </button>
                    <button
                      type="button"
                      className="profile-conn__actionBtn profile-conn__actionBtn--ghost"
                      disabled={isActionLoading(friendId, "mute")}
                      onClick={() => void handleMuteFriend(person)}>
                      {t("friends.mute", { defaultValue: "Mute" })}
                    </button>
                    <button
                      type="button"
                      className="profile-conn__actionBtn profile-conn__actionBtn--danger"
                      disabled={isActionLoading(friendId, "block")}
                      onClick={() => void handleBlockFriend(person)}>
                      {t("friends.block", { defaultValue: "Block" })}
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export function UserPublicFollowersRoute() {
  const { username } = useParams();
  const decoded = decodeURIComponent(username ?? "");
  return <ProfileConnections list="followers" subjectUsername={decoded} />;
}

export function UserPublicFollowingRoute() {
  const { username } = useParams();
  const decoded = decodeURIComponent(username ?? "");
  return <ProfileConnections list="following" subjectUsername={decoded} />;
}

export function UserPublicFriendsRoute() {
  const { username } = useParams();
  const decoded = decodeURIComponent(username ?? "");
  return <ProfileConnections list="friends" subjectUsername={decoded} />;
}

export default ProfileConnections;
