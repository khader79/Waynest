import { useUserProfilePage } from "../../hooks/useUserProfilePage";
import "./Profile.css";

const Profile = () => {
  const profile = useUserProfilePage();

  return (
    <section className="profile">
      <header className="profile-header">
        <p className="profile-kicker">Account Center</p>
        <h1 className="profile-title">Your Profile</h1>
        <p className="profile-subtitle">
          Keep your personal details sharp and always up to date.
        </p>
      </header>
      <form className="profile-form">
        <div className="profile-grid">
          <label className="profile-field">
            <span>Name</span>
            <input
              type="text"
              placeholder="John Doe"
              value={profile.fullName}
              readOnly
            />
          </label>
          <label className="profile-field">
            <span>Email</span>
            <input
              type="email"
              placeholder="john@example.com"
              value={profile.email}
              readOnly
            />
          </label>
          <label className="profile-field profile-field--wide">
            <span>Phone</span>
            <input
              type="tel"
              placeholder="+1 555 123 4567"
              value={profile.phone}
              readOnly
            />
          </label>
        </div>
        <div className="profile-actions">
          <button className="profile-save" type="button">
            Save Changes
          </button>
        </div>
      </form>
    </section>
  );
};

export default Profile;
