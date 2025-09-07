import { Outlet } from "react-router";
import Navbar from "./Components/navbar/Navbar";

const UsersLayout = () => {
  return (
    <div>
      <Navbar />
      <Outlet />
    </div>
  );
};

export default UsersLayout;
