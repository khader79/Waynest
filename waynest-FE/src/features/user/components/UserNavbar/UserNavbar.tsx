import { useAuth } from "../../../../context/AuthContext";
import "./UserNavbar.css";

const UserNavbar = () => {
  const { logout } = useAuth();
  return (
    <header className="user-navbar">
      <div className="user-navbar-title">Welcome, User</div>
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
