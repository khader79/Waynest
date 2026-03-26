import { Navigate, useParams } from "react-router-dom";

const ConversationPage = () => {
  const { id = "" } = useParams();
  const encodedId = encodeURIComponent(id);

  return <Navigate to={encodedId ? `/social?conversation=${encodedId}` : "/social"} replace />;
};

export default ConversationPage;