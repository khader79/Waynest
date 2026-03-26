import { Link } from "react-router-dom";
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
      <form className="profile-form">
        <div className="profile-grid">
          <label className="profile-field">
            <span>Name</span>
            <input
              type="text"
              placeholder="John Doe"
              value={profile.fullName}
              readOnly />
            
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
              value={profile.phone}
              readOnly />
            
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