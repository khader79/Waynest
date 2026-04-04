import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import {
  FiEdit3,
  FiChevronLeft,
  FiChevronRight,
  FiMessageCircle,
  FiMoreHorizontal,
  FiPlus,
  FiSearch,
  FiSend,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/api/client";
import { getApiErrorMessage } from "@/utils/errors";
import { friendPrimaryName, peerSecondaryLine } from "@/utils/socialDisplay";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import {
  addConversationMembers,
  createConversation,
  fetchConversationMessages,
  fetchFriends,
  fetchInbox,
  markConversationRead,
  sendMessage,
  updateConversation,
} from "@/api/social";
import "./MessengerHub.css";

const asMessengerTab = (value) =>
value === "unread" || value === "groups" ? value : "all";

const toLower = (value) => value.trim().toLowerCase();

const getInitials = (value) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";

const avatarTones = [
  "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 82%, var(--panel-surface-strong) 18%), color-mix(in srgb, var(--color-secondary) 78%, var(--panel-surface-soft) 22%))",
  "linear-gradient(135deg, color-mix(in srgb, var(--color-secondary) 82%, var(--panel-surface-strong) 18%), color-mix(in srgb, var(--color-accent) 78%, var(--panel-surface-soft) 22%))",
  "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 80%, var(--panel-surface-strong) 20%), color-mix(in srgb, var(--color-primary) 78%, var(--panel-surface-soft) 22%))",
  "linear-gradient(135deg, color-mix(in srgb, var(--panel-accent) 76%, var(--panel-surface-strong) 24%), color-mix(in srgb, var(--panel-accent-2) 74%, var(--panel-surface-soft) 26%))",
];

const hashValue = (value) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getAvatarToneStyle = (seed) => ({
  "--messenger-avatar-gradient": avatarTones[hashValue(String(seed ?? "")) % avatarTones.length],
});

const getConversationPeer = (conversation, currentUserId) =>
  conversation.members.find((member) => member.userId !== currentUserId) ?? null;

const getConversationAvatar = (conversation, currentUserId) => {
  if (conversation.isGroup) {
    return {
      kind: "group",
      label: String(conversation.members?.length ?? 0),
    };
  }

  const peer = getConversationPeer(conversation, currentUserId);
  const displayName = friendPrimaryName(peer, "Traveler");
  return {
    kind: "user",
    label: displayName,
    initials: getInitials(displayName),
    avatarUrl:
      typeof peer?.avatarUrl === "string" && peer.avatarUrl.trim()
        ? resolveMediaUrl(peer.avatarUrl)
        : null,
  };
};

const sortConversations = (rows) =>
[...rows].sort(
  (left, right) =>
  new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime()
);

const upsertMessage = (rows, nextMessage) => {
  const next = rows.filter((message) => message.id !== nextMessage.id);
  next.push(nextMessage);
  next.sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
  return next;
};

const toRecord = (value) =>
value && typeof value === "object" ? value : {};

const normalizeSocketMessage = (value) => {
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
    sender: sender.id ?
    {
      id: String(sender.id),
      username: typeof sender.username === "string" ? sender.username : undefined,
      firstName: typeof sender.firstName === "string" ? sender.firstName : undefined,
      lastName: typeof sender.lastName === "string" ? sender.lastName : undefined,
      avatarUrl: typeof sender.avatarUrl === "string" ? sender.avatarUrl : undefined
    } :
    undefined
  };
};

const getConversationPeerMembers = (
conversation,
currentUserId) =>
conversation.members.filter((member) => member.userId !== currentUserId);

const getConversationTitle = (
conversation,
currentUserId,
fallback) =>
{
  if (conversation.isGroup) {
    return conversation.title?.trim() || fallback;
  }

  const peer = getConversationPeerMembers(conversation, currentUserId)[0];
  return friendPrimaryName(peer, fallback);

};

const getConversationSubtitle = (
conversation,
currentUserId,
fallback) =>
{
  if (conversation.isGroup) {
    return `${conversation.members.length} ${fallback}`;
  }

  const peer = getConversationPeerMembers(conversation, currentUserId)[0];
  if (!peer?.username) {
    return "";
  }

  const fullName = `${peer.firstName ?? ""} ${peer.lastName ?? ""}`.trim();
  // Title uses fullName || username — avoid repeating the same label as @username
  if (!fullName) {
    return "";
  }
  if (fullName.toLowerCase() === peer.username.toLowerCase()) {
    return "";
  }

  return `@${peer.username}`;
};

const MessengerHub = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [threadError, setThreadError] = useState("");
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [renamingGroup, setRenamingGroup] = useState(false);
  const [conversationSearch, setConversationSearch] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [groupTitleDraft, setGroupTitleDraft] = useState("");
  const [mobilePane, setMobilePane] = useState("conversations");
  const [typingUserIds, setTypingUserIds] = useState([]);
  const [messageStatusMap, setMessageStatusMap] = useState({});
  const [groupComposerOpen, setGroupComposerOpen] = useState(false);
  const [groupComposerSearch, setGroupComposerSearch] = useState("");
  const [groupComposerTitle, setGroupComposerTitle] = useState("");
  const [groupComposerMessage, setGroupComposerMessage] = useState("");
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState([]);
  const [creatingGroupConversation, setCreatingGroupConversation] = useState(false);
  const [groupAddSearch, setGroupAddSearch] = useState("");
  const [groupAddSelectedIds, setGroupAddSelectedIds] = useState([]);
  const [addingGroupMembers, setAddingGroupMembers] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const [showGroupPanel, setShowGroupPanel] = useState(false);

  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const selectedConversationIdRef = useRef("");
  const messagesByConversationRef = useRef({});
  const composeFlowBusyRef = useRef(false);
  const messageTextareaRef = useRef(null);
  const groupComposerMessageRef = useRef(null);
  const messagesEndRef = useRef(null);

  const currentUserId = user?.id ?? user?.userId ?? "";
  const currentUserAvatarUrl =
    typeof user?.avatarUrl === "string" && user.avatarUrl.trim()
      ? resolveMediaUrl(user.avatarUrl)
      : null;
  const activeTab = asMessengerTab(searchParams.get("tab"));
  const selectedConversationId = searchParams.get("conversation") ?? "";
  const composeUserId = searchParams.get("compose") ?? "";
  const selectedConversation =
  conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
  const activeMessages = selectedConversationId ?
  messagesByConversation[selectedConversationId] ?? [] :
  [];

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    messagesByConversationRef.current = messagesByConversation;
  }, [messagesByConversation]);

  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) next.delete(key);else
      next.set(key, value);
    });
    setSearchParams(next, { replace: true });
  };

  const resizeTextarea = (element) => {
    if (!element) {
      return;
    }
    element.style.height = "auto";
    const nextHeight = Math.min(element.scrollHeight, 240);
    element.style.height = `${nextHeight}px`;
  };

  const findDirectConversation = (friendId) =>
  conversations.find(
    (conversation) =>
    !conversation.isGroup &&
    conversation.members.some((member) => member.userId === currentUserId) &&
    conversation.members.some((member) => member.userId === friendId)
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
          t("social.inbox.loadFailed", { defaultValue: "Failed to load inbox" })
        )
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
            defaultValue: "Could not load your friends list."
          })
        )
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
          [selectedConversationId]: Array.isArray(payload) ? payload : []
        }));
        await markConversationRead(selectedConversationId);
        setConversations((current) =>
        current.map((conversation) =>
        conversation.id === selectedConversationId ?
        { ...conversation, unreadCount: 0 } :
        conversation
        )
        );
      } catch (error) {
        if (active) {
          setThreadError(
            getApiErrorMessage(
              error,
              t("social.conversation.loadFailed", {
                defaultValue: "Failed to load conversation"
              })
            )
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
    if (!currentUserId || !API_BASE_URL) {
      return;
    }

    const socket = io(`${API_BASE_URL}/chat`, {
      withCredentials: true,
      transports: ["websocket", "polling"]
    });
    socketRef.current = socket;

    socket.on("message:new", (payload) => {
      const message = normalizeSocketMessage(payload?.message);
      if (!message) {
        return;
      }

      setMessagesByConversation((current) => ({
        ...current,
        [message.conversationId]: upsertMessage(current[message.conversationId] ?? [], message)
      }));

      setMessageStatusMap((current) => ({
        ...current,
        [message.id]: current[message.id] ?? { status: "sent", at: message.createdAt }
      }));

      setConversations((current) => {
        const target = current.find((conversation) => conversation.id === message.conversationId);
        if (!target) {
          void loadConversations();
          return current;
        }

        const nextConversation = {
          ...target,
          lastMessage: message.content,
          lastMessageAt: message.createdAt,
          lastMessageSenderId: message.senderId,
          unreadCount:
          message.senderId !== currentUserId &&
          message.conversationId !== selectedConversationIdRef.current ?
          target.unreadCount + 1 :
          0
        };

        return sortConversations(
          current.map((conversation) =>
          conversation.id === message.conversationId ? nextConversation : conversation
          )
        );
      });

      if (
      message.senderId !== currentUserId &&
      message.conversationId === selectedConversationIdRef.current)
      {
        socket.emit("ack:delivered", {
          conversationId: message.conversationId,
          messageId: message.id
        });
        void markConversationRead(message.conversationId);
      }
    });

    socket.on(
      "typing",
      (payload) => {
        if (
        payload.conversationId !== selectedConversationIdRef.current ||
        !payload.userId ||
        payload.userId === currentUserId)
        {
          return;
        }

        const typingUserId = payload.userId;
        setTypingUserIds((current) =>
        payload.isTyping ?
        current.includes(typingUserId) ? current : [...current, typingUserId] :
        current.filter((id) => id !== typingUserId)
        );
      }
    );

    socket.on(
      "conversation:read",
      (payload) => {
        if (
        !payload.userId ||
        payload.userId === currentUserId ||
        !selectedConversationIdRef.current)
        {
          return;
        }

        setMessageStatusMap((current) => {
          const next = { ...current };
          (messagesByConversationRef.current[selectedConversationIdRef.current] ?? []).forEach((message) => {
            if (
            message.senderId === currentUserId &&
            new Date(message.createdAt).getTime() <= new Date(payload.readAt ?? 0).getTime())
            {
              next[message.id] = {
                status: "read",
                at: payload.readAt ?? new Date().toISOString()
              };
            }
          });
          return next;
        });
      }
    );

    socket.on(
      "message:status",
      (payload) => {
        if (!payload.messageId || !payload.status) {
          return;
        }
        const messageId = payload.messageId;
        const status = payload.status;
        setMessageStatusMap((current) => ({
          ...current,
          [messageId]: {
            status,
            at: payload.at ?? new Date().toISOString()
          }
        }));
      }
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
        t("social.messages.conversationFallback", { defaultValue: "Conversation" })
      );
      const subtitle = getConversationSubtitle(
        conversation,
        currentUserId,
        t("social.messages.members", { defaultValue: "members" })
      );

      return `${title} ${subtitle} ${conversation.lastMessage ?? ""}`.
      toLowerCase().
      includes(query);
    });
  }, [activeTab, conversationSearch, conversations, currentUserId, t]);

  const activeTypingNames = useMemo(() => {
    if (!selectedConversation) {
      return [];
    }

    return selectedConversation.members.
    filter((member) => typingUserIds.includes(member.userId)).
    map((member) => friendPrimaryName(member, t("social.feed.traveler", { defaultValue: "Traveler" })));
  }, [selectedConversation, typingUserIds]);

  const activeConversationAvatar = selectedConversation
    ? getConversationAvatar(selectedConversation, currentUserId)
    : null;
  const selectedConversationPeer =
    selectedConversation && !selectedConversation.isGroup
      ? getConversationPeer(selectedConversation, currentUserId)
      : null;
  const selectedConversationPeerHref = selectedConversationPeer?.username
    ? `/u/${encodeURIComponent(selectedConversationPeer.username)}`
    : null;

  const selectedGroupMembers = useMemo(
    () =>
      friends.filter((friend) => selectedGroupMemberIds.includes(friend.userId)),
    [friends, selectedGroupMemberIds],
  );

  const selectedConversationMemberIds = useMemo(
    () => selectedConversation?.members.map((member) => member.userId) ?? [],
    [selectedConversation],
  );

  const availableGroupMembers = useMemo(() => {
    const query = toLower(groupAddSearch);
    const memberIds = new Set(selectedConversationMemberIds);
    return friends.filter((friend) => {
      if (friend.userId === currentUserId) {
        return false;
      }
      if (memberIds.has(friend.userId)) {
        return false;
      }
      if (!query) {
        return true;
      }
      const title = friendPrimaryName(friend, "").toLowerCase();
      const handle = (friend.username ?? "").toLowerCase();
      return title.includes(query) || handle.includes(query);
    });
  }, [currentUserId, friends, groupAddSearch, selectedConversationMemberIds]);

  const selectedGroupAddMembers = useMemo(
    () => friends.filter((friend) => groupAddSelectedIds.includes(friend.userId)),
    [friends, groupAddSelectedIds],
  );

  const isGroupDrawerOpen = Boolean(selectedConversation?.isGroup && showGroupPanel);

  const filteredGroupFriends = useMemo(() => {
    const query = toLower(groupComposerSearch);
    return friends.filter((friend) => {
      if (friend.userId === currentUserId) {
        return false;
      }
      if (!query) {
        return true;
      }
      const title = friendPrimaryName(friend, "").toLowerCase();
      const handle = (friend.username ?? "").toLowerCase();
      return title.includes(query) || handle.includes(query);
    });
  }, [friends, groupComposerSearch, currentUserId]);

  const toggleGroupMember = (friendId) => {
    setSelectedGroupMemberIds((current) =>
      current.includes(friendId) ? current.filter((id) => id !== friendId) : [...current, friendId],
    );
  };

  const openGroupComposer = () => {
    setGroupComposerOpen(true);
  };

  const closeGroupComposer = () => {
    setGroupComposerOpen(false);
    setGroupComposerSearch("");
    setGroupComposerTitle("");
    setGroupComposerMessage("");
    setSelectedGroupMemberIds([]);
  };

  const toggleGroupAddMember = (friendId) => {
    setGroupAddSelectedIds((current) =>
      current.includes(friendId) ? current.filter((id) => id !== friendId) : [...current, friendId],
    );
  };

  const resetGroupAddMembers = () => {
    setGroupAddSearch("");
    setGroupAddSelectedIds([]);
  };

  const handleCreateGroupConversation = async () => {
    const participantIds = [...new Set(selectedGroupMemberIds)];
    const title = groupComposerTitle.trim();
    const firstMessage = groupComposerMessage.trim();
    if (participantIds.length < 2) {
      toast.info(
        t("social.messages.groupSelectPeople", {
          defaultValue: "Select at least two people to create a group.",
        }),
      );
      return;
    }
    if (!title) {
      toast.info(
        t("social.messages.groupNeedTitle", {
          defaultValue: "Please give the group a title.",
        }),
      );
      return;
    }
    if (!firstMessage) {
      toast.info(
        t("social.messages.groupNeedMessage", {
          defaultValue: "Write the first message to start the group.",
        }),
      );
      return;
    }

    try {
      setCreatingGroupConversation(true);
      const response = await createConversation({
        participantIds,
        firstMessage,
        title,
      });
      await loadConversations();
      closeGroupComposer();
      updateParams({ conversation: response.conversation.id, compose: null });
      setMobilePane("thread");
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.inbox.createFailed", { defaultValue: "Failed to create conversation" }),
        ),
      );
    } finally {
      setCreatingGroupConversation(false);
    }
  };

  const openConversation = (conversationId) => {
    updateParams({ conversation: conversationId, compose: null });
  };

  useEffect(() => {
    if (!composeUserId) {
      return;
    }

    if (loadingFriends) {
      return;
    }

    if (friends.length === 0) {
      updateParams({ compose: null });
      return;
    }

    const existingConversation = findDirectConversation(composeUserId);
    if (existingConversation) {
      updateParams({ conversation: existingConversation.id, compose: null });
      setMobilePane("thread");
      return;
    }

    if (!friends.some((friend) => friend.userId === composeUserId)) {
      toast.info(
        t("social.compose.mustBeFriends", {
          defaultValue: "You can only message people in your friends list.",
        }),
      );
      updateParams({ compose: null });
      return;
    }

    if (composeFlowBusyRef.current) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        composeFlowBusyRef.current = true;
        setCreatingConversation(true);
        const firstMessage = t("social.compose.autoFirstMessage", { defaultValue: "Hi" });
        const response = await createConversation({
          participantIds: [composeUserId],
          firstMessage,
        });
        if (cancelled) {
          return;
        }
        setMessagesByConversation((current) => ({
          ...current,
          [response.conversation.id]: upsertMessage(
            current[response.conversation.id] ?? [],
            response.firstMessage,
          ),
        }));
        setMessageStatusMap((current) => ({
          ...current,
          [response.firstMessage.id]: { status: "sent", at: response.firstMessage.createdAt },
        }));
        await loadConversations();
        updateParams({ conversation: response.conversation.id, compose: null });
        setMobilePane("thread");
      } catch (error) {
        if (!cancelled) {
          toast.error(
            getApiErrorMessage(
              error,
              t("social.inbox.createFailed", { defaultValue: "Failed to create conversation" }),
            ),
          );
          updateParams({ compose: null });
        }
      } finally {
        if (!cancelled) {
          setCreatingConversation(false);
          composeFlowBusyRef.current = false;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [composeUserId, friends, loadingFriends, conversations, currentUserId, t]);

  useEffect(() => {
    if (!selectedConversationId) {
      setShowConversationList(true);
    }
  }, [selectedConversationId]);

  const touchConversation = (
  conversationId,
  lastMessage,
  lastMessageAt,
  lastMessageSenderId) =>
  {
    setConversations((current) =>
    sortConversations(
      current.map((conversation) =>
      conversation.id === conversationId ?
      {
        ...conversation,
        lastMessage,
        lastMessageAt,
        lastMessageSenderId,
        unreadCount: 0
      } :
      conversation
      )
    )
    );
  };

  const emitTyping = (nextValue) => {
    setMessageDraft(nextValue);

    if (!socketRef.current || !selectedConversationId) {
      return;
    }

    socketRef.current.emit("typing", {
      conversationId: selectedConversationId,
      isTyping: Boolean(nextValue.trim())
    });

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      socketRef.current?.emit("typing", {
        conversationId: selectedConversationId,
        isTyping: false
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
      isTyping: false
    });

    try {
      const message = await sendMessage(selectedConversationId, content);
      setMessagesByConversation((current) => ({
        ...current,
        [selectedConversationId]: upsertMessage(current[selectedConversationId] ?? [], message)
      }));
      setMessageStatusMap((current) => ({
        ...current,
        [message.id]: { status: "sent", at: message.createdAt }
      }));
      touchConversation(
        selectedConversationId,
        message.content,
        message.createdAt,
        message.senderId
      );
    } catch (error) {
      setMessageDraft(content);
      toast.error(
        getApiErrorMessage(
          error,
          t("social.conversation.sendFailed", { defaultValue: "Failed to send message" })
        )
      );
    } finally {
      setSending(false);
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
      conversation.id === selectedConversation.id ?
      { ...conversation, title: groupTitleDraft.trim() } :
      conversation
      )
      );
      toast.success(
        t("social.messages.groupUpdated", {
          defaultValue: "Group details updated"
        })
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.messages.groupUpdateFailed", {
            defaultValue: "Failed to update the group"
          })
        )
      );
    } finally {
      setRenamingGroup(false);
    }
  };

  const handleAddGroupMembers = async () => {
    if (!selectedConversation?.isGroup || groupAddSelectedIds.length === 0) {
      return;
    }

    try {
      setAddingGroupMembers(true);
      const memberIdsToAdd = [...new Set(groupAddSelectedIds)];
      await addConversationMembers(selectedConversation.id, {
        userIds: memberIdsToAdd,
      });
      const newMembers = friends.filter((friend) => memberIdsToAdd.includes(friend.userId));
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversation.id
            ? {
                ...conversation,
                members: [
                  ...conversation.members,
                  ...newMembers.filter(
                    (friend) =>
                      !conversation.members.some((member) => member.userId === friend.userId),
                  ),
                ],
                updatedAt: new Date().toISOString(),
              }
            : conversation,
        ),
      );
      resetGroupAddMembers();
      toast.success(
        t("social.messages.membersAdded", {
          defaultValue: "Members added to the group",
        }),
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.messages.membersAddFailed", {
            defaultValue: "Failed to add members",
          }),
        ),
      );
    } finally {
      setAddingGroupMembers(false);
    }
  };

  useEffect(() => {
    if (!selectedConversation?.isGroup && mobilePane === "group") {
      setMobilePane("thread");
    }
  }, [selectedConversation?.isGroup, mobilePane]);

  useEffect(() => {
    resizeTextarea(messageTextareaRef.current);
  }, [messageDraft, selectedConversationId]);

  useEffect(() => {
    resizeTextarea(groupComposerMessageRef.current);
  }, [groupComposerMessage]);

  useEffect(() => {
    if (!messagesEndRef.current) {
      return;
    }
    messagesEndRef.current.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [activeMessages.length, loadingThread, selectedConversationId]);

  useEffect(() => {
    resetGroupAddMembers();
  }, [selectedConversationId]);

  const getStatusLabel = (message) => {
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

  const layoutTemplateColumns = showConversationList
    ? "minmax(290px, 332px) minmax(0, 1fr)"
    : "minmax(0, 1fr)";

  return (
    <section className="messenger-hub">
      <div
        className={`messenger-hub__mobileSwitch${selectedConversation?.isGroup ? " messenger-hub__mobileSwitch--three" : ""}`}>
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
        {selectedConversation?.isGroup ? (
          <button
            type="button"
            className={mobilePane === "group" ? "isActive" : ""}
            onClick={() => {
              setMobilePane("group");
              setShowGroupPanel(true);
            }}>
            {t("social.messages.groupShort", { defaultValue: "Group" })}
          </button>
        ) : null}
      </div>

      <div
        className={`messenger-hub__layout${selectedConversation?.isGroup ? " messenger-hub__layout--three" : " messenger-hub__layout--two"} ${isGroupDrawerOpen ? "messenger-hub__layout--drawerOpen" : ""}`}
        style={{ gridTemplateColumns: layoutTemplateColumns }}>
        <aside
          className={`messenger-pane messenger-pane--list ${mobilePane !== "conversations" || !showConversationList ? "isMobileHidden" : ""}`}>
          <div className="messenger-pane__header">
            <div>
              <p className="messenger-pane__eyebrow">
                {t("social.messages.eyebrow", { defaultValue: "Messenger hub" })}
              </p>
              <h1>{t("social.messages.title", { defaultValue: "Messages" })}</h1>
            </div>
            <div className="messenger-pane__headerActions">
              <button
                type="button"
                className="messenger-pane__iconButton messenger-pane__iconButton--accent"
                onClick={openGroupComposer}>
                <FiPlus />
                <span>{t("social.messages.newGroup", { defaultValue: "New group" })}</span>
              </button>
              <button
                type="button"
                className="messenger-pane__iconButton messenger-pane__iconButton--ghost"
                onClick={() => setShowConversationList(false)}
                aria-label={t("social.messages.hideChatList", { defaultValue: "Hide chat list" })}
                title={t("social.messages.hideChatList", { defaultValue: "Hide chat list" })}>
                <FiChevronLeft />
              </button>
            </div>
          </div>

          <label className="messenger-pane__search">
            <FiSearch />
            <input
              type="search"
              value={conversationSearch}
              onChange={(event) => setConversationSearch(event.target.value)}
              placeholder={t("social.messages.searchChats", { defaultValue: "Search conversations" })} />
            
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
            {creatingConversation && composeUserId ?
            <p className="messenger-empty">{t("social.compose.starting", { defaultValue: "Starting chat…" })}</p> :
            null}
            {loadingConversations ?
            <p className="messenger-empty">{t("common.loading", { defaultValue: "Loading…" })}</p> :
            filteredConversations.length === 0 ?
            <p className="messenger-empty">{t("social.inbox.empty", { defaultValue: "No conversations yet." })}</p> :

            <div className="messenger-conversationList">
                {filteredConversations.map((conversation) => {
                  const conversationAvatar = getConversationAvatar(conversation, currentUserId);
                  const title = getConversationTitle(
                    conversation,
                    currentUserId,
                    t("social.messages.conversationFallback", { defaultValue: "Conversation" }),
                  );
                  const sub = getConversationSubtitle(
                    conversation,
                    currentUserId,
                    t("social.messages.members", { defaultValue: "members" }),
                  );
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                  className={conversation.id === selectedConversationId ? "messenger-conversationCard isActive" : "messenger-conversationCard"}
                      onClick={() => openConversation(conversation.id)}>
                      <div className="messenger-conversationCard__top">
                        <div
                          className="messenger-conversationCard__avatar"
                          style={getAvatarToneStyle(conversation.id)}>
                          {conversationAvatar.kind === "group" ? (
                            <FiUsers />
                          ) : conversationAvatar.avatarUrl ? (
                            <img src={conversationAvatar.avatarUrl} alt={title} />
                          ) : (
                            <span>{conversationAvatar.initials}</span>
                          )}
                        </div>
                        <div className="messenger-conversationCard__metaWrap">
                          <strong>{title}</strong>
                          {sub ? <span className="messenger-conversationCard__meta">{sub}</span> : null}
                        </div>
                        {conversation.unreadCount > 0 ? <span className="messenger-badge">{conversation.unreadCount}</span> : null}
                      </div>
                      <p className="messenger-conversationCard__last" title={conversation.lastMessage ?? undefined}>
                        {conversation.lastMessage || t("social.messages.noMessages", { defaultValue: "No messages yet." })}
                      </p>
                      <small>{new Date(conversation.lastMessageAt).toLocaleString()}</small>
                    </button>
                  );
                })}
              </div>
            }
          </div>
        </aside>

        <section className={`messenger-pane messenger-pane--thread ${mobilePane !== "thread" ? "isMobileHidden" : ""}`}>
          <div className="messenger-thread__header">
            {selectedConversation ?
            <>
                {selectedConversationPeerHref ? (
                  <Link
                    to={selectedConversationPeerHref}
                    className="messenger-thread__identity messenger-thread__identityLink">
                    <div
                      className="messenger-thread__avatar"
                      style={getAvatarToneStyle(selectedConversation.id)}>
                      {activeConversationAvatar?.kind === "group" ? (
                        <FiUsers />
                      ) : activeConversationAvatar?.avatarUrl ? (
                        <img
                          src={activeConversationAvatar.avatarUrl}
                          alt={activeConversationAvatar.label}
                        />
                      ) : (
                        <span>{activeConversationAvatar?.initials ?? "M"}</span>
                      )}
                    </div>
                    <div>
                      <p className="messenger-pane__eyebrow">
                        {selectedConversation.isGroup
                          ? t("social.messages.groupChat", { defaultValue: "Group chat" })
                          : t("social.messages.directChat", { defaultValue: "Direct chat" })}
                      </p>
                      <h2>
                        {getConversationTitle(
                          selectedConversation,
                          currentUserId,
                          t("social.messages.conversationFallback", {
                            defaultValue: "Conversation",
                          }),
                        )}
                      </h2>
                      {(() => {
                        const sub = getConversationSubtitle(
                          selectedConversation,
                          currentUserId,
                          t("social.messages.members", { defaultValue: "members" }),
                        );
                        return sub ? <span>{sub}</span> : null;
                      })()}
                    </div>
                  </Link>
                ) : (
                  <div className="messenger-thread__identity">
                    <div
                      className="messenger-thread__avatar"
                      style={getAvatarToneStyle(selectedConversation.id)}>
                      {activeConversationAvatar?.kind === "group" ? (
                        <FiUsers />
                      ) : activeConversationAvatar?.avatarUrl ? (
                        <img
                          src={activeConversationAvatar.avatarUrl}
                          alt={activeConversationAvatar.label}
                        />
                      ) : (
                        <span>{activeConversationAvatar?.initials ?? "M"}</span>
                      )}
                    </div>
                    <div>
                      <p className="messenger-pane__eyebrow">
                        {selectedConversation.isGroup
                          ? t("social.messages.groupChat", { defaultValue: "Group chat" })
                          : t("social.messages.directChat", { defaultValue: "Direct chat" })}
                      </p>
                      <h2>
                        {getConversationTitle(
                          selectedConversation,
                          currentUserId,
                          t("social.messages.conversationFallback", {
                            defaultValue: "Conversation",
                          }),
                        )}
                      </h2>
                      {(() => {
                        const sub = getConversationSubtitle(
                          selectedConversation,
                          currentUserId,
                          t("social.messages.members", { defaultValue: "members" }),
                        );
                        return sub ? <span>{sub}</span> : null;
                      })()}
                    </div>
                  </div>
                )}
                <div className="messenger-thread__actions">
                  <button
                    type="button"
                    className="messenger-pane__iconButton messenger-pane__iconButton--ghost"
                    onClick={() => setShowConversationList((current) => !current)}
                    aria-label={
                      showConversationList
                        ? t("social.messages.hideChatList", { defaultValue: "Hide chat list" })
                        : t("social.messages.showChatList", { defaultValue: "Show chat list" })
                    }
                    title={
                      showConversationList
                        ? t("social.messages.hideChatList", { defaultValue: "Hide chat list" })
                        : t("social.messages.showChatList", { defaultValue: "Show chat list" })
                    }>
                    {showConversationList ? <FiChevronLeft /> : <FiChevronRight />}
                  </button>
                  {selectedConversation.isGroup ? (
                    <button
                      type="button"
                      className="messenger-pane__iconButton messenger-pane__iconButton--ghost"
                      onClick={() => setShowGroupPanel((current) => !current)}
                      aria-label={
                        showGroupPanel
                          ? t("social.messages.hideGroupDetails", { defaultValue: "Hide group details" })
                          : t("social.messages.showGroupDetails", { defaultValue: "Show group details" })
                      }
                      title={
                        showGroupPanel
                          ? t("social.messages.hideGroupDetails", { defaultValue: "Hide group details" })
                          : t("social.messages.showGroupDetails", { defaultValue: "Show group details" })
                      }>
                      <FiUsers />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="messenger-pane__iconButton messenger-pane__iconButton--ghost"
                    onClick={() => {
                      if (selectedConversation?.isGroup) {
                        setShowGroupPanel((current) => !current);
                        setMobilePane("group");
                      } else if (selectedConversationPeerHref) {
                        window.location.href = selectedConversationPeerHref;
                      }
                    }}
                    aria-label={t("common.more", { defaultValue: "More" })}
                    title={t("common.more", { defaultValue: "More" })}>
                    <FiMoreHorizontal />
                  </button>
                </div>
              </> :

            <div>
                <p className="messenger-pane__eyebrow">{t("social.messages.eyebrow", { defaultValue: "Messenger hub" })}</p>
                <h2>{t("social.messages.pickChat", { defaultValue: "Pick a conversation" })}</h2>
                <span>
                  {t("social.messages.pickChatHelper", {
                  defaultValue: "Choose a chat from the list, or open a friend from the sidebar to message them.",
                })}
                </span>
              </div>
            }
          </div>

          <div className="messenger-thread__body">
            <div className="messenger-thread__wallpaper" aria-hidden="true" />
            <div className="messenger-thread__notice">
              <span>🔒</span>
              <p>
                {t("social.messages.privateNotice", {
                  defaultValue: "Messages are private to the conversation and stay inside Waynest.",
                })}
              </p>
            </div>
            {!selectedConversation ?
            <div className="messenger-empty messenger-empty--large">
                <FiMessageCircle />
                <strong>{t("social.messages.pickChat", { defaultValue: "Pick a conversation" })}</strong>
                <span>
                  {t("social.messages.pickChatHelper", {
                  defaultValue: "Choose a chat from the list, or open a friend from the sidebar to message them.",
                })}
                </span>
              </div> :
            loadingThread ?
            <p className="messenger-empty">{t("social.conversation.loading", { defaultValue: "Loading messages..." })}</p> :
            threadError ?
            <p className="messenger-empty">{threadError}</p> :
            activeMessages.length === 0 ?
            <div className="messenger-empty messenger-empty--large">
                <strong>{t("social.conversation.empty", { defaultValue: "No messages yet." })}</strong>
                <span>{t("social.messages.emptyThreadHelper", { defaultValue: "Send the first message to start planning together." })}</span>
              </div> :

            <div className="messenger-messageList">
                {activeMessages.map((message, index) => {
                  const isOwn = message.senderId === currentUserId;
                  const prev = activeMessages[index - 1];
                  const isChainStart = !prev || prev.senderId !== message.senderId;
                  const authorName = friendPrimaryName(
                    message.sender,
                    t("social.feed.traveler", { defaultValue: "Traveler" }),
                  );
                  const avatarUrl =
                    typeof message.sender?.avatarUrl === "string" &&
                    message.sender.avatarUrl.trim()
                      ? resolveMediaUrl(message.sender.avatarUrl)
                      : null;
                  const initials = getInitials(authorName);

                  return (
                    <article
                      key={message.id}
                      className={isOwn ? "messenger-messageRow messenger-messageRow--own" : "messenger-messageRow"}>
                      {!isOwn ? (
                        <div
                          className="messenger-messageAvatar"
                          style={getAvatarToneStyle(message.senderId)}>
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={authorName} />
                          ) : (
                            <span>{initials}</span>
                          )}
                        </div>
                      ) : null}
                      <div
                        className={
                          isOwn
                            ? "messenger-messageBubble isOwn"
                            : `messenger-messageBubble${isChainStart ? " messenger-messageBubble--chainStart" : " messenger-messageBubble--chainContinue"}`
                        }>
                        {!isOwn && isChainStart ? <strong>{authorName}</strong> : null}
                        <p>{message.content}</p>
                        <div className="messenger-messageBubble__meta">
                          <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
                          {isOwn ? <small>{getStatusLabel(message)}</small> : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
                <div ref={messagesEndRef} aria-hidden="true" />
              </div>
            }
          </div>

          <div className="messenger-thread__composer">
            {activeTypingNames.length > 0 ?
            <div className="messenger-thread__typingBubble">
                <div className="messenger-thread__typingDots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <p className="messenger-thread__typing">
                  {t("social.messages.typing", {
                    defaultValue: "{{names}} typing…",
                    names: activeTypingNames.join(", "),
                  })}
                </p>
              </div> :
            null}
            <div className="messenger-thread__composerRow">
              <textarea
                ref={messageTextareaRef}
                value={messageDraft}
                onChange={(event) => {
                  emitTyping(event.target.value);
                  resizeTextarea(event.currentTarget);
                }}
                onInput={(event) => resizeTextarea(event.currentTarget)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSendMessage();
                  }
                }}
                placeholder={t("social.conversation.placeholder", { defaultValue: "Write a message..." })}
                disabled={!selectedConversation} />
              
              <button type="button" onClick={() => void handleSendMessage()} disabled={sending || !selectedConversation || !messageDraft.trim()}>
                <FiSend />
                <span>{sending ? t("social.conversation.sending", { defaultValue: "Sending..." }) : t("social.conversation.send", { defaultValue: "Send" })}</span>
              </button>
            </div>
          </div>
        </section>

        {selectedConversation?.isGroup ? (
          <aside
            className={`messenger-pane messenger-pane--compose ${isGroupDrawerOpen ? "isDrawerOpen" : "isDrawerClosed"} ${!showGroupPanel ? "isMobileHidden" : ""}`}>
            <div className="messenger-pane__header">
              <div>
                <p className="messenger-pane__eyebrow">
                  {t("social.messages.groupDetails", { defaultValue: "Group details" })}
                </p>
                <h2>{t("social.messages.manageGroup", { defaultValue: "Manage group" })}</h2>
              </div>
              <div className="messenger-pane__headerActions">
                <button
                  type="button"
                  className="messenger-pane__iconButton messenger-pane__iconButton--ghost"
                  onClick={() => {
                    setShowGroupPanel(false);
                    if (mobilePane === "group") {
                      setMobilePane("thread");
                    }
                  }}
                  aria-expanded={isGroupDrawerOpen}
                  aria-label={t("social.messages.hideGroupDetails", { defaultValue: "Hide group details" })}
                  title={t("social.messages.hideGroupDetails", { defaultValue: "Hide group details" })}>
                  <FiChevronRight />
                </button>
                <FiEdit3 aria-hidden />
              </div>
            </div>
            <div className="messenger-pane__body messenger-composePanel">
              <label className="messenger-composePanel__field">
                <span>{t("social.messages.groupTitle", { defaultValue: "Group title" })}</span>
                <input
                  type="text"
                  value={groupTitleDraft}
                  onChange={(event) => setGroupTitleDraft(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="messenger-pane__primaryButton"
                disabled={renamingGroup || !groupTitleDraft.trim()}
                onClick={() => void renameGroup()}>
                {renamingGroup ?
                  t("common.loading", { defaultValue: "Loading…" }) :
                  t("social.messages.saveGroup", { defaultValue: "Save title" })}
              </button>
                <div className="messenger-memberList">
                  {selectedConversation.members.map((member) => {
                    const memberHref = member.username
                      ? `/u/${encodeURIComponent(member.username)}`
                      : null;
                    const label = friendPrimaryName(
                      member,
                      t("social.feed.traveler", { defaultValue: "Traveler" }),
                    );
                    const content = (
                      <>
                        <strong>{label}</strong>
                        {(() => {
                          const sub = peerSecondaryLine(member);
                          return sub ? <span>{sub}</span> : null;
                        })()}
                      </>
                    );
                    return memberHref ? (
                      <Link
                        key={member.userId}
                        to={memberHref}
                        className="messenger-memberCard messenger-memberCard--link">
                        {content}
                      </Link>
                    ) : (
                      <div key={member.userId} className="messenger-memberCard">
                        {content}
                      </div>
                    );
                  })}
                </div>
                <div className="messenger-groupAdd">
                  <div className="messenger-groupAdd__header">
                    <div>
                      <strong>
                        {t("social.messages.addMembers", { defaultValue: "Add people" })}
                      </strong>
                      <span>
                        {t("social.messages.addMembersHelper", {
                          defaultValue: "Pick friends to bring into this group.",
                        })}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="messenger-pane__primaryButton messenger-pane__primaryButton--compact"
                      disabled={addingGroupMembers || groupAddSelectedIds.length === 0}
                      onClick={() => void handleAddGroupMembers()}>
                      {addingGroupMembers
                        ? t("common.loading", { defaultValue: "Loading…" })
                        : t("social.messages.addToGroup", { defaultValue: "Add" })}
                    </button>
                  </div>

                  <label className="messenger-pane__search messenger-pane__search--compact">
                    <FiSearch />
                    <input
                      type="search"
                      value={groupAddSearch}
                      onChange={(event) => setGroupAddSearch(event.target.value)}
                      placeholder={t("social.messages.searchFriends", {
                        defaultValue: "Search friends",
                      })}
                    />
                  </label>

                  {selectedGroupAddMembers.length > 0 ? (
                    <div className="messenger-selectionChips messenger-selectionChips--compact">
                      {selectedGroupAddMembers.map((member) => (
                        <button
                          key={member.userId}
                          type="button"
                          className="messenger-selectionChip"
                          onClick={() => toggleGroupAddMember(member.userId)}>
                          <span>{friendPrimaryName(member, "Traveler")}</span>
                          <FiX />
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="messenger-memberList messenger-memberList--selectable">
                    {availableGroupMembers.map((friend) => {
                      const selected = groupAddSelectedIds.includes(friend.userId);
                      const avatarUrl =
                        typeof friend.avatarUrl === "string" && friend.avatarUrl.trim()
                          ? resolveMediaUrl(friend.avatarUrl)
                          : null;
                      const label = friendPrimaryName(friend, t("social.feed.traveler", { defaultValue: "Traveler" }));
                      return (
                        <button
                          key={friend.userId}
                          type="button"
                          className={selected ? "messenger-memberCard isSelected" : "messenger-memberCard"}
                          onClick={() => toggleGroupAddMember(friend.userId)}>
                          <div
                            className="messenger-memberCard__avatar"
                            style={getAvatarToneStyle(friend.userId)}>
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={label} />
                            ) : (
                              <span>{getInitials(label)}</span>
                            )}
                          </div>
                          <div className="messenger-memberCard__content">
                            <strong>{label}</strong>
                            {(() => {
                              const sub = peerSecondaryLine(friend);
                              return sub ? <span>{sub}</span> : null;
                            })()}
                          </div>
                          <span className="messenger-memberCard__check">
                            {selected ? "Selected" : "Add"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </aside>
          ) : null}
      </div>

      {groupComposerOpen ? (
        <div
          className="messenger-modalBackdrop"
          role="presentation"
          onClick={closeGroupComposer}>
          <div
            className="messenger-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t("social.messages.newGroup", { defaultValue: "New group" })}
            onClick={(event) => event.stopPropagation()}>
            <div className="messenger-modal__header">
              <div>
                <p className="messenger-pane__eyebrow">
                  {t("social.messages.newGroup", { defaultValue: "New group" })}
                </p>
                <h2>{t("social.messages.createGroup", { defaultValue: "Create a group" })}</h2>
                <span>
                  {t("social.messages.createGroupHelper", {
                    defaultValue: "Pick friends, name the group, and send the first message in one go.",
                  })}
                </span>
              </div>
              <button
                type="button"
                className="messenger-modal__close"
                onClick={closeGroupComposer}
                aria-label={t("common.close", { defaultValue: "Close" })}>
                <FiX />
              </button>
            </div>

            <div className="messenger-modal__body">
              <div className="messenger-modal__main">
                <label className="messenger-composePanel__field">
                  <span>{t("social.messages.groupTitle", { defaultValue: "Group title" })}</span>
                  <input
                    type="text"
                    value={groupComposerTitle}
                    onChange={(event) => setGroupComposerTitle(event.target.value)}
                    placeholder={t("social.messages.groupTitlePlaceholder", {
                      defaultValue: "e.g. Weekend trip crew",
                    })}
                  />
                </label>

                <label className="messenger-composePanel__field">
                  <span>{t("social.messages.firstMessage", { defaultValue: "First message" })}</span>
                  <textarea
                    ref={groupComposerMessageRef}
                    value={groupComposerMessage}
                    onChange={(event) => {
                      setGroupComposerMessage(event.target.value);
                      resizeTextarea(event.currentTarget);
                    }}
                    onInput={(event) => resizeTextarea(event.currentTarget)}
                    placeholder={t("social.messages.firstMessagePlaceholder", {
                      defaultValue: "Write the opening message...",
                    })}
                  />
                </label>

                <div className="messenger-selectionSummary">
                  <strong>
                    {t("social.messages.selectedPeople", {
                      defaultValue: "{{count}} selected",
                      count: selectedGroupMembers.length,
                    })}
                  </strong>
                  <span>
                    {selectedGroupMembers.length >= 2
                      ? t("social.messages.groupReady", {
                          defaultValue: "You can start the group now.",
                        })
                      : t("social.messages.groupNeedPeople", {
                          defaultValue: "Select at least two people.",
                        })}
                  </span>
                </div>

                <div className="messenger-selectionChips">
                  {selectedGroupMembers.map((member) => (
                    <button
                      key={member.userId}
                      type="button"
                      className="messenger-selectionChip"
                      onClick={() => toggleGroupMember(member.userId)}>
                      <span>{friendPrimaryName(member, "Traveler")}</span>
                      <FiX />
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="messenger-pane__primaryButton messenger-pane__primaryButton--wide"
                  disabled={creatingGroupConversation}
                  onClick={() => void handleCreateGroupConversation()}>
                  {creatingGroupConversation ? (
                    t("common.loading", { defaultValue: "Loading…" })
                  ) : (
                    t("social.messages.createGroup", { defaultValue: "Create group" })
                  )}
                </button>
              </div>

              <div className="messenger-modal__sidebar">
                <label className="messenger-pane__search messenger-pane__search--compact">
                  <FiSearch />
                  <input
                    type="search"
                    value={groupComposerSearch}
                    onChange={(event) => setGroupComposerSearch(event.target.value)}
                    placeholder={t("social.messages.searchFriends", {
                      defaultValue: "Search friends",
                    })}
                  />
                </label>

                <div className="messenger-memberList messenger-memberList--selectable">
                  {filteredGroupFriends.map((friend) => {
                    const selected = selectedGroupMemberIds.includes(friend.userId);
                    const avatarUrl =
                      typeof friend.avatarUrl === "string" && friend.avatarUrl.trim()
                        ? resolveMediaUrl(friend.avatarUrl)
                        : null;
                    const label = friendPrimaryName(friend, t("social.feed.traveler", { defaultValue: "Traveler" }));
                    return (
                      <button
                        key={friend.userId}
                        type="button"
                        className={selected ? "messenger-memberCard isSelected" : "messenger-memberCard"}
                        onClick={() => toggleGroupMember(friend.userId)}>
                        <div
                          className="messenger-memberCard__avatar"
                          style={getAvatarToneStyle(friend.userId)}>
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={label} />
                          ) : (
                            <span>{getInitials(label)}</span>
                          )}
                        </div>
                        <div className="messenger-memberCard__content">
                          <strong>{label}</strong>
                          {(() => {
                            const sub = peerSecondaryLine(friend);
                            return sub ? <span>{sub}</span> : null;
                          })()}
                        </div>
                        <span className="messenger-memberCard__check">
                          {selected ? "Selected" : "Add"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : null}
    </section>);

};

export default MessengerHub;
