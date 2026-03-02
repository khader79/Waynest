import "./Profile.css";

const Profile = () => {
  return (
    <section className="profile">
      <h1 className="profile-title">Your Profile</h1>
      <form className="profile-form">
        <label className="profile-field">
          <span>Name</span>
          <input type="text" placeholder="John Doe" />
        </label>
        <label className="profile-field">
          <span>Email</span>
          <input type="email" placeholder="john@example.com" />
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
