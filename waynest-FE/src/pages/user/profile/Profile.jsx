import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  FiBell,
  FiBookmark,
  FiCalendar,
  FiHeart,
  FiHome,
  FiMail,
  FiMap,
  FiMessageCircle,
  FiPhone,
  FiUser,
} from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { updateUserProfile } from "@/api/user";
import {
  fetchUserPostsByUsername,
  saveSocialPost,
  toggleSocialLike,
  unsaveSocialPost,
} from "@/api/social";
import {
  deleteSocialPost,
  updateSocialPost,
  uploadImage,
} from "@/services/social/social.service";
import { useUserProfilePage } from "@/hooks/user/useUserProfilePage";
import { PostCard, ProfilePostComposer } from "@/components/social";
import { getResolvedAvatarUrl, handleAvatarImageError } from "@/utils/avatar";
import { getApiErrorMessage } from "@/utils/errors";
import "@/pages/social/SocialFeed.css";
import "@/pages/social/UserSocialProfile.css";
import "./Profile.css";

const Profile = () => {
  const { t } = useTranslation();
  const { refreshUser, user } = useAuth();
  const { error, loading, profile, refresh } = useUserProfilePage();
  const [activeTab, setActiveTab] = useState("posts");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ fullName: "", phone: "" });
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);

  const displayAvatarSrc = getResolvedAvatarUrl(profile);
  const avatarInitial = (profile.fullName || user?.username || "U")
    .trim()
    .charAt(0)
    .toUpperCase();

  const displayName = editing ? draft.fullName : profile.fullName;
  const headlineName = (displayName || "").trim() || profile.username || "—";

  const publicProfileTo = profile.username
    ? `/u/${encodeURIComponent(profile.username)}`
    : null;

  const loadPosts = useCallback(async () => {
    const uname = user?.username?.trim();
    if (!uname) {
      setPosts([]);
      return;
    }
    try {
      setPostsLoading(true);
      const userPosts = await fetchUserPostsByUsername(uname);
      const list = Array.isArray(userPosts) ? userPosts : [];
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setPosts(list);
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          t("social.userProfile.postsLoadFailed", {
            defaultValue: "Failed to load posts",
          }),
        ),
      );
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, [t, user?.username]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (!editing) {
      setDraft({ fullName: profile.fullName, phone: profile.phone });
    }
  }, [profile.fullName, profile.phone, editing]);

  useEffect(() => {
    if (activeTab !== "about" && editing) {
      setDraft({ fullName: profile.fullName, phone: profile.phone });
      setEditing(false);
    }
  }, [activeTab, editing, profile.fullName, profile.phone]);

  const startEdit = () => {
    setDraft({ fullName: profile.fullName, phone: profile.phone });
    setEditing(true);
  };

  const openAboutAndEdit = () => {
    setActiveTab("about");
    startEdit();
  };

  const cancelEdit = () => {
    setDraft({ fullName: profile.fullName, phone: profile.phone });
    setEditing(false);
  };

  const saveEdit = async () => {
    if (!user?.id) return;
    try {
      setSaving(true);
      const [firstName, ...rest] = draft.fullName.trim().split(" ");
      await updateUserProfile(user.id, {
        firstName: firstName || "",
        lastName: rest.join(" ") || undefined,
        phone: draft.phone || undefined,
      });
      await refreshUser();
      await refresh();
      toast.success(
        t("profile.saveSuccess", { defaultValue: "Profile updated" }),
      );
      setEditing(false);
    } catch {
      toast.error(
        t("profile.saveError", { defaultValue: "Failed to update profile" }),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editing || !user?.id) return;
    try {
      setAvatarUploading(true);
      const { path } = await uploadImage(file);
      await updateUserProfile(user.id, { avatarUrl: path });
      await refreshUser();
      await refresh();
      toast.success(
        t("profile.avatarUpdated", { defaultValue: "Profile photo updated" }),
      );
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          t("profile.avatarError", { defaultValue: "Upload failed" }),
        ),
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await deleteSocialPost(postId);
      toast.success(
        t("social.profile.postDeleted", { defaultValue: "Post deleted" }),
      );
      await loadPosts();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Delete failed"));
    }
  };

  const handleUpdatePost = async (postId, payload) => {
    try {
      await updateSocialPost(postId, payload);
      toast.success(
        t("social.profile.postUpdated", { defaultValue: "Post updated" }),
      );
      await loadPosts();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Update failed"));
    }
  };

  const navItems = useMemo(
    () => [
      {
        to: "/",
        label: t("navbar.home", { defaultValue: "Home" }),
        icon: <FiHome />,
      },
      {
        to: "/wishlist",
        label: t("sidebar.wishlist", { defaultValue: "Wishlist" }),
        icon: <FiHeart />,
      },
      {
        to: "/saved-plans",
        label: t("sidebar.saved", { defaultValue: "Saved plans" }),
        icon: <FiBookmark />,
      },
      {
        to: "/notifications",
        label: t("navbar.notifications", { defaultValue: "Notifications" }),
        icon: <FiBell />,
      },
      {
        to: "/social",
        label: t("sidebar.messengerTitle", { defaultValue: "Messenger" }),
        icon: <FiMessageCircle />,
      },
      {
        to: "/trip-planner",
        label: t("navbar.planner", { defaultValue: "Trip planner" }),
        icon: <FiMap />,
      },
      {
        to: "/bookings",
        label: t("navbar.bookings", { defaultValue: "Bookings" }),
        icon: <FiCalendar />,
      },
      {
        to: "/geo",
        label: t("profile.navGeo", { defaultValue: "Geo tables" }),
        icon: <FiMap />,
      },
      ...(publicProfileTo
        ? [
            {
              to: publicProfileTo,
              label: t("profile.publicProfile", {
                defaultValue: "Public profile",
              }),
              icon: <FiUser />,
              end: false,
            },
          ]
        : []),
    ],
    [publicProfileTo, t],
  );

  const tabPostsLabel = t("profile.tabPosts", { defaultValue: "Posts" });
  const tabAboutLabel = t("profile.tabAbout", { defaultValue: "About" });

  return (
    <section className="profile profile-page profile-page--fb profile-page--fullbleed">
      <div className="profile-page__grid profile-page__grid--fb">
        <div className="profile-page__main">
          {loading ? (
            <div
              className="profile-page__skeleton"
              aria-busy="true"
              aria-live="polite"
            >
              <div className="profile-skeleton profile-skeleton--cover" />
              <div className="profile-skeleton profile-skeleton--panel" />
            </div>
          ) : null}

          {!loading && error ? (
            <p className="profile-page__status profile-page__status--error">
              {t("profile.loadError", {
                defaultValue: "We couldn't load your profile.",
              })}
            </p>
          ) : null}

          {!loading && !error ? (
            <>
              <div className="profile-fb">
                <div className="profile-fb__cover" aria-hidden />
                <div className="profile-fb__body">
                  <div className="profile-fb__identity">
                    <div className="profile-fb__avatarCol">
                      <div className="profile-fb__avatarShell">
                        <div className="profile-fb__avatar">
                          {displayAvatarSrc ? (
                            <img
                              src={displayAvatarSrc}
                              alt=""
                              className="profile-fb__avatarImg"
                              onError={handleAvatarImageError}
                            />
                          ) : (
                            <span className="profile-fb__avatarInitial">
                              {avatarInitial}
                            </span>
                          )}
                        </div>
                      </div>
                      {activeTab === "about" && editing ? (
                        <>
                          <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            className="profile-fb__avatarInput"
                            onChange={handleAvatarChange}
                            tabIndex={-1}
                            aria-hidden
                          />
                          <button
                            type="button"
                            className="profile-fb__avatarBtn"
                            disabled={avatarUploading}
                            onClick={() => avatarInputRef.current?.click()}
                          >
                            {avatarUploading
                              ? t("profile.uploading", {
                                  defaultValue: "Uploading…",
                                })
                              : t("profile.changePhoto", {
                                  defaultValue: "Update photo",
                                })}
                          </button>
                        </>
                      ) : null}
                    </div>

                    <div className="profile-fb__meta">
                      <h1 className="profile-fb__name">{headlineName}</h1>
                      {profile.username ? (
                        <p className="profile-fb__handle">
                          @{profile.username}
                        </p>
                      ) : null}
                      <div className="profile-fb__stats">
                        <Link
                          to="/profile/friends"
                          className="profile-fb__statLink"
                        >
                          <strong>{profile.friendsCount ?? 0}</strong>
                          <span>
                            {t("profile.statFriendsShort", {
                              defaultValue: "friends",
                            })}
                          </span>
                        </Link>
                        <span className="profile-fb__statDot" aria-hidden>
                          ·
                        </span>
                        <Link
                          to="/profile/followers"
                          className="profile-fb__statLink"
                        >
                          <strong>{profile.followersCount ?? 0}</strong>
                          <span>
                            {t("profile.statFollowersShort", {
                              defaultValue: "followers",
                            })}
                          </span>
                        </Link>
                        <span className="profile-fb__statDot" aria-hidden>
                          ·
                        </span>
                        <Link
                          to="/profile/following"
                          className="profile-fb__statLink"
                        >
                          <strong>{profile.followingCount ?? 0}</strong>
                          <span>
                            {t("profile.statFollowingShort", {
                              defaultValue: "following",
                            })}
                          </span>
                        </Link>
                        <span className="profile-fb__statDot" aria-hidden>
                          ·
                        </span>
                        <Link to="/wishlist" className="profile-fb__statLink">
                          <strong>{profile.wishlistCount}</strong>
                          <span>
                            {t("profile.statWishlist", {
                              defaultValue: "wishlist",
                            })}
                          </span>
                        </Link>
                        <span className="profile-fb__statDot" aria-hidden>
                          ·
                        </span>
                        <Link
                          to="/saved-plans"
                          className="profile-fb__statLink"
                        >
                          <strong>{profile.savedPlansCount}</strong>
                          <span>
                            {t("profile.statPlansShort", {
                              defaultValue: "saved plans",
                            })}
                          </span>
                        </Link>
                      </div>
                    </div>

                    <div className="profile-fb__actions">
                      {publicProfileTo ? (
                        <Link
                          to={publicProfileTo}
                          className="profile-fb__btn profile-fb__btn--secondary"
                        >
                          {t("profile.publicProfile", {
                            defaultValue: "View as visitor",
                          })}
                        </Link>
                      ) : null}
                      {activeTab === "about" && editing ? null : (
                        <button
                          type="button"
                          className="profile-fb__btn profile-fb__btn--primary"
                          onClick={openAboutAndEdit}
                        >
                          {t("profile.edit", { defaultValue: "Edit profile" })}
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    className="profile-fb__tabBar"
                    role="tablist"
                    aria-label={t("profile.tabsLabel", {
                      defaultValue: "Profile sections",
                    })}
                  >
                    <button
                      type="button"
                      role="tab"
                      id="profile-tab-posts"
                      aria-controls="profile-panel-posts"
                      aria-selected={activeTab === "posts"}
                      className={`profile-fb__tab${activeTab === "posts" ? " profile-fb__tab--active" : ""}`}
                      onClick={() => setActiveTab("posts")}
                    >
                      {tabPostsLabel}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      id="profile-tab-about"
                      aria-controls="profile-panel-about"
                      aria-selected={activeTab === "about"}
                      className={`profile-fb__tab${activeTab === "about" ? " profile-fb__tab--active" : ""}`}
                      onClick={() => setActiveTab("about")}
                    >
                      {tabAboutLabel}
                    </button>
                  </div>
                </div>
              </div>

              {activeTab === "posts" ? (
                <div
                  className="profile-fbContent"
                  id="profile-panel-posts"
                  role="tabpanel"
                  aria-labelledby="profile-tab-posts"
                >
                  <section
                    className="profile-panel profile-panel--composer"
                    aria-labelledby="profile-composer-heading"
                  >
                    <h2
                      id="profile-composer-heading"
                      className="profile-panel__title profile-panel__title--inline"
                    >
                      {t("social.userProfile.publishSection", {
                        defaultValue: "Create post",
                      })}
                    </h2>
                    <div className="profile-panel__composer">
                      <ProfilePostComposer
                        onPublished={() => void loadPosts()}
                      />
                    </div>
                  </section>

                  <section
                    className="profile-panel profile-panel--posts"
                    aria-labelledby="profile-posts-heading"
                  >
                    <div className="profile-panel__head profile-panel__head--row profile-panel__head--flush">
                      <h2
                        id="profile-posts-heading"
                        className="profile-panel__title"
                      >
                        {t("social.userProfile.postsHeading", {
                          defaultValue: "Posts",
                        })}
                      </h2>
                      {postsLoading ? (
                        <span className="profile-panel__meta">
                          {t("profile.postsLoading", {
                            defaultValue: "Loading…",
                          })}
                        </span>
                      ) : (
                        <span className="profile-panel__meta">
                          {t("profile.postCount", {
                            count: posts.length,
                            defaultValue: "{{count}} posts",
                          })}
                        </span>
                      )}
                    </div>
                    <div className="social-feed-list user-profile-posts profile-page__posts">
                      {!postsLoading && posts.length === 0 ? (
                        <div className="profile-empty">
                          <p className="profile-empty__title">
                            {t("social.userProfile.noPosts", {
                              defaultValue: "No posts yet",
                            })}
                          </p>
                          <p className="profile-empty__text">
                            {t("profile.emptyPostsLead", {
                              defaultValue:
                                "Start a post above — it will show here and on your public profile.",
                            })}
                          </p>
                        </div>
                      ) : null}
                      {posts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          isAuthenticated
                          toggleSocialLike={toggleSocialLike}
                          saveSocialPost={saveSocialPost}
                          unsaveSocialPost={unsaveSocialPost}
                          actorId={user?.id}
                          onDeletePost={handleDeletePost}
                          onUpdatePost={handleUpdatePost}
                        />
                      ))}
                    </div>
                  </section>
                </div>
              ) : null}

              {activeTab === "about" ? (
                <div
                  className="profile-fbContent"
                  id="profile-panel-about"
                  role="tabpanel"
                  aria-labelledby="profile-tab-about"
                >
                  <section
                    className="profile-panel profile-panel--account"
                    aria-labelledby="profile-account-heading"
                  >
                    <div className="profile-panel__head">
                      <h2
                        id="profile-account-heading"
                        className="profile-panel__title"
                      >
                        {t("profile.accountDetailsTitle", {
                          defaultValue: "Contact and basic info",
                        })}
                      </h2>
                      <p className="profile-panel__subtitle">
                        {t("profile.accountDetailsLead", {
                          defaultValue:
                            "Update how you appear on Waynest. Email is read-only.",
                        })}
                      </p>
                    </div>

                    <div className="profile-panel__grid">
                      <label className="profile-field">
                        <span>
                          {t("profile.name", { defaultValue: "Name" })}
                        </span>
                        <input
                          type="text"
                          name="profile-fullName"
                          autoComplete="name"
                          value={editing ? draft.fullName : profile.fullName}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              fullName: e.target.value,
                            }))
                          }
                          readOnly={!editing}
                          aria-readOnly={!editing}
                          className={
                            !editing
                              ? "profile-field__input--locked"
                              : undefined
                          }
                        />
                      </label>
                      <label className="profile-field profile-field--span2">
                        <span>
                          {t("profile.email", { defaultValue: "Email" })}
                        </span>
                        <input
                          type="email"
                          name="profile-email"
                          autoComplete="email"
                          value={profile.email}
                          readOnly
                          tabIndex={-1}
                          className="profile-field__input--locked"
                        />
                      </label>
                      <label className="profile-field">
                        <span>
                          {t("profile.phone", { defaultValue: "Phone" })}
                        </span>
                        <input
                          type="tel"
                          name="profile-phone"
                          autoComplete="tel"
                          value={editing ? draft.phone : profile.phone}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, phone: e.target.value }))
                          }
                          readOnly={!editing}
                          aria-readOnly={!editing}
                          className={
                            !editing
                              ? "profile-field__input--locked"
                              : undefined
                          }
                        />
                      </label>
                    </div>

                    {editing ? (
                      <div className="profile-panel__toolbar">
                        <button
                          type="button"
                          className="profile-btn-save"
                          disabled={saving}
                          onClick={() => void saveEdit()}
                        >
                          {saving
                            ? t("profile.saving", { defaultValue: "Saving…" })
                            : t("profile.save", {
                                defaultValue: "Save changes",
                              })}
                        </button>
                        <button
                          type="button"
                          className="profile-btn-cancel"
                          onClick={cancelEdit}
                        >
                          {t("profile.cancel", { defaultValue: "Cancel" })}
                        </button>
                      </div>
                    ) : (
                      <div className="profile-panel__toolbar profile-panel__toolbar--solo">
                        <button
                          type="button"
                          className="profile-btn-edit"
                          onClick={startEdit}
                        >
                          {t("profile.editDetails", {
                            defaultValue: "Edit details",
                          })}
                        </button>
                      </div>
                    )}
                  </section>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <aside
          className="profile-page__aside"
          aria-label={t("profile.asideLabel", {
            defaultValue: "Profile sidebar",
          })}
        >
          {!loading && !error ? (
            <div className="profile-intro">
              <h2 className="profile-intro__title">
                {t("profile.introTitle", { defaultValue: "Intro" })}
              </h2>
              <ul className="profile-intro__list">
                {profile.email ? (
                  <li className="profile-intro__row">
                    <span className="profile-intro__icon" aria-hidden>
                      <FiMail />
                    </span>
                    <span className="profile-intro__text">{profile.email}</span>
                  </li>
                ) : null}
                {profile.phone ? (
                  <li className="profile-intro__row">
                    <span className="profile-intro__icon" aria-hidden>
                      <FiPhone />
                    </span>
                    <span className="profile-intro__text">{profile.phone}</span>
                  </li>
                ) : (
                  <li className="profile-intro__row profile-intro__row--muted">
                    <span className="profile-intro__icon" aria-hidden>
                      <FiPhone />
                    </span>
                    <span className="profile-intro__text">
                      {t("profile.introNoPhone", {
                        defaultValue: "No phone added",
                      })}
                    </span>
                  </li>
                )}
              </ul>
              <div className="profile-intro__links">
                <Link to="/wishlist" className="profile-intro__link">
                  {t("profile.statWishlist", { defaultValue: "Wishlist" })}
                  <span className="profile-intro__badge">
                    {profile.wishlistCount}
                  </span>
                </Link>
                <Link to="/saved-plans" className="profile-intro__link">
                  {t("profile.statPlans", { defaultValue: "Saved plans" })}
                  <span className="profile-intro__badge">
                    {profile.savedPlansCount}
                  </span>
                </Link>
              </div>
            </div>
          ) : null}

          <nav className="profile-aside-nav">
            <h2 className="profile-aside-nav__title">
              {t("profile.asideTitle", { defaultValue: "Shortcuts" })}
            </h2>
            <ul className="profile-aside-nav__list">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end ?? item.to === "/"}
                    className={({ isActive }) =>
                      `profile-aside-nav__link${isActive ? " profile-aside-nav__link--active" : ""}`
                    }
                  >
                    <span className="profile-aside-nav__icon" aria-hidden>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </section>
  );
};

export default Profile;
