import type { ReactNode } from "react";
import type { PublicLayoutVariant } from "@/modules/public/PublicLayout";
import {
  FiArrowRight,
  FiBookmark,
  FiCompass,
  FiHome,
  FiInfo,
  FiLogIn,
  FiMail,
  FiMap,
  FiMessageSquare,
  FiUser,
} from "react-icons/fi";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/core/providers/AuthContext";

type SidebarItem = {
  key: string;
  to: string;
  label: string;
  description: string;
  icon: ReactNode;
  end?: boolean;
};

type LeftSidebarProps = {
  variant?: PublicLayoutVariant;
};

const LeftSidebar = ({ variant = "guest-discovery" }: LeftSidebarProps) => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const isSignedIn = Boolean(user && user.role !== "ADMIN");

  const username = user?.username ?? t("sidebar.guestName", { defaultValue: "Guest" });
  const avatarInitial = username.trim().charAt(0).toUpperCase() || "U";

  const guestItems: SidebarItem[] = [
    {
      key: "home",
      to: "/",
      label: t("navbar.home", { defaultValue: "Home" }),
      description: t("sidebar.homeHint", { defaultValue: "Travel highlights and discovery" }),
      icon: <FiHome />,
      end: true,
    },
    {
      key: "explore",
      to: "/explore",
      label: t("navbar.explore", { defaultValue: "Explore" }),
      description: t("sidebar.exploreHint", {
        defaultValue: "Browse places, events, and providers",
      }),
      icon: <FiCompass />,
    },
    {
      key: "planner",
      to: "/plan",
      label: t("navbar.planner", { defaultValue: "Planner" }),
      description: t("sidebar.plannerHint", {
        defaultValue: "Build an AI route before you sign in",
      }),
      icon: <FiMap />,
    },
    {
      key: "about",
      to: "/about",
      label: t("navbar.about", { defaultValue: "About" }),
      description: t("sidebar.aboutHint", { defaultValue: "See what Waynest is building" }),
      icon: <FiInfo />,
    },
    {
      key: "contact",
      to: "/contact",
      label: t("navbar.contact", { defaultValue: "Contact" }),
      description: t("sidebar.contactHint", { defaultValue: "Reach the Waynest team" }),
      icon: <FiMail />,
    },
  ];

  const memberItems: SidebarItem[] = [
    {
      key: "home",
      to: "/",
      label: t("navbar.home", { defaultValue: "Home" }),
      description: t("sidebar.memberHomeHint", {
        defaultValue: "Your travel feed and live traveler activity",
      }),
      icon: <FiHome />,
      end: true,
    },
    {
      key: "explore",
      to: "/explore",
      label: t("navbar.explore", { defaultValue: "Explore" }),
      description: t("sidebar.exploreHint", {
        defaultValue: "Browse places, events, and providers",
      }),
      icon: <FiCompass />,
    },
    {
      key: "planner",
      to: "/plan",
      label: t("navbar.planner", { defaultValue: "Planner" }),
      description: t("sidebar.memberPlannerHint", {
        defaultValue: "Generate and refine your next AI itinerary",
      }),
      icon: <FiMap />,
    },
    {
      key: "community",
      to: "/social",
      label: t("social.feed.title", { defaultValue: "Community" }),
      description: t("sidebar.communityHint", {
        defaultValue: "Open posts, stories, and travel conversations",
      }),
      icon: <FiMessageSquare />,
    },
    {
      key: "saved",
      to: "/saved-plans",
      label: t("sidebar.saved", { defaultValue: "Saved Plans" }),
      description: t("sidebar.savedHint", {
        defaultValue: "Return to the trips you kept for later",
      }),
      icon: <FiBookmark />,
    },
    {
      key: "inbox",
      to: "/inbox",
      label: t("navbar.inbox", { defaultValue: "Inbox" }),
      description: t("sidebar.inboxHint", {
        defaultValue: "Pick up traveler chats and coordination",
      }),
      icon: <FiMessageSquare />,
    },
    {
      key: "profile",
      to: "/profile",
      label: t("sidebar.profile", { defaultValue: "Profile" }),
      description: t("sidebar.profileHint", {
        defaultValue: "Manage your account and travel identity",
      }),
      icon: <FiUser />,
    },
  ];

  const items = isSignedIn ? memberItems : guestItems;
  const showJoinCard = !isAuthenticated;
  const showCommunityAction = isSignedIn;

  return (
    <div className="fb3-sidebarStack">
      <section className="fb3-card fb3-card--profile">
        <div className="fb3-profile">
          <div className="fb3-profileAvatar" aria-hidden="true">
            {avatarInitial}
          </div>
          <div className="fb3-profileName">
            <strong>{username}</strong>
            <span>
              {isSignedIn
                ? t("sidebar.profileSubtitle", { defaultValue: "Travel together" })
                : t("sidebar.discoverySubtitle", { defaultValue: "Discover first, join when ready" })}
            </span>
          </div>
        </div>

        <span className="fb3-profileBadge">
          {isSignedIn
            ? t("sidebar.aiMode", { defaultValue: "Travel network active" })
            : t("sidebar.guestMode", { defaultValue: "Guest discovery" })}
        </span>
        <p className="fb3-cardText">
          {isSignedIn
            ? variant === "signed-in-social"
              ? t("sidebar.profileLead", {
                  defaultValue:
                    "Your home is now focused on feed, planning, and conversations without extra clutter.",
                })
              : t("sidebar.profileLeadCompact", {
                  defaultValue:
                    "You can jump back to the feed any time, while this page stays focused on discovery and planning.",
                })
            : t("sidebar.guestLead", {
                defaultValue:
                  "Explore places, events, and providers, then create an account when you want the social layer.",
              })}
        </p>

        <div className="fb3-quickActionRow">
          <Link to="/plan" className="fb3-quickActionBtn fb3-quickActionBtn--primary">
            {t("sidebar.planTrip", { defaultValue: "Plan a trip" })}
          </Link>
          <Link
            to={showCommunityAction ? "/social" : "/register"}
            className="fb3-quickActionBtn">
            {showCommunityAction
              ? t("sidebar.openFeed", { defaultValue: "Open feed" })
              : t("navbar.signUp", { defaultValue: "Sign Up" })}
          </Link>
        </div>
      </section>

      <nav
        className="fb3-card fb3-card--nav"
        aria-label={t("sidebar.navigation", { defaultValue: "Navigation" })}>
        <h3 className="fb3-cardTitle">
          {t("sidebar.navigationTitle", {
            defaultValue: isSignedIn ? "Traveler shortcuts" : "Waynest shortcuts",
          })}
        </h3>
        <div className="fb3-leftNav">
          {items.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? "fb3-leftNavItem isActive" : "fb3-leftNavItem"
              }>
              <span className="fb3-leftNavIcon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="fb3-leftNavLabelWrap">
                <span className="fb3-leftNavLabel">{item.label}</span>
                <span className="fb3-leftNavMeta">{item.description}</span>
              </span>
              <FiArrowRight className="fb3-leftNavArrow" aria-hidden="true" />
            </NavLink>
          ))}
        </div>
      </nav>

      {showJoinCard ? (
        <section className="fb3-card fb3-card--planner">
          <span className="fb3-miniTag">
            {t("sidebar.plannerTag", { defaultValue: "Member access" })}
          </span>
          <h3 className="fb3-cardTitle">
            {t("sidebar.joinCardTitle", { defaultValue: "Unlock the social layer" })}
          </h3>
          <p className="fb3-cardText">
            {t("sidebar.joinCardBody", {
              defaultValue:
                "Sign in when you want stories, chats, saved plans, profiles, and traveler connections.",
            })}
          </p>
          <Link to="/login" className="fb3-railLinkButton fb3-railLinkButton--accent">
            <FiLogIn aria-hidden="true" />
            <span>{t("navbar.login", { defaultValue: "Login" })}</span>
          </Link>
        </section>
      ) : null}
    </div>
  );
};

export default LeftSidebar;
