import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiArrowLeft, FiArrowRight, FiSearch } from "react-icons/fi";
import { fetchFriends, fetchMyFollowers, fetchMyFollowing } from "@/api/social";
import { fetchPublicUserFollowers, fetchPublicUserFollowing } from "@/api/public";
import { getApiErrorMessage } from "@/utils/errors";
import { resolveMediaUrl } from "@/utils/mediaUrl";
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

  const backHref = subjectUsername ? `/u/${encodeURIComponent(subjectUsername)}` : "/profile";

  const isRTL = typeof document !== "undefined" && document.documentElement.dir === "rtl";
  const ArrowIcon = isRTL ? FiArrowRight : FiArrowLeft;
  const backText = subjectUsername
    ? t("profile.connectionsBackUser", { defaultValue: "رجوع" })
    : t("profile.connectionsBack", { defaultValue: "رجوع" });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let payload;
      if (subjectUsername) {
        if (list === "friends") {
          setError(
            t("profile.connectionsFriendsPublicUnavailable", {
              defaultValue: "Friends list is only available from your account settings.",
            }),
          );
          setRows([]);
          return;
        }
        if (list === "followers") {
          payload = await fetchPublicUserFollowers(subjectUsername, debouncedSearch);
        } else {
          payload = await fetchPublicUserFollowing(subjectUsername, debouncedSearch);
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
      setError(getApiErrorMessage(err, t("profile.connectionsLoadFailed", { defaultValue: "Could not load list." })));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, list, subjectUsername, t]);

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
              if (typeof window !== "undefined" && window.history && window.history.length > 1) {
                navigate(-1);
                return;
              }
            } catch {
              /* ignore and fallback to href */
            }
            navigate(backHref);
          }}>
          {!isRTL && <ArrowIcon aria-hidden />}
          {backText}
          {isRTL && <ArrowIcon aria-hidden />}
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
        <p className="profile-conn__status">{t("profile.connectionsLoading", { defaultValue: "Loading…" })}</p>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <p className="profile-conn__empty">
          {debouncedSearch
            ? t("profile.connectionsEmptySearch", { defaultValue: "No people match your search." })
            : t("profile.connectionsEmptyList", { defaultValue: "No one to show here yet." })}
        </p>
      ) : null}

      <ul className="profile-conn__list">
        {rows.map((person) => {
          const name = `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || person.username;
          const avatar =
            person.avatarUrl && String(person.avatarUrl).trim() ? resolveMediaUrl(person.avatarUrl) : null;
          const initial = (person.username || name || "?").trim().charAt(0).toUpperCase();
          const key = person.userId || person.id || person.username;
          return (
            <li key={key}>
              <Link to={`/u/${encodeURIComponent(person.username)}`} className="profile-conn__row">
                <div className="profile-conn__avatar">
                  {avatar ? (
                    <img src={avatar} alt="" className="profile-conn__avatarImg" />
                  ) : (
                    <span className="profile-conn__avatarInitial">{initial}</span>
                  )}
                </div>
                <div className="profile-conn__meta">
                  <span className="profile-conn__name">{name}</span>
                  <span className="profile-conn__handle">@{person.username}</span>
                </div>
              </Link>
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

export default ProfileConnections;
