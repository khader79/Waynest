import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AuthLoader = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="container-center">
        <div className="spinner">Loading...</div>
      </div>
    );
  }

  return <Outlet />;
};

export default AuthLoader;
