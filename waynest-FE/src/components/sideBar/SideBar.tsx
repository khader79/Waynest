import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./SideBar.css";
import panelsLinks, { type Role } from "../../constants/panels.links";
import { useAuth } from "../../context/AuthContext";
import { IoMdClose } from "react-icons/io";

type SidebarProps = {
  role: Role;
  isOpen: boolean;
  onClose: () => void;
};

const Sidebar = ({ role, isOpen, onClose }: SidebarProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const getLinkTranslationKey = (name: string, role: Role): string => {
    const translationMap: Record<string, Record<Role, string>> = {
      "Dashboard": {
        user: "user.sidebar.dashboard",
        provider: "provider.sidebar.dashboard",
        admin: "admin.sidebar.dashboard",
      },
      "Profile": {
        user: "user.sidebar.profile",
        provider: "provider.sidebar.profile",
        admin: "admin.sidebar.dashboard",
      },
      "Bookings": {
        user: "user.sidebar.bookings",
        provider: "provider.sidebar.bookings",
        admin: "admin.sidebar.dashboard",
      },
      "Wishlist": {
        user: "user.sidebar.wishlist",
        provider: "provider.sidebar.dashboard",
        admin: "admin.sidebar.dashboard",
      },
      "My Places": {
        user: "user.sidebar.dashboard",
        provider: "provider.sidebar.myPlaces",
        admin: "admin.sidebar.dashboard",
      },
      "Users": {
        user: "user.sidebar.dashboard",
        provider: "provider.sidebar.dashboard",
        admin: "admin.sidebar.users",
      },
      "Providers": {
        user: "user.sidebar.dashboard",
        provider: "provider.sidebar.dashboard",
        admin: "admin.sidebar.providers",
      },
      "Places": {
        user: "user.sidebar.dashboard",
        provider: "provider.sidebar.dashboard",
        admin: "admin.sidebar.places",
      },
      "Countries": {
        user: "user.sidebar.dashboard",
        provider: "provider.sidebar.dashboard",
        admin: "admin.sidebar.countries",
      },
      "Cities": {
        user: "user.sidebar.dashboard",
        provider: "provider.sidebar.dashboard",
        admin: "admin.sidebar.cities",
      },
      "Currencies": {
        user: "user.sidebar.dashboard",
        provider: "provider.sidebar.dashboard",
        admin: "admin.sidebar.currencies",
      },
      "Tags": {
        user: "user.sidebar.dashboard",
        provider: "provider.sidebar.dashboard",
        admin: "admin.sidebar.tags",
      },
      "Events": {
        user: "user.sidebar.dashboard",
        provider: "provider.sidebar.dashboard",
        admin: "admin.sidebar.events",
      },
      "Reviews": {
        user: "user.sidebar.dashboard",
        provider: "provider.sidebar.dashboard",
        admin: "admin.sidebar.reviews",
      },
      "Place Pricing": {
        user: "user.sidebar.dashboard",
        provider: "provider.sidebar.dashboard",
        admin: "admin.sidebar.placePricing",
      },
      "Opening Hours": {
        user: "user.sidebar.dashboard",
        provider: "provider.sidebar.dashboard",
        admin: "admin.sidebar.openingHours",
      },
      "Provider Membership": {
        user: "user.sidebar.dashboard",
        provider: "provider.sidebar.dashboard",
        admin: "admin.sidebar.providerMembership",
      },
    };
    
    return translationMap[name]?.[role] || name;
  };

  const links = panelsLinks[role].map((link) => {
    if (link.name === "Profile" && user?.username) {
      return { ...link, path: `/user-panel/profile/${user.username}` };
    }
    return link;
  });
  
  const roleLabel = role === "admin" ? t("navbar.adminPanel") : 
                    role === "provider" ? t("navbar.userPanel") : 
                    t("navbar.userPanel");

  return (
    <aside className={`sidebar ${isOpen ? "is-open" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-title">{roleLabel}</div>
        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label={t("navbar.closeSidebar")}>
          <IoMdClose />
        </button>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => {
          const translationKey = getLinkTranslationKey(link.name, role);
          const translatedName = translationKey.includes("sidebar.") 
            ? t(translationKey) 
            : link.name;
          
          return (
            <NavLink
              key={link.path}
              to={link.path}
              end
              className={({ isActive }) =>
                `sidebar-link${isActive ? " active" : ""}`
              }
              onClick={onClose}>
              {translatedName}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
