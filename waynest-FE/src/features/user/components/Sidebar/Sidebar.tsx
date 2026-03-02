import { Link } from "react-router-dom";
import "./Sidebar.css";

const Sidebar = () => {
  return (
    <aside className="user-sidebar">
      <div className="user-sidebar-title">User Panel</div>
      <nav className="user-sidebar-nav">
        <Link className="user-sidebar-link" to="/user-panel">
          Dashboard
        </Link>
        <Link className="user-sidebar-link" to="/user-panel/profile">
          Profile
        </Link>
        <Link className="user-sidebar-link" to="/user-panel/bookings">
          Bookings
        </Link>
        <Link className="user-sidebar-link" to="/user-panel/wishlist">
          Wishlist
        </Link>
      </nav>
    </aside>
  );
};

export default Sidebar;
