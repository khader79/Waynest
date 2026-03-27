import { Navigate, useParams } from "react-router-dom";

const CommunityTabPlaceholder = () => {
  const { tab = "" } = useParams();
  const normalized = tab.trim().toLowerCase();

  if (normalized === "groups") {
    return <Navigate to="/social?tab=groups" replace />;
  }

  return <Navigate to="/social" replace />;
};

export default CommunityTabPlaceholder;