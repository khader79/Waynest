import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getDefaultDashboardPath } from "@/utils/routing";
import StatusPage from "@/components/shared/StatusPage";

const Unauthorized = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handleBack = () => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    const target = getDefaultDashboardPath(user?.role);
    navigate(target, { replace: true });
  };

  return (
    <StatusPage
      errorCode="401"
      errorcodeColor="orange"
      title="Access Denied"
      subTitle="You don't have permission to view this page."
      buttonText="Go Back"
      onButtonClick={handleBack} />
  );
};

export default Unauthorized;
