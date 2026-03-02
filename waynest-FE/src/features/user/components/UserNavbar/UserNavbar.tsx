import { useAuth } from "../../../../context/AuthContext";
import "./UserNavbar.css";

const UserNavbar = () => {
  const { logout, user } = useAuth();
  return (
    <header className="user-navbar">
      <div className="user-navbar-title">Welcome, {user?.username}</div>
      <button
        className="user-navbar-logout"
        type="button"
        onClick={() => {
          logout();
        }}>
        Logout
      </button>
    </header>
  );
};

export default UserNavbar;
