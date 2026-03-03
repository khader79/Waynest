import { useAuth } from "../../context/AuthContext";

const AdminLayout = () => {
  const { logout } = useAuth();

  return (
    <div>
      AdminLayout
      <button onClick={logout}>Logout</button>
    </div>
  );
};

export default AdminLayout;
