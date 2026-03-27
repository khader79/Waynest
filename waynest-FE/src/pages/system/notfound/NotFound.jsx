import { useNavigate } from "react-router-dom";
import StatusPage from "@/components/shared/StatusPage";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <StatusPage
      errorCode="404"
      errorcodeColor="red"
      title="Oops! Page Not Found"
      subTitle="The page you are looking for doesn't exist."
      buttonText="Go Back"
      onButtonClick={() => navigate(-1)} />);


};

export default NotFound;