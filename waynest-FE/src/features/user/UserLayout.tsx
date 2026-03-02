import { Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar/Sidebar";
import UserNavbar from "./components/UserNavbar/UserNavbar";
import "./UserLayout.css";

const UserLayout = () => {
  return (
    <div className="user-layout">
      <Sidebar />
      <div className="user-main">
        <UserNavbar />
        <div className="user-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default UserLayout;
