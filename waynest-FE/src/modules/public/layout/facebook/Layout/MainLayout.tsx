import { ReactNode } from "react";
import { PublicLayoutVariant } from "@/modules/public/PublicLayout";
import Feed from "./Feed";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";

import "../facebookLayout.css";

type MainLayoutProps = {
  children: ReactNode;
  variant?: PublicLayoutVariant;
};

const MainLayout = ({ children, variant = "guest-discovery" }: MainLayoutProps) => {
  const showLeftRail = variant !== "auth" && variant !== "messenger" && variant !== "guest-discovery";
  const showRightRail = variant === "signed-in-social";

  return (
    <div className={`fb3-layout fb3-layout--${variant}`}>
      {showLeftRail ? (
        <aside className="fb3-sidebar fb3-left">
          <LeftSidebar variant={variant} />
        </aside>
      ) : null}

      <section className={`fb3-center fb3-center--${variant}`}>
        <Feed>{children}</Feed>
      </section>

      {showRightRail ? (
        <aside className="fb3-sidebar fb3-right">
          <RightSidebar />
        </aside>
      ) : null}
    </div>
  );
};

export default MainLayout;

