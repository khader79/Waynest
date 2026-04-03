import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";

import { useMediaQuery } from "@/hooks/useMediaQuery";

import Feed from "./Feed";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";

import "../facebookLayout.css";

const MOBILE_BREAKPOINT = "(max-width: 860px)";

const MainLayout = ({ children, variant = "guest-discovery" }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const hideSocialRailsForProfile =
    variant === "signed-in-social" && location.pathname === "/profile";
  const showLeftRail =
    variant !== "auth" &&
    variant !== "messenger" &&
    variant !== "guest-discovery" &&
    !hideSocialRailsForProfile;
  const showRightRail = variant === "signed-in-social" && !hideSocialRailsForProfile;
  const isMobileSidebar = useMediaQuery(MOBILE_BREAKPOINT);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileSidebar) {
      setMobileMenuOpen(false);
    }
  }, [isMobileSidebar]);

  useEffect(() => {
    if (!mobileMenuOpen || typeof document === "undefined") {
      return undefined;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileMenuOpen]);

  const desktopLeftAside =
    showLeftRail && !isMobileSidebar ? (
      <aside className="fb3-sidebar fb3-left">
        <LeftSidebar variant={variant} />
      </aside>
    ) : null;

  const mobileRailChrome =
    showLeftRail && isMobileSidebar ? (
      <>
        <div className="fb3-mobileRailBar">
          <button
            type="button"
            className="fb3-mobileRailBarBtn"
            onClick={() => setMobileMenuOpen(true)}
            aria-expanded={mobileMenuOpen}
            aria-controls="fb3-mobile-sidebar-drawer"
          >
            <FiMenu aria-hidden />
            <span>{t("sidebar.openMenu", { defaultValue: "Menu" })}</span>
          </button>
        </div>
        {mobileMenuOpen ? (
          <>
            <button
              type="button"
              className="fb3-mobileRailBackdrop"
              aria-label={t("sidebar.closeMenu", { defaultValue: "Close menu" })}
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside
              id="fb3-mobile-sidebar-drawer"
              className="fb3-sidebar fb3-sidebar--mobileDrawer"
              aria-modal="true"
              role="dialog"
              aria-label={t("sidebar.navigation", { defaultValue: "Navigation" })}
            >
              <div className="fb3-sidebarDrawerHeader">
                <button
                  type="button"
                  className="fb3-sidebarDrawerClose"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label={t("sidebar.closeMenu", { defaultValue: "Close menu" })}
                >
                  <FiX aria-hidden />
                </button>
              </div>
              <LeftSidebar variant={variant} />
            </aside>
          </>
        ) : null}
      </>
    ) : null;

  return (
    <div
      className={`fb3-layout fb3-layout--${variant}${
        hideSocialRailsForProfile ? " fb3-layout--full-center" : ""
      }`}
    >
      {desktopLeftAside}
      <section className={`fb3-center fb3-center--${variant}`}>
        {mobileRailChrome}
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
