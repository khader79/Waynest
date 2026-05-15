import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { FiCpu, FiLoader, FiMessageSquare } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { openAiConversation, sendAiReply } from "@/api/social";
import {
  generateWaynestAiReply,
  isPuterChatAvailable,
} from "@/services/ai/puter";
import { setActiveWorkspace } from "@/utils/activeWorkspaceStorage";
import { getApiErrorMessage } from "@/utils/errors";
import "./GlobalAiConciergeLauncher.css";

const HIDDEN_PREFIXES = [
  "/login",
  "/register",
  "/verify-email",
  "/choose-account",
  "/admin-panel",
  "/unauthorized",
];

const CHAT_PREFIXES = ["/social", "/inbox"];

const buildLocalFallbackGreeting = ({ t, conversationTitle }) =>
  t("ai.launcherFallbackGreeting", {
    defaultValue: `Hi, I am ${conversationTitle || "Waynest AI"}. I can help with trips, places, budgets, routes, and local ideas. What are you planning?`,
  });

const GlobalAiConciergeLauncher = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [opening, setOpening] = useState(false);

  const showLauncher = useMemo(() => {
    const isMember = user?.role === "USER" || user?.role === "PROVIDER";
    if (!isMember) {
      return false;
    }

    if (
      HIDDEN_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))
    ) {
      return false;
    }

    if (CHAT_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))) {
      return false;
    }

    return true;
  }, [location.pathname, user?.role]);

  const handleOpenAi = useCallback(async () => {
    if (opening) {
      return;
    }

    setOpening(true);
    try {
      const conversationTitle = t("ai.launcherTitle", {
        defaultValue: "Ask the trip concierge",
      });
      const aiLaunchPrompt =
        "Start a new conversation as Waynest AI Concierge. Greet the user warmly, explain that you can help with trips, places, budgets, routes, and local ideas, and ask one helpful opening question.";
      const usePuterGreeting = isPuterChatAvailable();

      const response = await openAiConversation(
        usePuterGreeting ? { skipWelcome: true } : {},
      );
      const conversationId = response?.conversation?.id ?? "";

      if (!conversationId) {
        throw new Error("Missing AI conversation id");
      }

      let greetingSent = false;

      if (usePuterGreeting) {
        try {
          const greeting = await generateWaynestAiReply({
            conversationTitle,
            conversationHistory: [],
            userMessage: aiLaunchPrompt,
            locale: i18n.language,
          });

          if (greeting) {
            await sendAiReply(conversationId, { content: greeting });
            greetingSent = true;
          }
        } catch {
          greetingSent = false;
        }
      }

      if (!greetingSent) {
        try {
          await sendAiReply(conversationId, { userMessage: aiLaunchPrompt });
          greetingSent = true;
        } catch {
          await sendAiReply(conversationId, {
            content: buildLocalFallbackGreeting({
              t,
              conversationTitle,
            }),
          });
        }
      }

      if (user?.role === "PROVIDER" && user?.id) {
        setActiveWorkspace(user.id, "personal");
      }

      navigate(`/social?conversation=${encodeURIComponent(conversationId)}`);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("ai.launchFailed", {
            defaultValue: "Could not open Waynest AI",
          }),
        ),
      );
    } finally {
      setOpening(false);
    }
  }, [i18n.language, navigate, opening, t, user?.id, user?.role]);

  if (!showLauncher) {
    return null;
  }

  return (
    <button
      type="button"
      className="global-ai-launcher"
      onClick={() => void handleOpenAi()}
      disabled={opening}
      aria-label={t("ai.launcherLabel", {
        defaultValue: "Open Waynest AI concierge",
      })}>
      <span className="global-ai-launcher__icon" aria-hidden>
        {opening ? (
          <FiLoader className="global-ai-launcher__spin" />
        ) : (
          <FiCpu />
        )}
      </span>
      <span className="global-ai-launcher__copy">
        <span className="global-ai-launcher__eyebrow">
          {t("ai.launcherEyebrow", { defaultValue: "Waynest AI" })}
        </span>
        <strong>
          {opening
            ? t("ai.opening", { defaultValue: "Opening assistant..." })
            : t("ai.launcherTitle", {
                defaultValue: "Ask the trip concierge",
              })}
        </strong>
        <span>
          {t("ai.launcherText", {
            defaultValue: "Routes, places, budgets, and ideas in one chat.",
          })}
        </span>
      </span>
      <span className="global-ai-launcher__cta" aria-hidden>
        <FiMessageSquare />
      </span>
    </button>
  );
};

export default GlobalAiConciergeLauncher;
