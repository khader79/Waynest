import "./UserNavbar.css";

const UserNavbar = () => {
  return (
    <header className="user-navbar">
      <div className="user-navbar-title">Welcome, User</div>
      <button className="user-navbar-logout" type="button">
        Logout
      </button>
    </header>
  );
};

export default UserNavbar;
