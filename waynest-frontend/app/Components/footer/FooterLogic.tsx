"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const FooterLogic = () => {
  const pathname = usePathname();
  const [hideFooter, setHideFooter] = useState(true);

  useEffect(() => {
    console.log(pathname === "/login" || pathname === "/register");
    if (pathname === "/login" || pathname === "/register") {
      setHideFooter(true);
    } else setHideFooter(false);
  }, [pathname]);

  return { hideFooter };
};

export default FooterLogic;
