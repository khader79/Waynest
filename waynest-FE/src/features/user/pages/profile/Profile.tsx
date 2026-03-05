import { useEffect, useState } from "react";
import "./Profile.css";
import { get } from "../../../../api/apiService";
import { USERS_ENDPOINTS } from "../../../../api/endpoints";
import { useAuth } from "../../../../context/AuthContext";

const Profile = () => {
  const { user, loading } = useAuth();
  const [profileData, setProfileData] = useState({
    email: "",
    Name: "",
    phone: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (loading || !user?.userId) return;

      try {
        const res = await get(USERS_ENDPOINTS.Profile(user?.userId));
        setProfileData({
          email: res.email || "",
          Name: `${res.firstName} ${res.lastName} ` || "",
          phone: res.phone || "",
        });
      } catch (err) {
        console.error("Fetch Error:", err);
      }
    };

    fetchProfile();
  }, [user, loading]);

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
              value={profileData.Name}
              readOnly
            />
          </label>
          <label className="profile-field">
            <span>Email</span>
            <input
              type="email"
              placeholder="john@example.com"
              value={profileData.email}
              readOnly
            />
          </label>
          <label className="profile-field profile-field--wide">
            <span>Phone</span>
            <input
              type="tel"
              placeholder="+1 555 123 4567"
              value={profileData.phone}
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
