import { useEffect, useState } from "react";
import "./Profile.css";
import { get } from "../../../../api/apiService";
import { USERS_ENDPOINTS } from "../../../../api/endpoints";
import { useAuth } from "../../../../context/AuthContext";

const Profile = () => {
  const { user, loading } = useAuth();
  const [profileData, setProfileData] = useState({ email: "", firstName: "" });
  console.log(user);
  useEffect(() => {
    const fetchProfile = async () => {
      if (loading || !user?.sub) return;
      const token = localStorage.getItem("access_token");
      try {
        const res = await get(
          USERS_ENDPOINTS.Profile(user?.sub),
          token?.toString(),
        );
        setProfileData({
          ...profileData,
          email: res.email,
          firstName: res.firstName,
        });
      } catch (err) {
        console.error("Fetch Error:", err);
      }
    };

    fetchProfile();
  }, []);

  return (
    <section className="profile">
      <h1 className="profile-title">Your Profile</h1>
      <form className="profile-form">
        <label className="profile-field">
          <span>Name</span>
          <input
            type="text"
            placeholder="John Doe"
            value={profileData.firstName}
          />
        </label>
        <label className="profile-field">
          <span>Email</span>
          <input
            type="email"
            placeholder="john@example.com"
            value={profileData.email}
          />
        </label>
        <label className="profile-field">
          <span>Phone</span>
          <input type="tel" placeholder="+1 555 123 4567" />
        </label>
        <button className="profile-save" type="button">
          Save
        </button>
      </form>
    </section>
  );
};

export default Profile;
