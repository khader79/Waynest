import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/core/providers/AuthContext";

type SidebarItem = {
  key: string;
  to: string;
  label: string;
};

const LeftSidebar = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const username = user?.username ?? t("sidebar.guestName", { defaultValue: "Guest" });
  const avatarInitial = username.trim().charAt(0).toUpperCase() || "U";

  const items: SidebarItem[] = [
    {
      key: "profile",
      to: "/profile",
      label: t("sidebar.profile", { defaultValue: "Profile" }),
    },
    {
      key: "friends",
      to: "/inbox",
      label: t("sidebar.friends", { defaultValue: "Friends" }),
    },
    {
      key: "memories",
      to: "/community/memories",
      label: t("sidebar.memories", { defaultValue: "Memories" }),
    },
    {
      key: "saved",
      to: "/saved-plans",
      label: t("sidebar.saved", { defaultValue: "Saved" }),
    },
    {
      key: "groups",
      to: "/community/groups",
      label: t("sidebar.groups", { defaultValue: "Groups" }),
    },
    {
      key: "video",
      to: "/community/video",
      label: t("sidebar.video", { defaultValue: "Video" }),
    },
    {
      key: "marketplace",
      to: "/community/marketplace",
      label: t("sidebar.marketplace", { defaultValue: "Marketplace" }),
    },
    {
      key: "events",
      to: "/community/events",
      label: t("sidebar.events", { defaultValue: "Events" }),
    },
  ];

  return (
    <div className="fb3-card">
      <div className="fb3-profile">
        <div className="fb3-profileAvatar" aria-hidden="true">
          {avatarInitial}
        </div>
        <div className="fb3-profileName">
          <strong>{username}</strong>
          <span>{t("sidebar.profileSubtitle", { defaultValue: "Travel together" })}</span>
        </div>
      </div>

      <nav className="fb3-leftNav" aria-label={t("sidebar.navigation", { defaultValue: "Navigation" })}>
        {items.map((item) => (
          <NavLink
            key={item.key}
            to={item.to}
            className={({ isActive }) =>
              isActive ? "fb3-leftNavItem isActive" : "fb3-leftNavItem"
            }>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default LeftSidebar;

