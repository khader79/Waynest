import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  FiBell,
  FiBookmark,
  FiCalendar,
  FiCompass,
  FiHeart,
  FiHome,
  FiMap,
  FiMessageCircle,
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
import { deleteSocialPost, updateSocialPost, uploadImage } from "@/services/social/social.service";
import { useUserProfilePage } from "@/hooks/user/useUserProfilePage";
import { PostCard, ProfilePostComposer } from "@/components/social";
import { getApiErrorMessage } from "@/utils/errors";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import "@/pages/social/SocialFeed.css";
import "@/pages/social/UserSocialProfile.css";
import "./Profile.css";

const Profile = () => {
  const { t } = useTranslation();
  const { refreshUser, user } = useAuth();
  const { error, loading, profile, refresh } = useUserProfilePage();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ fullName: "", phone: "" });
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);

  const displayAvatarSrc =
    profile.avatarUrl && String(profile.avatarUrl).trim()
      ? resolveMediaUrl(profile.avatarUrl)
      : null;
  const avatarInitial = (profile.fullName || user?.username || "U").trim().charAt(0).toUpperCase();

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
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPosts(list);
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          t("social.userProfile.postsLoadFailed", { defaultValue: "Failed to load posts" }),
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

  const startEdit = () => {
    setDraft({ fullName: profile.fullName, phone: profile.phone });
    setEditing(true);
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
      toast.success(t("profile.saveSuccess", { defaultValue: "Profile updated" }));
      setEditing(false);
    } catch {
      toast.error(t("profile.saveError", { defaultValue: "Failed to update profile" }));
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
      const { url } = await uploadImage(file);
      await updateUserProfile(user.id, { avatarUrl: url });
      await refreshUser();
      await refresh();
      toast.success(t("profile.avatarUpdated", { defaultValue: "Profile photo updated" }));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("profile.avatarError", { defaultValue: "Upload failed" })));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await deleteSocialPost(postId);
      toast.success(t("social.profile.postDeleted", { defaultValue: "Post deleted" }));
      await loadPosts();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Delete failed"));
    }
  };

  const handleUpdatePost = async (postId, payload) => {
    try {
      await updateSocialPost(postId, payload);
      toast.success(t("social.profile.postUpdated", { defaultValue: "Post updated" }));
      await loadPosts();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Update failed"));
    }
  };

  const navItems = useMemo(
    () => [
      { to: "/", label: t("navbar.home", { defaultValue: "Home" }), icon: <FiHome /> },
      {
        to: "/dashboard",
        label: t("navbar.dashboard", { defaultValue: "Dashboard" }),
        icon: <FiCompass />,
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
              label: t("profile.publicProfile", { defaultValue: "Public profile" }),
              icon: <FiUser />,
              end: false,
            },
          ]
        : []),
    ],
    [publicProfileTo, t],
  );

  return (
    <section className="profile profile-page">
      <div className="profile-page__grid">
        <div className="profile-page__main">
          <header className="profile-page__intro">
            <h1 className="profile-page__title">
              {t("profile.pageTitle", { defaultValue: "Your profile" })}
            </h1>
            <p className="profile-page__lead">
              {t("profile.pageLead", {
                defaultValue: "Manage your account, share trips, and review your posts.",
              })}
            </p>
          </header>

          {loading ? (
            <p className="profile-page__status">{t("profile.loading", { defaultValue: "Loading…" })}</p>
          ) : null}
          {!loading && error ? (
            <p className="profile-page__status profile-page__status--error">
              {t("profile.loadError", { defaultValue: "We couldn't load your profile." })}
            </p>
          ) : null}

          <article className="profile-card profile-card--hero">
            <div className="profile-card__identity">
              <div className="profile-card__avatarColumn">
                <div className="profile-card__avatar">
                  {displayAvatarSrc ? (
                    <img src={displayAvatarSrc} alt="" className="profile-card__avatarImg" />
                  ) : (
                    <span className="profile-card__avatarInitial">{avatarInitial}</span>
                  )}
                </div>
                {editing ? (
                  <>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="profile-card__avatarInput"
                      onChange={handleAvatarChange}
                      tabIndex={-1}
                      aria-hidden
                    />
                    <button
                      type="button"
                      className="profile-card__avatarBtn"
                      disabled={avatarUploading}
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      {avatarUploading
                        ? t("profile.uploading", { defaultValue: "Uploading…" })
                        : t("profile.changePhoto", { defaultValue: "Change photo" })}
                    </button>
                  </>
                ) : null}

                <div className="profile-card__fieldsUnderAvatar">
                  <label className="profile-field">
                    <span>{t("profile.name", { defaultValue: "Name" })}</span>
                    <input
                      type="text"
                      name="profile-fullName"
                      autoComplete="name"
                      value={editing ? draft.fullName : profile.fullName}
                      onChange={(e) => setDraft((d) => ({ ...d, fullName: e.target.value }))}
                      readOnly={!editing}
                      aria-readOnly={!editing}
                      className={!editing ? "profile-field__input--locked" : undefined}
                    />
                  </label>
                  <label className="profile-field">
                    <span>{t("profile.email", { defaultValue: "Email" })}</span>
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
                    <span>{t("profile.phone", { defaultValue: "Phone" })}</span>
                    <input
                      type="tel"
                      name="profile-phone"
                      autoComplete="tel"
                      value={editing ? draft.phone : profile.phone}
                      onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                      readOnly={!editing}
                      aria-readOnly={!editing}
                      className={!editing ? "profile-field__input--locked" : undefined}
                    />
                  </label>
                </div>

                <div className="profile-card__heroMeta profile-card__heroMeta--stacked">
                  <p className="profile-card__eyebrow">
                    {t("profile.accountCenter", { defaultValue: "Account" })}
                  </p>
                  {profile.username ? (
                    <p className="profile-card__handle">@{profile.username}</p>
                  ) : null}
                </div>

                <div className="profile-card__form">
                  <div className="profile-card__formActions profile-card__formActions--underFields">
                    {editing ? (
                      <>
                        <button
                          type="button"
                          className="profile-btn-save"
                          disabled={saving}
                          onClick={() => void saveEdit()}
                        >
                          {saving
                            ? t("profile.saving", { defaultValue: "Saving…" })
                            : t("profile.save", { defaultValue: "Save" })}
                        </button>
                        <button type="button" className="profile-btn-cancel" onClick={cancelEdit}>
                          {t("profile.cancel", { defaultValue: "Cancel" })}
                        </button>
                      </>
                    ) : (
                      <button type="button" className="profile-btn-edit" onClick={startEdit}>
                        {t("profile.edit", { defaultValue: "Edit profile" })}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-card__stats">
              <div className="profile-card__stat">
                <span>{t("profile.statWishlist", { defaultValue: "Wishlist" })}</span>
                <strong>{profile.wishlistCount}</strong>
              </div>
              <div className="profile-card__stat">
                <span>{t("profile.statPlans", { defaultValue: "Saved plans" })}</span>
                <strong>{profile.savedPlansCount}</strong>
              </div>
            </div>
          </article>

          <div className="user-profile-composerWrap profile-page__composer">
            <h2 className="user-profile-sectionTitle">
              {t("social.userProfile.publishSection", { defaultValue: "Share a trip to your feed" })}
            </h2>
            <ProfilePostComposer onPublished={() => void loadPosts()} />
          </div>

          <h2 className="user-profile-sectionTitle user-profile-sectionTitle--posts">
            {t("social.userProfile.postsHeading", { defaultValue: "Your posts" })}
          </h2>
          {postsLoading ? (
            <p className="profile-page__status">{t("profile.postsLoading", { defaultValue: "Loading posts…" })}</p>
          ) : null}
          <div className="social-feed-list user-profile-posts profile-page__posts">
            {!postsLoading && posts.length === 0 ? (
              <p className="user-profile-empty">
                {t("social.userProfile.noPosts", { defaultValue: "No posts yet." })}
              </p>
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
        </div>

        <aside className="profile-page__aside" aria-label={t("profile.asideLabel", { defaultValue: "Account menu" })}>
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
            <div className="profile-aside-nav__footer">
              <Link to="/wishlist" className="profile-aside-nav__inline">
                {t("profile.viewWishlist", { defaultValue: "Wishlist" })}
              </Link>
              <span className="profile-aside-nav__sep" aria-hidden>
                ·
              </span>
              <Link to="/saved-plans" className="profile-aside-nav__inline">
                {t("profile.viewSavedPlans", { defaultValue: "Saved plans" })}
              </Link>
            </div>
          </nav>
        </aside>
      </div>
    </section>
  );
};

export default Profile;
