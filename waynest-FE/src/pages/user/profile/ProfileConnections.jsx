import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiArrowLeft, FiSearch } from "react-icons/fi";
import { fetchFriends, fetchMyFollowers, fetchMyFollowing } from "@/api/social";
import { getApiErrorMessage } from "@/utils/errors";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import "./ProfileConnections.css";

const LISTS = /** @type {const} */ (["friends", "followers", "following"]);

/**
 * @param {{ list: "friends" | "followers" | "following" }} props
 */
const ProfileConnections = ({ list }) => {
  const { t } = useTranslation();
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

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let payload;
      if (list === "friends") {
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
  }, [debouncedSearch, list, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!LISTS.includes(list)) {
    return null;
  }

  return (
    <section className="profile-conn">
      <div className="profile-conn__bar">
        <Link to="/profile" className="profile-conn__back">
          <FiArrowLeft aria-hidden />
          {t("profile.connectionsBack", { defaultValue: "Profile" })}
        </Link>
        <h1 className="profile-conn__title">{title}</h1>
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
          return (
            <li key={person.userId}>
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

export default ProfileConnections;
