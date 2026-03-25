import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { io, type Socket } from "socket.io-client";
import { toast } from "react-toastify";
import { FiEdit3, FiMessageCircle, FiPlus, FiSearch, FiSend, FiUsers } from "react-icons/fi";
import { useAuth } from "@/core/providers/AuthContext";
import { getApiErrorMessage } from "@/core/utils/errors";
import {
  createConversation,
  fetchConversationMessages,
  fetchFriends,
  fetchInbox,
  markConversationRead,
  sendMessage,
  updateConversation,
  type ConversationMessage,
  type ConversationSummary,
  type FriendSummary,
} from "@/services/social/social.service";
import "./MessengerHub.css";

type MessengerTab = "all" | "unread" | "groups";
type MobilePane = "conversations" | "thread" | "compose";
type MessageStatus = { status: "sent" | "delivered" | "read"; at: string };

const apiBaseUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");

const asMessengerTab = (value: string | null): MessengerTab =>
  value === "unread" || value === "groups" ? value : "all";

const toLower = (value: string) => value.trim().toLowerCase();

const sortConversations = (rows: ConversationSummary[]) =>
  [...rows].sort(
    (left, right) =>
      new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime(),
  );

const upsertMessage = (rows: ConversationMessage[], nextMessage: ConversationMessage) => {
  const next = rows.filter((message) => message.id !== nextMessage.id);
  next.push(nextMessage);
  next.sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
  return next;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const normalizeSocketMessage = (value: unknown): ConversationMessage | null => {
  const record = toRecord(value);
  if (!record.id || !record.conversationId) {
    return null;
  }

  const sender = toRecord(record.sender);
  return {
    id: String(record.id),
    conversationId: String(record.conversationId),
    content: typeof record.content === "string" ? record.content : "",
    senderId: typeof record.senderId === "string" ? record.senderId : "",
    createdAt:
      typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
    sender: sender.id
      ? {
          id: String(sender.id),
          username: typeof sender.username === "string" ? sender.username : undefined,
          firstName: typeof sender.firstName === "string" ? sender.firstName : undefined,
          lastName: typeof sender.lastName === "string" ? sender.lastName : undefined,
          avatarUrl: typeof sender.avatarUrl === "string" ? sender.avatarUrl : undefined,
        }
      : undefined,
  };
};

const getFriendDisplayName = (friend: FriendSummary) =>
  `${friend.firstName} ${friend.lastName}`.trim() || friend.username || "Traveler";

const getConversationPeerMembers = (
  conversation: ConversationSummary,
  currentUserId: string,
) => conversation.members.filter((member) => member.userId !== currentUserId);

const getConversationTitle = (
  conversation: ConversationSummary,
  currentUserId: string,
  fallback: string,
) => {
  if (conversation.isGroup) {
    return conversation.title?.trim() || fallback;
  }

  const peer = getConversationPeerMembers(conversation, currentUserId)[0];
  return (
    `${peer?.firstName ?? ""} ${peer?.lastName ?? ""}`.trim() ||
    peer?.username ||
    fallback
  );
};

const getConversationSubtitle = (
  conversation: ConversationSummary,
  currentUserId: string,
  fallback: string,
) => {
  if (conversation.isGroup) {
    return `${conversation.members.length} ${fallback}`;
  }

  const peer = getConversationPeerMembers(conversation, currentUserId)[0];
  return peer?.username ? `@${peer.username}` : fallback;
};

const MessengerHub = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, ConversationMessage[]>>({});
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [threadError, setThreadError] = useState("");
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [renamingGroup, setRenamingGroup] = useState(false);
  const [conversationSearch, setConversationSearch] = useState("");
  const [friendSearch, setFriendSearch] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [composeSelection, setComposeSelection] = useState<string[]>([]);
  const [composeTitle, setComposeTitle] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [groupTitleDraft, setGroupTitleDraft] = useState("");
  const [mobilePane, setMobilePane] = useState<MobilePane>("conversations");
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [messageStatusMap, setMessageStatusMap] = useState<Record<string, MessageStatus>>({});

  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const selectedConversationIdRef = useRef("");
  const messagesByConversationRef = useRef<Record<string, ConversationMessage[]>>({});

  const currentUserId = user?.userId ?? "";
  const activeTab = asMessengerTab(searchParams.get("tab"));
  const selectedConversationId = searchParams.get("conversation") ?? "";
  const composeUserId = searchParams.get("compose") ?? "";
  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
  const activeMessages = selectedConversationId
    ? messagesByConversation[selectedConversationId] ?? []
    : [];

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    messagesByConversationRef.current = messagesByConversation;
  }, [messagesByConversation]);

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) next.delete(key);
      else next.set(key, value);
    });
    setSearchParams(next, { replace: true });
  };

  const findDirectConversation = (friendId: string) =>
    conversations.find(
      (conversation) =>
        !conversation.isGroup &&
        conversation.members.some((member) => member.userId === currentUserId) &&
        conversation.members.some((member) => member.userId === friendId),
    );

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const payload = await fetchInbox();
      setConversations(sortConversations(Array.isArray(payload) ? payload : []));
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.inbox.loadFailed", { defaultValue: "Failed to load inbox" }),
        ),
      );
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadFriends = async () => {
    try {
      setLoadingFriends(true);
      const payload = await fetchFriends();
      setFriends(Array.isArray(payload) ? payload : []);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("sidebar.friendsLoadFailed", {
            defaultValue: "Could not load your friends list.",
          }),
        ),
      );
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  };

  useEffect(() => {
    void Promise.all([loadConversations(), loadFriends()]);
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      setThreadError("");
      return;
    }

    let active = true;
    void (async () => {
      try {
        setLoadingThread(true);
        setThreadError("");
        const payload = await fetchConversationMessages(selectedConversationId);
        if (!active) {
          return;
        }
        setMessagesByConversation((current) => ({
          ...current,
          [selectedConversationId]: Array.isArray(payload) ? payload : [],
        }));
        await markConversationRead(selectedConversationId);
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === selectedConversationId
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
        );
      } catch (error) {
        if (active) {
          setThreadError(
            getApiErrorMessage(
              error,
              t("social.conversation.loadFailed", {
                defaultValue: "Failed to load conversation",
              }),
            ),
          );
        }
      } finally {
        if (active) {
          setLoadingThread(false);
        }
      }
    })();

    setMobilePane("thread");

    return () => {
      active = false;
    };
  }, [selectedConversationId, t]);

  useEffect(() => {
    setGroupTitleDraft(selectedConversation?.title ?? "");
  }, [selectedConversation]);

  useEffect(() => {
    if (!composeUserId || friends.length === 0) {
      return;
    }

    const existingConversation = findDirectConversation(composeUserId);
    if (existingConversation) {
      updateParams({ conversation: existingConversation.id, compose: null });
      return;
    }

    if (friends.some((friend) => friend.userId === composeUserId)) {
      setComposeSelection([composeUserId]);
      setMobilePane("compose");
    }
  }, [composeUserId, conversations, friends]);

  useEffect(() => {
    if (!currentUserId || !apiBaseUrl) {
      return;
    }

    const socket = io(`${apiBaseUrl}/chat`, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("message:new", (payload: { message?: unknown }) => {
      const message = normalizeSocketMessage(payload?.message);
      if (!message) {
        return;
      }

      setMessagesByConversation((current) => ({
        ...current,
        [message.conversationId]: upsertMessage(current[message.conversationId] ?? [], message),
      }));

      setMessageStatusMap((current) => ({
        ...current,
        [message.id]: current[message.id] ?? { status: "sent", at: message.createdAt },
      }));

      setConversations((current) => {
        const target = current.find((conversation) => conversation.id === message.conversationId);
        if (!target) {
          void loadConversations();
          return current;
        }

        const nextConversation: ConversationSummary = {
          ...target,
          lastMessage: message.content,
          lastMessageAt: message.createdAt,
          lastMessageSenderId: message.senderId,
          unreadCount:
            message.senderId !== currentUserId &&
            message.conversationId !== selectedConversationIdRef.current
              ? target.unreadCount + 1
              : 0,
        };

        return sortConversations(
          current.map((conversation) =>
            conversation.id === message.conversationId ? nextConversation : conversation,
          ),
        );
      });

      if (
        message.senderId !== currentUserId &&
        message.conversationId === selectedConversationIdRef.current
      ) {
        socket.emit("ack:delivered", {
          conversationId: message.conversationId,
          messageId: message.id,
        });
        void markConversationRead(message.conversationId);
      }
    });

    socket.on(
      "typing",
      (payload: { conversationId?: string; userId?: string; isTyping?: boolean }) => {
        if (
          payload.conversationId !== selectedConversationIdRef.current ||
          !payload.userId ||
          payload.userId === currentUserId
        ) {
          return;
        }

        const typingUserId = payload.userId;
        setTypingUserIds((current) =>
          payload.isTyping
            ? current.includes(typingUserId) ? current : [...current, typingUserId]
            : current.filter((id) => id !== typingUserId),
        );
      },
    );

    socket.on(
      "conversation:read",
      (payload: { userId?: string; readAt?: string }) => {
        if (
          !payload.userId ||
          payload.userId === currentUserId ||
          !selectedConversationIdRef.current
        ) {
          return;
        }

        setMessageStatusMap((current) => {
          const next = { ...current };
          (messagesByConversationRef.current[selectedConversationIdRef.current] ?? []).forEach((message) => {
            if (
              message.senderId === currentUserId &&
              new Date(message.createdAt).getTime() <= new Date(payload.readAt ?? 0).getTime()
            ) {
              next[message.id] = {
                status: "read",
                at: payload.readAt ?? new Date().toISOString(),
              };
            }
          });
          return next;
        });
      },
    );

    socket.on(
      "message:status",
      (payload: { messageId?: string; status?: "delivered" | "read"; at?: string }) => {
        if (!payload.messageId || !payload.status) {
          return;
        }
        const messageId = payload.messageId;
        const status: MessageStatus["status"] = payload.status;
        setMessageStatusMap((current) => ({
          ...current,
          [messageId]: {
            status,
            at: payload.at ?? new Date().toISOString(),
          },
        }));
      },
    );

    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId, t]);

  useEffect(() => {
    if (!socketRef.current || !selectedConversationId) {
      return;
    }

    socketRef.current.emit("join", { conversationId: selectedConversationId });

    return () => {
      socketRef.current?.emit("leave", { conversationId: selectedConversationId });
      setTypingUserIds([]);
    };
  }, [selectedConversationId]);

  const filteredConversations = useMemo(() => {
    const query = toLower(conversationSearch);

    return conversations.filter((conversation) => {
      if (activeTab === "unread" && conversation.unreadCount === 0) {
        return false;
      }
      if (activeTab === "groups" && !conversation.isGroup) {
        return false;
      }
      if (!query) {
        return true;
      }

      const title = getConversationTitle(
        conversation,
        currentUserId,
        t("social.messages.conversationFallback", { defaultValue: "Conversation" }),
      );
      const subtitle = getConversationSubtitle(
        conversation,
        currentUserId,
        t("social.messages.members", { defaultValue: "members" }),
      );

      return `${title} ${subtitle} ${conversation.lastMessage ?? ""}`
        .toLowerCase()
        .includes(query);
    });
  }, [activeTab, conversationSearch, conversations, currentUserId, t]);

  const filteredFriends = useMemo(() => {
    const query = toLower(friendSearch);
    if (!query) {
      return friends;
    }
    return friends.filter((friend) =>
      `${getFriendDisplayName(friend)} ${friend.username}`.toLowerCase().includes(query),
    );
  }, [friendSearch, friends]);

  const existingDirectConversation =
    composeSelection.length === 1 ? findDirectConversation(composeSelection[0]) : undefined;

  const activeTypingNames = useMemo(() => {
    if (!selectedConversation) {
      return [];
    }

    return selectedConversation.members
      .filter((member) => typingUserIds.includes(member.userId))
      .map((member) => `${member.firstName} ${member.lastName}`.trim() || member.username);
  }, [selectedConversation, typingUserIds]);

  const openConversation = (conversationId: string) => {
    updateParams({ conversation: conversationId, compose: null });
  };

  const touchConversation = (
    conversationId: string,
    lastMessage: string,
    lastMessageAt: string,
    lastMessageSenderId: string,
  ) => {
    setConversations((current) =>
      sortConversations(
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                lastMessage,
                lastMessageAt,
                lastMessageSenderId,
                unreadCount: 0,
              }
            : conversation,
        ),
      ),
    );
  };

  const toggleFriendSelection = (friendId: string) => {
    setComposeSelection((current) =>
      current.includes(friendId)
        ? current.filter((id) => id !== friendId)
        : [...current, friendId],
    );
  };

  const emitTyping = (nextValue: string) => {
    setMessageDraft(nextValue);

    if (!socketRef.current || !selectedConversationId) {
      return;
    }

    socketRef.current.emit("typing", {
      conversationId: selectedConversationId,
      isTyping: Boolean(nextValue.trim()),
    });

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      socketRef.current?.emit("typing", {
        conversationId: selectedConversationId,
        isTyping: false,
      });
    }, 1200);
  };

  const handleSendMessage = async () => {
    if (!selectedConversationId || !messageDraft.trim()) {
      return;
    }

    const content = messageDraft.trim();
    setMessageDraft("");
    setSending(true);

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    socketRef.current?.emit("typing", {
      conversationId: selectedConversationId,
      isTyping: false,
    });

    try {
      const message = await sendMessage(selectedConversationId, content);
      setMessagesByConversation((current) => ({
        ...current,
        [selectedConversationId]: upsertMessage(current[selectedConversationId] ?? [], message),
      }));
      setMessageStatusMap((current) => ({
        ...current,
        [message.id]: { status: "sent", at: message.createdAt },
      }));
      touchConversation(
        selectedConversationId,
        message.content,
        message.createdAt,
        message.senderId,
      );
    } catch (error) {
      setMessageDraft(content);
      toast.error(
        getApiErrorMessage(
          error,
          t("social.conversation.sendFailed", { defaultValue: "Failed to send message" }),
        ),
      );
    } finally {
      setSending(false);
    }
  };

  const startConversation = async () => {
    if (composeSelection.length === 0) {
      toast.info(
        t("social.inbox.selectFriendFirst", {
          defaultValue: "Choose one or more friends first.",
        }),
      );
      return;
    }

    if (!composeMessage.trim() && !existingDirectConversation) {
      toast.info(
        t("social.inbox.firstMessage", { defaultValue: "Write your first message." }),
      );
      return;
    }

    if (composeSelection.length > 1 && !composeTitle.trim()) {
      toast.info(
        t("social.inbox.groupTitleRequired", {
          defaultValue: "Give the group a title before creating it.",
        }),
      );
      return;
    }

    try {
      setCreatingConversation(true);

      if (composeSelection.length === 1 && existingDirectConversation) {
        openConversation(existingDirectConversation.id);

        if (composeMessage.trim()) {
          const message = await sendMessage(existingDirectConversation.id, composeMessage.trim());
          setMessagesByConversation((current) => ({
            ...current,
            [existingDirectConversation.id]: upsertMessage(
              current[existingDirectConversation.id] ?? [],
              message,
            ),
          }));
          setMessageStatusMap((current) => ({
            ...current,
            [message.id]: { status: "sent", at: message.createdAt },
          }));
          touchConversation(
            existingDirectConversation.id,
            message.content,
            message.createdAt,
            message.senderId,
          );
        }
      } else {
        const response = await createConversation({
          participantIds: composeSelection,
          title: composeSelection.length > 1 ? composeTitle.trim() : undefined,
          firstMessage: composeMessage.trim(),
        });

        setMessagesByConversation((current) => ({
          ...current,
          [response.conversation.id]: upsertMessage(
            current[response.conversation.id] ?? [],
            response.firstMessage,
          ),
        }));
        setMessageStatusMap((current) => ({
          ...current,
          [response.firstMessage.id]: {
            status: "sent",
            at: response.firstMessage.createdAt,
          },
        }));
        await loadConversations();
        openConversation(response.conversation.id);
      }

      setComposeSelection([]);
      setComposeTitle("");
      setComposeMessage("");
      setFriendSearch("");
      setMobilePane("thread");
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.inbox.createFailed", {
            defaultValue: "Failed to create conversation",
          }),
        ),
      );
    } finally {
      setCreatingConversation(false);
    }
  };

  const renameGroup = async () => {
    if (!selectedConversation?.isGroup || !groupTitleDraft.trim()) {
      return;
    }

    try {
      setRenamingGroup(true);
      await updateConversation(selectedConversation.id, { title: groupTitleDraft.trim() });
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversation.id
            ? { ...conversation, title: groupTitleDraft.trim() }
            : conversation,
        ),
      );
      toast.success(
        t("social.messages.groupUpdated", {
          defaultValue: "Group details updated",
        }),
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.messages.groupUpdateFailed", {
            defaultValue: "Failed to update the group",
          }),
        ),
      );
    } finally {
      setRenamingGroup(false);
    }
  };

  const getStatusLabel = (message: ConversationMessage) => {
    if (message.senderId !== currentUserId) {
      return "";
    }
    const status = messageStatusMap[message.id]?.status;
    if (status === "read") {
      return t("social.messages.read", { defaultValue: "Read" });
    }
    if (status === "delivered") {
      return t("social.messages.delivered", { defaultValue: "Delivered" });
    }
    return t("social.messages.sent", { defaultValue: "Sent" });
  };

  return (
    <section className="messenger-hub">
      <div className="messenger-hub__mobileSwitch">
        <button
          type="button"
          className={mobilePane === "conversations" ? "isActive" : ""}
          onClick={() => setMobilePane("conversations")}>
          {t("social.messages.title", { defaultValue: "Messages" })}
        </button>
        <button
          type="button"
          className={mobilePane === "thread" ? "isActive" : ""}
          onClick={() => setMobilePane("thread")}
          disabled={!selectedConversationId}>
          {t("social.conversation.title", { defaultValue: "Thread" })}
        </button>
        <button
          type="button"
          className={mobilePane === "compose" ? "isActive" : ""}
          onClick={() => setMobilePane("compose")}>
          {t("social.inbox.startConversation", { defaultValue: "New chat" })}
        </button>
      </div>

      <div className="messenger-hub__layout">
        <aside className={`messenger-pane messenger-pane--list ${mobilePane !== "conversations" ? "isMobileHidden" : ""}`}>
          <div className="messenger-pane__header">
            <div>
              <p className="messenger-pane__eyebrow">
                {t("social.messages.eyebrow", { defaultValue: "Messenger hub" })}
              </p>
              <h1>{t("social.messages.title", { defaultValue: "Messages" })}</h1>
            </div>
            <button type="button" className="messenger-pane__iconButton" onClick={() => setMobilePane("compose")}>
              <FiPlus />
            </button>
          </div>

          <label className="messenger-pane__search">
            <FiSearch />
            <input
              type="search"
              value={conversationSearch}
              onChange={(event) => setConversationSearch(event.target.value)}
              placeholder={t("social.messages.searchChats", { defaultValue: "Search conversations" })}
            />
          </label>

          <div className="messenger-tabs">
            <button type="button" className={activeTab === "all" ? "isActive" : ""} onClick={() => updateParams({ tab: "all" })}>
              {t("social.messages.tabs.all", { defaultValue: "All" })}
            </button>
            <button type="button" className={activeTab === "unread" ? "isActive" : ""} onClick={() => updateParams({ tab: "unread" })}>
              {t("social.messages.tabs.unread", { defaultValue: "Unread" })}
            </button>
            <button type="button" className={activeTab === "groups" ? "isActive" : ""} onClick={() => updateParams({ tab: "groups" })}>
              {t("social.messages.tabs.groups", { defaultValue: "Groups" })}
            </button>
          </div>

          <div className="messenger-pane__body">
            {loadingConversations ? (
              <p className="messenger-empty">{t("common.loading", { defaultValue: "Loading…" })}</p>
            ) : filteredConversations.length === 0 ? (
              <p className="messenger-empty">{t("social.inbox.empty", { defaultValue: "No conversations yet." })}</p>
            ) : (
              <div className="messenger-conversationList">
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className={conversation.id === selectedConversationId ? "messenger-conversationCard isActive" : "messenger-conversationCard"}
                    onClick={() => openConversation(conversation.id)}>
                    <div className="messenger-conversationCard__top">
                      <strong>
                        {getConversationTitle(conversation, currentUserId, t("social.messages.conversationFallback", { defaultValue: "Conversation" }))}
                      </strong>
                      {conversation.unreadCount > 0 ? <span className="messenger-badge">{conversation.unreadCount}</span> : null}
                    </div>
                    <span className="messenger-conversationCard__meta">
                      {getConversationSubtitle(conversation, currentUserId, t("social.messages.members", { defaultValue: "members" }))}
                    </span>
                    <p>{conversation.lastMessage || t("social.messages.noMessages", { defaultValue: "No messages yet." })}</p>
                    <small>{new Date(conversation.lastMessageAt).toLocaleString()}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className={`messenger-pane messenger-pane--thread ${mobilePane !== "thread" ? "isMobileHidden" : ""}`}>
          <div className="messenger-thread__header">
            {selectedConversation ? (
              <>
                <div>
                  <p className="messenger-pane__eyebrow">
                    {selectedConversation.isGroup
                      ? t("social.messages.groupChat", { defaultValue: "Group chat" })
                      : t("social.messages.directChat", { defaultValue: "Direct chat" })}
                  </p>
                  <h2>{getConversationTitle(selectedConversation, currentUserId, t("social.messages.conversationFallback", { defaultValue: "Conversation" }))}</h2>
                  <span>{getConversationSubtitle(selectedConversation, currentUserId, t("social.messages.members", { defaultValue: "members" }))}</span>
                </div>
                <button type="button" className="messenger-pane__iconButton" onClick={() => setMobilePane("compose")}>
                  <FiUsers />
                </button>
              </>
            ) : (
              <div>
                <p className="messenger-pane__eyebrow">{t("social.messages.eyebrow", { defaultValue: "Messenger hub" })}</p>
                <h2>{t("social.messages.pickChat", { defaultValue: "Pick a conversation" })}</h2>
                <span>
                  {t("social.messages.pickChatHelper", {
                    defaultValue: "Choose a chat from the left, or start a new one from the friends panel.",
                  })}
                </span>
              </div>
            )}
          </div>

          <div className="messenger-thread__body">
            {!selectedConversation ? (
              <div className="messenger-empty messenger-empty--large">
                <FiMessageCircle />
                <strong>{t("social.messages.pickChat", { defaultValue: "Pick a conversation" })}</strong>
                <span>
                  {t("social.messages.pickChatHelper", {
                    defaultValue: "Choose a chat from the left, or start a new one from the friends panel.",
                  })}
                </span>
              </div>
            ) : loadingThread ? (
              <p className="messenger-empty">{t("social.conversation.loading", { defaultValue: "Loading messages..." })}</p>
            ) : threadError ? (
              <p className="messenger-empty">{threadError}</p>
            ) : activeMessages.length === 0 ? (
              <div className="messenger-empty messenger-empty--large">
                <strong>{t("social.conversation.empty", { defaultValue: "No messages yet." })}</strong>
                <span>{t("social.messages.emptyThreadHelper", { defaultValue: "Send the first message to start planning together." })}</span>
              </div>
            ) : (
              <div className="messenger-messageList">
                {activeMessages.map((message) => {
                  const isOwn = message.senderId === currentUserId;
                  const authorName =
                    message.sender?.username ||
                    `${message.sender?.firstName ?? ""} ${message.sender?.lastName ?? ""}`.trim() ||
                    t("social.feed.traveler", { defaultValue: "Traveler" });

                  return (
                    <article key={message.id} className={isOwn ? "messenger-messageBubble isOwn" : "messenger-messageBubble"}>
                      {!isOwn ? <strong>{authorName}</strong> : null}
                      <p>{message.content}</p>
                      <div className="messenger-messageBubble__meta">
                        <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
                        {isOwn ? <small>{getStatusLabel(message)}</small> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="messenger-thread__composer">
            {activeTypingNames.length > 0 ? (
              <p className="messenger-thread__typing">
                {t("social.messages.typing", {
                  defaultValue: "{{names}} typing…",
                  names: activeTypingNames.join(", "),
                })}
              </p>
            ) : null}
            <div className="messenger-thread__composerRow">
              <textarea
                value={messageDraft}
                onChange={(event) => emitTyping(event.target.value)}
                placeholder={t("social.conversation.placeholder", { defaultValue: "Write a message..." })}
                disabled={!selectedConversation}
              />
              <button type="button" onClick={() => void handleSendMessage()} disabled={sending || !selectedConversation || !messageDraft.trim()}>
                <FiSend />
                <span>{sending ? t("social.conversation.sending", { defaultValue: "Sending..." }) : t("social.conversation.send", { defaultValue: "Send" })}</span>
              </button>
            </div>
          </div>
        </section>

        <aside className={`messenger-pane messenger-pane--compose ${mobilePane !== "compose" ? "isMobileHidden" : ""}`}>
          {selectedConversation?.isGroup ? (
            <>
              <div className="messenger-pane__header">
                <div>
                  <p className="messenger-pane__eyebrow">{t("social.messages.groupDetails", { defaultValue: "Group details" })}</p>
                  <h2>{t("social.messages.manageGroup", { defaultValue: "Manage group" })}</h2>
                </div>
                <FiEdit3 />
              </div>
              <div className="messenger-pane__body messenger-composePanel">
                <label className="messenger-composePanel__field">
                  <span>{t("social.messages.groupTitle", { defaultValue: "Group title" })}</span>
                  <input type="text" value={groupTitleDraft} onChange={(event) => setGroupTitleDraft(event.target.value)} />
                </label>
                <button type="button" className="messenger-pane__primaryButton" disabled={renamingGroup || !groupTitleDraft.trim()} onClick={() => void renameGroup()}>
                  {renamingGroup ? t("common.loading", { defaultValue: "Loading…" }) : t("social.messages.saveGroup", { defaultValue: "Save title" })}
                </button>
                <div className="messenger-memberList">
                  {selectedConversation.members.map((member) => (
                    <div key={member.userId} className="messenger-memberCard">
                      <strong>{`${member.firstName} ${member.lastName}`.trim() || member.username}</strong>
                      <span>{member.username ? `@${member.username}` : member.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="messenger-pane__header">
                <div>
                  <p className="messenger-pane__eyebrow">{t("social.inbox.startConversation", { defaultValue: "Start a conversation" })}</p>
                  <h2>{t("social.messages.newChat", { defaultValue: "New direct or group chat" })}</h2>
                </div>
                <FiUsers />
              </div>
              <div className="messenger-pane__body messenger-composePanel">
                <label className="messenger-pane__search">
                  <FiSearch />
                  <input
                    type="search"
                    value={friendSearch}
                    onChange={(event) => setFriendSearch(event.target.value)}
                    placeholder={t("social.messages.searchFriends", { defaultValue: "Search your friends" })}
                  />
                </label>

                <div className="messenger-friendList">
                  {loadingFriends ? (
                    <p className="messenger-empty">{t("common.loading", { defaultValue: "Loading…" })}</p>
                  ) : filteredFriends.length === 0 ? (
                    <p className="messenger-empty">
                      {t("sidebar.friendsEmpty", {
                        defaultValue: "Accepted traveler connections will appear here for faster messaging.",
                      })}
                    </p>
                  ) : (
                    filteredFriends.map((friend) => {
                      const isSelected = composeSelection.includes(friend.userId);
                      return (
                        <button key={friend.userId} type="button" className={isSelected ? "messenger-friendCard isSelected" : "messenger-friendCard"} onClick={() => toggleFriendSelection(friend.userId)}>
                          <div>
                            <strong>{getFriendDisplayName(friend)}</strong>
                            <span>{friend.username ? `@${friend.username}` : friend.role}</span>
                          </div>
                          {isSelected ? <span className="messenger-badge">✓</span> : null}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="messenger-selectionSummary">
                  <strong>
                    {composeSelection.length > 1
                      ? t("social.messages.groupReady", { defaultValue: "{{count}} friends selected for a group", count: composeSelection.length })
                      : composeSelection.length === 1
                        ? t("social.messages.directReady", { defaultValue: "1 friend selected for a direct chat" })
                        : t("social.messages.noFriendSelected", { defaultValue: "Select friends to start chatting" })}
                  </strong>
                  {existingDirectConversation ? <span>{t("social.messages.directExists", { defaultValue: "A direct conversation already exists for this friend." })}</span> : null}
                </div>

                {composeSelection.length > 1 ? (
                  <label className="messenger-composePanel__field">
                    <span>{t("social.messages.groupTitle", { defaultValue: "Group title" })}</span>
                    <input
                      type="text"
                      value={composeTitle}
                      onChange={(event) => setComposeTitle(event.target.value)}
                      placeholder={t("social.messages.groupTitlePlaceholder", { defaultValue: "Summer route squad" })}
                    />
                  </label>
                ) : null}

                <label className="messenger-composePanel__field">
                  <span>{t("social.inbox.firstMessage", { defaultValue: "Your first message" })}</span>
                  <textarea
                    value={composeMessage}
                    onChange={(event) => setComposeMessage(event.target.value)}
                    placeholder={t("social.messages.startPlanning", { defaultValue: "Kick off the chat with the first travel note..." })}
                  />
                </label>

                <button type="button" className="messenger-pane__primaryButton" disabled={creatingConversation || composeSelection.length === 0} onClick={() => void startConversation()}>
                  {creatingConversation
                    ? t("social.inbox.creating", { defaultValue: "Creating..." })
                    : existingDirectConversation && composeSelection.length === 1
                      ? t("social.messages.openOrSend", { defaultValue: "Open or send in chat" })
                      : composeSelection.length > 1
                        ? t("social.messages.createGroup", { defaultValue: "Create group chat" })
                        : t("social.inbox.createConversation", { defaultValue: "Start direct chat" })}
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
};

export default MessengerHub;
