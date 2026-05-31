import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  FiBookmark,
  FiCalendar,
  FiCompass,
  FiCpu,
  FiLoader,
  FiMapPin,
  FiSearch,
  FiSend,
  FiX,
} from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import {
  generateWaynestAiDirectiveReply,
  isPuterChatAvailable,
} from "@/services/ai/puter";
import { extractTripFromText } from "@/services/ai/tripParser";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import { setActiveWorkspace } from "@/utils/activeWorkspaceStorage";
import "./GlobalAiConciergeLauncher.css";

const HIDDEN_PREFIXES = [
  "/login",
  "/register",
  "/verify-email",
  "/choose-account",
  "/admin-panel",
  "/unauthorized",
  "/messenger",
  "/social",
];

const QUICK_ACTIONS = [
  {
    label: "Explore",
    description: "Browse places and ideas",
    path: "/explore",
    icon: FiCompass,
  },
  {
    label: "Plan trip",
    description: "Open the AI trip planner",
    path: "/plan",
    icon: FiMapPin,
  },
  {
    label: "Saved plans",
    description: "Open your saved itineraries",
    path: "/saved-plans",
    icon: FiBookmark,
  },
  {
    label: "Calendar",
    description: "Jump to bookings and schedule",
    path: "/calendar",
    icon: FiCalendar,
  },
  {
    label: "Search",
    description: "Find places faster",
    path: "/search",
    icon: FiSearch,
  },
];

const LOCAL_ACTIONS = [
  {
    pattern: /\b(explore|places|discover|استكشف|استكشاف|أماكن|اماكن)\b/i,
    path: "/explore",
    reply: "Opening Explore.",
  },
  {
    pattern: /\b(plan|planner|trip plan|trip planner|بلان|خطة)\b/i,
    path: "/plan",
    reply: "Opening the trip planner.",
  },
  {
    pattern: /\b(saved plans?|saved|plans?|محفوظ|محفوظات)\b/i,
    path: "/saved-plans",
    reply: "Opening your saved plans.",
  },
  {
    pattern: /\b(calendar|bookings?|schedule|agenda|تقويم|حجوزات)\b/i,
    path: "/calendar",
    reply: "Opening the calendar.",
  },
  {
    pattern:
      /\b(wishlist|favorites?|favourites?|saved places?|مفضلة|مفضلات)\b/i,
    path: "/wishlist",
    reply: "Opening your wishlist.",
  },
  {
    pattern: /\b(search|find|lookup|ابحث|بحث)\b/i,
    path: "/search",
    reply: "Opening search.",
  },
  {
    pattern:
      /\b(profile photo|profile picture|avatar|change photo|edit profile|update profile|change avatar|صورة البروفايل|صورة الحساب|تعديل البروفايل|تغيير البروفايل)\b/i,
    type: "profile",
    editMode: "avatar",
    reply: "Opening your profile edit view.",
  },
  {
    pattern:
      /\b(profile|account settings|settings|البروفايل|الحساب|إعدادات الحساب|تعديل الاسم|تعديل البيانات)\b/i,
    type: "profile",
    editMode: "details",
    reply: "Opening your profile.",
  },
  {
    pattern:
      /\b(plan trip|trip plan|trip planner|make a plan|create a plan|build a plan|بلان|خطة سفر|خطط لي|رتبلي رحلة|رحلة|سفر)\b/i,
    type: "plan",
    reply: "Opening the trip planner and preparing the request.",
  },
];

const buildFallbackGreeting = ({ t }) =>
  t("ai.launcherFallbackGreeting", {
    defaultValue:
      "Hi, I’m Waynest AI. I can open pages, shape trip plans, and help you move fast across the app. What do you want to do first?",
  });

const buildFallbackReply = ({ t }) =>
  t("ai.launcherFallbackReply", {
    defaultValue:
      "I can help with places, trip planning, saved plans, bookings, and quick navigation inside Waynest.",
  });

const createMessageId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const createMessage = (role, content, extra = {}) => ({
  id: createMessageId(),
  role,
  content,
  ...extra,
});

const toPromptHistory = (messages) =>
  messages
    .slice(-12)
    .map((message) => ({ role: message.role, content: message.content }));

const resolveLocalAction = (message) => {
  const normalized = typeof message === "string" ? message : "";
  return LOCAL_ACTIONS.find((entry) => entry.pattern.test(normalized)) ?? null;
};

const buildTripRequestFromMessage = (message) => {
  const normalized = String(message ?? "").trim();
  if (!normalized) return null;

  const daysMatch = normalized.match(/(\d+)\s*(days?|يوم|ايام|أيام)/i);
  const personsMatch = normalized.match(
    /(\d+)\s*(persons?|people|adults?|travellers?|traveler|مسافر|اشخاص|أشخاص)/i,
  );
  const budgetMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:usd|dollars?|eur|euro|ils|sar|aed|jod|egp|try)?/i,
  );
  const destinationMatch = normalized.match(
    /(?:to|for|in|الى|إلى|لـ|ل|بـ)\s+([A-Za-z\u0600-\u06FF][A-Za-z0-9\u0600-\u06FF\s,'-]{1,60})/i,
  );

  return {
    naturalLanguagePrompt: normalized,
    destination: destinationMatch?.[1]?.trim() || "",
    days: daysMatch ? Number(daysMatch[1]) : undefined,
    persons: personsMatch ? Number(personsMatch[1]) : undefined,
    budget: budgetMatch ? Number(budgetMatch[1]) : undefined,
  };
};

const normalizeTripParseResult = (result, prompt) => ({
  naturalLanguagePrompt: String(prompt ?? "").trim(),
  naturalLanguageCity: String(result?.destination ?? "").trim(),
  naturalLanguageCountry: String(result?.country ?? "").trim(),
  days: Number(result?.days) || undefined,
  persons: Number(result?.persons) || undefined,
  budget: Number(result?.budget) || undefined,
  currencyCode: String(result?.currency ?? "").trim() || "ILS",
  interests: Array.isArray(result?.interests)
    ? result.interests.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [],
});

const storePendingTripGeneration = (formData) => {
  try {
    localStorage.setItem(
      STORAGE_KEYS.pendingTripGeneration,
      JSON.stringify({ formData }),
    );
  } catch {}
};

const GlobalAiConciergeLauncher = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const initializedRef = useRef(false);

  const showLauncher = useMemo(() => {
    const isMember = user?.role === "USER" || user?.role === "PROVIDER";
    if (!isMember) return false;

    if (
      HIDDEN_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))
    ) {
      return false;
    }

    return true;
  }, [location.pathname, user?.role]);

  const assistantTitle = t("ai.launcherTitle", {
    defaultValue: "Waynest AI concierge",
  });
  const assistantPrompt = t("ai.launcherPrompt", {
    defaultValue:
      "Use the popup to navigate the app, find places, and shape trip plans with clear, direct answers.",
  });

  const runAction = useCallback(
    async (action) => {
      if (!action) return;
      setIsOpen(false);
      if (action.type === "plan") {
        const rawPrompt =
          action.formData?.naturalLanguagePrompt || draft.trim();
        let parsedTrip = null;

        try {
          if (isPuterChatAvailable() && rawPrompt) {
            const parsed = await extractTripFromText(rawPrompt);
            parsedTrip = normalizeTripParseResult(parsed, rawPrompt);
          }
        } catch {}

        const fallbackTrip = buildTripRequestFromMessage(rawPrompt) || {};
        const formData = {
          cityId: action.formData?.cityId || "",
          destination:
            action.formData?.destination ||
            parsedTrip?.naturalLanguageCity ||
            fallbackTrip.destination ||
            "",
          country: action.formData?.country || "",
          countryId: action.formData?.countryId || "",
          days: action.formData?.days || parsedTrip?.days || fallbackTrip.days,
          budget:
            action.formData?.budget ||
            parsedTrip?.budget ||
            fallbackTrip.budget,
          persons:
            action.formData?.persons ||
            parsedTrip?.persons ||
            fallbackTrip.persons,
          startDate: action.formData?.startDate || "",
          currencyCode:
            action.formData?.currencyCode || parsedTrip?.currencyCode || "ILS",
          interests: action.formData?.interests || parsedTrip?.interests || [],
          naturalLanguagePrompt: rawPrompt,
          naturalLanguageCity:
            action.formData?.naturalLanguageCity ||
            parsedTrip?.naturalLanguageCity ||
            "",
          naturalLanguageCountry:
            action.formData?.naturalLanguageCountry ||
            parsedTrip?.naturalLanguageCountry ||
            "",
        };
        storePendingTripGeneration(formData);
        navigate("/plan");
        return;
      }

      if (action.type === "profile") {
        navigate("/profile", {
          state: { aiEditMode: action.editMode || "details" },
        });
        return;
      }

      if (action.path) {
        navigate(
          action.path,
          action.state ? { state: action.state } : undefined,
        );
      }
    },
    [draft, navigate],
  );

  const bootstrapAssistant = useCallback(async () => {
    if (initializedRef.current) return;

    initializedRef.current = true;
    setIsBootstrapping(true);

    try {
      const greeting = isPuterChatAvailable()
        ? await generateWaynestAiDirectiveReply({
            conversationTitle: assistantTitle,
            conversationHistory: [],
            userMessage:
              "Greet the user, explain the popup assistant can open app pages and help with trip planning, then offer one practical next step.",
            locale: i18n.language,
            currentPath: location.pathname,
          })
        : null;

      setMessages([
        createMessage(
          "assistant",
          greeting?.reply || buildFallbackGreeting({ t }),
        ),
      ]);
      setSuggestions(greeting?.suggestions ?? []);
    } catch {
      setMessages([createMessage("assistant", buildFallbackGreeting({ t }))]);
      toast.error(
        t("ai.launchFailed", { defaultValue: "Could not start Waynest AI" }),
      );
    } finally {
      setIsBootstrapping(false);
    }
  }, [assistantTitle, i18n.language, location.pathname, t]);

  const openAssistant = useCallback(() => {
    setIsOpen(true);
    if (user?.role === "PROVIDER" && user?.id) {
      setActiveWorkspace(user.id, "personal");
    }
  }, [user?.id, user?.role]);

  const closeAssistant = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleQuickAction = useCallback(
    (path) => {
      void runAction({ path });
      setIsOpen(false);
    },
    [runAction],
  );

  const handleSuggestion = useCallback((suggestion) => {
    setDraft(suggestion);
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      const normalizedDraft = draft.trim();
      if (!normalizedDraft || isSending) return;

      const userMessage = createMessage("user", normalizedDraft);
      const history = [...messages, userMessage];

      setMessages(history);
      setDraft("");
      setSuggestions([]);
      setIsSending(true);

      const localAction = resolveLocalAction(normalizedDraft);
      if (localAction) {
        const action =
          localAction.type === "plan"
            ? {
                type: "plan",
                formData: buildTripRequestFromMessage(normalizedDraft),
              }
            : localAction.type === "profile"
              ? {
                  type: "profile",
                  editMode: localAction.editMode,
                }
              : localAction;

        setMessages([
          ...history,
          createMessage("assistant", localAction.reply, {
            action,
          }),
        ]);
        void runAction(action);
        setIsSending(false);
        return;
      }

      try {
        const response = isPuterChatAvailable()
          ? await generateWaynestAiDirectiveReply({
              conversationTitle: assistantTitle,
              conversationHistory: toPromptHistory(history),
              userMessage: normalizedDraft,
              locale: i18n.language,
              currentPath: location.pathname,
            })
          : null;

        const assistantMessage = createMessage(
          "assistant",
          response?.reply || buildFallbackReply({ t }),
          {
            action: response?.action ?? null,
          },
        );

        setMessages([...history, assistantMessage]);
        setSuggestions(response?.suggestions ?? []);

        if (response?.action?.type === "navigate") {
          setIsOpen(false);
          void runAction(response.action);
        } else if (response?.action?.type === "profile") {
          setIsOpen(false);
          void runAction(response.action);
        } else if (response?.action?.type === "plan") {
          const action = {
            type: "plan",
            formData:
              response.action.formData ||
              buildTripRequestFromMessage(normalizedDraft),
          };
          setIsOpen(false);
          void runAction(action);
        }
      } catch {
        setMessages([
          ...history,
          createMessage("assistant", buildFallbackReply({ t })),
        ]);
        toast.error(
          t("ai.sendFailed", {
            defaultValue: "Could not process that request",
          }),
        );
      } finally {
        setIsSending(false);
      }
    },
    [
      assistantTitle,
      draft,
      i18n.language,
      isSending,
      location.pathname,
      messages,
      runAction,
      t,
    ],
  );

  useEffect(() => {
    if (!isOpen) return;
    if (!initializedRef.current) {
      void bootstrapAssistant();
    }
  }, [bootstrapAssistant, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeAssistant();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeAssistant, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    bodyRef.current?.scrollTo({
      top: bodyRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [isOpen, messages]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  if (!showLauncher) return null;

  return isOpen ? (
    <div className="global-ai-shell">
      <div className="global-ai-overlay" role="presentation">
        <button
          type="button"
          className="global-ai-overlay__backdrop"
          aria-label={t("ai.closeOverlay", { defaultValue: "Close assistant" })}
          onClick={closeAssistant}
        />
        <section
          id="global-ai-panel"
          className="global-ai-panel"
          role="dialog"
          aria-modal="true"
          aria-label={assistantTitle}>
          <header className="global-ai-panel__header">
            <div className="global-ai-panel__heading">
              <span className="global-ai-panel__eyebrow">
                {t("ai.launcherEyebrow", { defaultValue: "Waynest AI" })}
              </span>
              <h2>{assistantTitle}</h2>
              <p>{assistantPrompt}</p>
            </div>
            <div className="global-ai-panel__controls">
              <span
                className={`global-ai-panel__status${isPuterChatAvailable() ? " global-ai-panel__status--online" : " global-ai-panel__status--fallback"}`}>
                {isPuterChatAvailable()
                  ? t("ai.statusOnline", { defaultValue: "AI online" })
                  : t("ai.statusFallback", { defaultValue: "Local fallback" })}
              </span>
              <button
                type="button"
                className="global-ai-panel__close"
                onClick={closeAssistant}
                aria-label={t("ai.closeAssistant", {
                  defaultValue: "Close assistant",
                })}>
                <FiX />
              </button>
            </div>
          </header>

          <div className="global-ai-panel__chips">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.path}
                  type="button"
                  className="global-ai-panel__chip"
                  onClick={() => handleQuickAction(action.path)}>
                  <Icon aria-hidden />
                  <span>
                    <strong>{action.label}</strong>
                    <small>{action.description}</small>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="global-ai-panel__body" ref={bodyRef}>
            {isBootstrapping && messages.length === 0 ? (
              <div className="global-ai-panel__empty">
                <FiLoader className="global-ai-launcher__spin" />
                <p>
                  {t("ai.opening", { defaultValue: "Opening assistant..." })}
                </p>
              </div>
            ) : null}

            {messages.map((message) => (
              <article
                key={message.id}
                className={`global-ai-panel__message global-ai-panel__message--${message.role}`}>
                <div className="global-ai-panel__bubble">
                  <span className="global-ai-panel__role">
                    {message.role === "assistant"
                      ? t("ai.assistantRole", { defaultValue: "Waynest AI" })
                      : t("ai.userRole", { defaultValue: "You" })}
                  </span>
                  <p>{message.content}</p>
                  {message.action?.path ? (
                    <button
                      type="button"
                      className="global-ai-panel__message-action"
                      onClick={() => handleQuickAction(message.action.path)}>
                      {message.action.label || message.action.path}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}

            {suggestions.length > 0 ? (
              <div className="global-ai-panel__suggestions">
                <span className="global-ai-panel__suggestions-label">
                  {t("ai.suggestions", {
                    defaultValue: "Try one of these next",
                  })}
                </span>
                <div className="global-ai-panel__suggestions-row">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="global-ai-panel__suggestion"
                      onClick={() => handleSuggestion(suggestion)}>
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <footer className="global-ai-panel__footer">
            <form className="global-ai-panel__composer" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="global-ai-draft">
                {t("ai.messageLabel", { defaultValue: "Message Waynest AI" })}
              </label>
              <textarea
                id="global-ai-draft"
                ref={inputRef}
                className="global-ai-panel__input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t("ai.messagePlaceholder", {
                  defaultValue: "Ask for a page, place, or plan...",
                })}
                rows={2}
                disabled={isSending || isBootstrapping}
              />
              <button
                type="submit"
                className="global-ai-panel__send"
                disabled={isSending || isBootstrapping || !draft.trim()}>
                {isSending ? (
                  <FiLoader className="global-ai-launcher__spin" />
                ) : (
                  <FiSend />
                )}
                <span>{t("ai.send", { defaultValue: "Send" })}</span>
              </button>
            </form>
          </footer>
        </section>
      </div>
    </div>
  ) : (
    <button
      type="button"
      className="global-ai-launcher"
      onClick={openAssistant}
      aria-expanded={isOpen}
      aria-controls="global-ai-panel"
      aria-label={t("ai.launcherLabel", {
        defaultValue: "Open Waynest AI concierge",
      })}>
      <span className="global-ai-launcher__icon" aria-hidden>
        <FiCpu />
      </span>
    </button>
  );
};

export default GlobalAiConciergeLauncher;
