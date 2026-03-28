import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { updateUserProfile } from "@/api/user";
import { useUserProfilePage } from "@/hooks/user/useUserProfilePage";
import "./Profile.css";

const Profile = () => {
  const { user } = useAuth();
  const profile = useUserProfilePage();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ fullName: "", phone: "" });

  const avatarInitial = (profile.fullName || user?.username || "U").trim().charAt(0).toUpperCase();

  const startEdit = () => {
    setDraft({ fullName: profile.fullName, phone: profile.phone });
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!user?.userId) return;
    try {
      setSaving(true);
      const [firstName, ...rest] = draft.fullName.trim().split(" ");
      await updateUserProfile(user.userId, {
        firstName: firstName || "",
        lastName: rest.join(" ") || undefined,
        phone: draft.phone || undefined,
      });
      toast.success("Profile updated");
      setEditing(false);
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="profile">
      <header className="profile-header">
        <div className="profile-avatar-area">
          <div className="profile-avatar-circle">{avatarInitial}</div>
          <div>
            <p className="profile-kicker">Account Center</p>
            <h1 className="profile-title">Your Profile</h1>
          </div>
        </div>
        <p className="profile-subtitle">
          Keep your personal details sharp and always up to date.
        </p>
      </header>
      <section className="profile-stats-grid">
        <article className="profile-stat-card">
          <span>Wishlist</span>
          <strong>{profile.wishlistCount}</strong>
          <Link to="/wishlist">View wishlist</Link>
        </article>
        <article className="profile-stat-card">
          <span>Saved plans</span>
          <strong>{profile.savedPlansCount}</strong>
          <Link to="/saved-plans">Open saved plans</Link>
        </article>
      </section>
      <form className="profile-form" onSubmit={saveEdit}>
        <div className="profile-form-actions">
          {editing ? (
            <>
              <button type="submit" className="profile-btn-save" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button type="button" className="profile-btn-cancel" onClick={cancelEdit}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="profile-btn-edit" onClick={startEdit}>
              Edit profile
            </button>
          )}
        </div>
        <div className="profile-grid">
          <label className="profile-field">
            <span>Name</span>
            <input
              type="text"
              placeholder="John Doe"
              value={editing ? draft.fullName : profile.fullName}
              onChange={(e) => setDraft((d) => ({ ...d, fullName: e.target.value }))}
              readOnly={!editing} />
          </label>
          <label className="profile-field">
            <span>Email</span>
            <input
              type="email"
              placeholder="john@example.com"
              value={profile.email}
              readOnly />
          </label>
          <label className="profile-field profile-field--wide">
            <span>Phone</span>
            <input
              type="tel"
              placeholder="+1 555 123 4567"
              value={editing ? draft.phone : profile.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              readOnly={!editing} />
          </label>
        </div>
      </form>

      <section className="profile-recent-grid">
        <article className="profile-recent-card">
          <div className="profile-recent-head">
            <h3>Recent wishlist</h3>
            <Link to="/wishlist">View all</Link>
          </div>
          {profile.recentWishlist.length === 0 ?
          <p className="profile-recent-empty">No wishlist items yet.</p> :

          <ul>
              {profile.recentWishlist.map((item) =>
            <li key={item.id}>
                  <Link to={`/places/${item.placeId}`}>{item.name}</Link>
                </li>
            )}
            </ul>
          }
        </article>

        <article className="profile-recent-card">
          <div className="profile-recent-head">
            <h3>Recent saved plans</h3>
            <Link to="/saved-plans">View all</Link>
          </div>
          {profile.recentSavedPlans.length === 0 ?
          <p className="profile-recent-empty">No saved plans yet.</p> :

          <ul>
              {profile.recentSavedPlans.map((plan) =>
            <li key={plan.id}>
                  <span>{plan.title}</span>
                  <small>{new Date(plan.createdAt).toLocaleDateString()}</small>
                </li>
            )}
            </ul>
          }
        </article>
      </section>
    </section>);

};

export default Profile;