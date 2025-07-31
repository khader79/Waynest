import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const FooterLogic = () => {
  const location = useLocation();
  const [hideFooter, setHideFooter] = useState(false);

  useEffect(() => {
    const path = location.pathname;
    if (path === "/login" || path === "/register") {
      setHideFooter(true);
    } else {
      setHideFooter(false);
    }
  }, [location.pathname]);

  return { hideFooter };
};

export default FooterLogic;
