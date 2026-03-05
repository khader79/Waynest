import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";

type NavbarProps = {
  title?: string;
};

const Navbar = ({ title }: NavbarProps) => {
  const { logout, user } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-title">
        {title ?? `Welcome, ${user?.username}`}
      </div>
      <button className="navbar-logout" onClick={logout}>
        Logout
      </button>
    </header>
  );
};

export default Navbar;
