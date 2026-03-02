import { useNavigate } from "react-router-dom";
import StatusPage from "../../components/statuspage/StatusPage";

const Unauthorized = () => {
  const navigate = useNavigate();
  return (
    <StatusPage
      errorCode="401"
      errorcodeColor="orange"
      title="Access Denied"
      subTitle="You don't have permission to view this page."
      buttonText="Go Back"
      onButtonClick={() => navigate(-1)}
    />
  );
};

export default Unauthorized;
