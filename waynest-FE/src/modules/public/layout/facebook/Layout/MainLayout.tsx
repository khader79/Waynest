import type { ReactNode } from "react";
import Feed from "./Feed";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";

import "../facebookLayout.css";

type MainLayoutProps = {
  children: ReactNode;
};

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="fb3-layout">
      <aside className="fb3-sidebar fb3-left">
        <LeftSidebar />
      </aside>

      <section className="fb3-center">
        <Feed>{children}</Feed>
      </section>

      <aside className="fb3-sidebar fb3-right">
        <RightSidebar />
      </aside>
    </div>
  );
};

export default MainLayout;

