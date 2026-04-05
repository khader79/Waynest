import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import {
  FiPlus,
  FiSearch,
  FiSend,
  FiUsers,
  FiX,
  FiCheck,
  FiMessageSquare,
  FiBookmark,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/api/client";
import {
  createConversation,
  fetchFriends,
  fetchInbox,
  fetchConversationMessages,
  sendMessage,
  markConversationRead,
} from "@/api/social";
import "./MessengerHub.css";

const getConvDisplayName = (conv, currentUserId) => {
  if (!conv) return "Chat";
  if (conv.isGroup) return conv.title || "Group";
  if (conv.members?.length) {
    const other = conv.members.find((m) => m.userId !== currentUserId);
    if (other) {
      const name = `${other.firstName || ""} ${other.lastName || ""}`.trim();
      if (name) return name;
      if (other.username) return other.username;
    }
    if (conv.members.length === 1) {
      const self = conv.members[0];
      const name = `${self.firstName || ""} ${self.lastName || ""}`.trim();
      return name || "Saved Messages";
    }
  }
  return conv.title || "Private Chat";
};

const getConvAvatarInfo = (conv, currentUserId) => {
  if (!conv) return { type: "initial", value: "?" };
  if (conv.isGroup) return { type: "icon" };
  if (conv.members?.length) {
    const other = conv.members.find((m) => m.userId !== currentUserId);
    const target = other ?? conv.members[0];
    if (target?.avatarUrl) return { type: "img", src: target.avatarUrl };
    const name = getConvDisplayName(conv, currentUserId);
    return { type: "initial", value: (name[0] || "?").toUpperCase() };
  }
  const name = getConvDisplayName(conv, currentUserId);
  return { type: "initial", value: (name[0] || "?").toUpperCase() };
};

const MessengerHub = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUserId = user?.id ?? user?.userId;
  const isRTL = document.documentElement.dir === "rtl";

  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [friendSearch, setFriendSearch] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [typingUsers, setTypingUsers] = useState({});

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeouts = useRef({});
  const typingEmitTimeout = useRef(null);

  const selectedConversationId = searchParams.get("conversation");
  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId,
  );

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadInbox = useCallback(async () => {
    try {
      const data = await fetchInbox();
      setConversations(data);
    } catch {}
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    socketRef.current = io(API_BASE_URL, {
      query: { userId: currentUserId },
      transports: ["websocket"],
    });
    socketRef.current.on("message:new", (payload) => {
      if (payload.conversationId === selectedConversationId) {
        setMessages((prev) => [...prev, payload.message]);
      }
      loadInbox();
    });
    socketRef.current.on("typing", ({ conversationId, userId }) => {
      if (
        conversationId === selectedConversationId &&
        userId !== currentUserId
      ) {
        setTypingUsers((prev) => ({ ...prev, [userId]: true }));
        clearTimeout(typingTimeouts.current[userId]);
        typingTimeouts.current[userId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const n = { ...prev };
            delete n[userId];
            return n;
          });
        }, 3500);
      }
    });
    socketRef.current.on("stop_typing", ({ userId }) => {
      clearTimeout(typingTimeouts.current[userId]);
      setTypingUsers((prev) => {
        const n = { ...prev };
        delete n[userId];
        return n;
      });
    });
    return () => {
      socketRef.current?.disconnect();
      Object.values(typingTimeouts.current).forEach(clearTimeout);
    };
  }, [currentUserId, selectedConversationId, loadInbox]);

  useEffect(() => {
    loadInbox();
    fetchFriends()
      .then(setFriends)
      .catch(() => {});
  }, [loadInbox]);

  useEffect(() => {
    if (!selectedConversationId) return;
    setMessages([]);
    fetchConversationMessages(selectedConversationId)
      .then((msgs) => {
        setMessages(msgs);
        setTimeout(() => scrollToBottom(false), 60);
      })
      .catch(() => {});
    markConversationRead(selectedConversationId).catch(() => {});
    inputRef.current?.focus();
  }, [selectedConversationId, scrollToBottom]);

  const handleInputChange = (e) => {
    setMessageDraft(e.target.value);
    if (socketRef.current && selectedConversationId) {
      socketRef.current.emit("typing", {
        conversationId: selectedConversationId,
        isTyping: true,
      });
      clearTimeout(typingEmitTimeout.current);
      typingEmitTimeout.current = setTimeout(() => {
        socketRef.current?.emit("typing", {
          conversationId: selectedConversationId,
          isTyping: false,
        });
      }, 2500);
    }
  };

  const handleCreateChat = async () => {
    if (!firstMessage.trim()) {
      toast.error(
        isRTL ? "اكتب رسالتك الأولى أولاً" : "Write your first message",
      );
      return;
    }
    if (selectedFriends.length === 0) {
      toast.error(
        isRTL ? "اختر شخصاً على الأقل" : "Select at least one person",
      );
      return;
    }
    setIsCreating(true);
    try {
      const res = await createConversation({
        participantIds: selectedFriends,
        title: isGroupMode && groupTitle.trim() ? groupTitle.trim() : undefined,
        firstMessage: firstMessage.trim(),
      });
      setSearchParams({ conversation: res.conversation.id });
      setIsModalOpen(false);
      resetModal();
      loadInbox();
    } catch {
      toast.error(
        isRTL ? "فشل إنشاء المحادثة" : "Failed to create conversation",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const resetModal = () => {
    setIsGroupMode(false);
    setSelectedFriends([]);
    setGroupTitle("");
    setFriendSearch("");
    setFirstMessage("");
  };

  const toggleFriendSelection = (id) => {
    if (isGroupMode) {
      setSelectedFriends((prev) =>
        prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id],
      );
    } else {
      setSelectedFriends([id]);
    }
  };

  const handleSend = async () => {
    const content = messageDraft.trim();
    if (!content || !selectedConversationId) return;
    setMessageDraft("");
    clearTimeout(typingEmitTimeout.current);
    socketRef.current?.emit("typing", {
      conversationId: selectedConversationId,
      isTyping: false,
    });
    try {
      const msg = await sendMessage(selectedConversationId, content);
      setMessages((prev) => [...prev, msg]);
      loadInbox();
    } catch {
      toast.error(isRTL ? "خطأ في الإرسال" : "Send error");
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString(isRTL ? "ar-EG" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatConvTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday)
      return d.toLocaleTimeString(isRTL ? "ar-EG" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    return d.toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
      day: "numeric",
      month: "short",
    });
  };

  const filteredConversations = conversations.filter((c) => {
    if (!sidebarSearch) return true;
    return getConvDisplayName(c, currentUserId)
      .toLowerCase()
      .includes(sidebarSearch.toLowerCase());
  });

  const filteredFriends = friends.filter((f) => {
    if (!friendSearch) return true;
    return `${f.firstName} ${f.lastName} ${f.username || ""}`
      .toLowerCase()
      .includes(friendSearch.toLowerCase());
  });

  const typingCount = Object.keys(typingUsers).length;
  const convDisplayName = selectedConversation
    ? getConvDisplayName(selectedConversation, currentUserId)
    : "";
  const ChevronIcon = isRTL ? FiChevronLeft : FiChevronRight;

  const renderAvatarContent = (avatarInfo, fallbackName, isGroup = false) => {
    if (isGroup) return <FiUsers size={17} />;
    if (avatarInfo?.type === "img")
      return <img src={avatarInfo.src} alt={fallbackName} />;
    return avatarInfo?.value || "?";
  };

  return (
    <div className="mh-root">
      <aside className="mh-sidebar">
        <header className="mh-sidebar-header">
          <h1 className="mh-sidebar-title">{isRTL ? "الرسائل" : "Messages"}</h1>
          <button className="mh-new-btn" onClick={() => setIsModalOpen(true)}>
            <FiPlus size={18} />
          </button>
        </header>

        <div className="mh-sidebar-search">
          <FiSearch size={14} />
          <input
            placeholder={
              isRTL ? "بحث في المحادثات..." : "Search conversations..."
            }
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
          />
        </div>

        <nav className="mh-conv-list">
          {filteredConversations.length === 0 && (
            <div className="mh-empty-list">
              <FiMessageSquare size={30} />
              <p>{isRTL ? "لا توجد محادثات بعد" : "No conversations yet"}</p>
              <button
                className="mh-empty-new-btn"
                onClick={() => setIsModalOpen(true)}>
                <FiPlus size={12} />
                {isRTL ? "ابدأ محادثة" : "Start a chat"}
              </button>
            </div>
          )}

          {filteredConversations.map((conv) => {
            const isActive = selectedConversationId === conv.id;
            const hasUnread = conv.unreadCount > 0;
            const displayName = getConvDisplayName(conv, currentUserId);
            const avatarInfo = getConvAvatarInfo(conv, currentUserId);

            return (
              <div
                key={conv.id}
                className={`mh-conv-item${isActive ? " active" : ""}${hasUnread ? " unread" : ""}`}
                onClick={() => setSearchParams({ conversation: conv.id })}>
                <div
                  className={`mh-conv-avatar${conv?.isGroup ? " group" : ""}`}>
                  {renderAvatarContent(
                    avatarInfo,
                    displayName,
                    conv?.isGroup ?? false,
                  )}
                </div>
                <div className="mh-conv-body">
                  <div className="mh-conv-top">
                    <span className="mh-conv-name">{displayName}</span>
                    <span className="mh-conv-time">
                      {formatConvTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="mh-conv-bottom">
                    <span className="mh-conv-preview">
                      {conv.lastMessage ||
                        (isRTL ? "ابدأ المحادثة" : "Start chatting")}
                    </span>
                    {hasUnread && (
                      <span className="mh-unread-badge">
                        {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="mh-chat">
        {selectedConversationId ? (
          <>
            <header className="mh-chat-header">
              <div
                className={`mh-chat-header-avatar${selectedConversation?.isGroup ? " group" : ""}`}>
                {renderAvatarContent(
                  getConvAvatarInfo(selectedConversation, currentUserId),
                  convDisplayName,
                  selectedConversation?.isGroup ?? false,
                )}
              </div>
              <div className="mh-chat-header-info">
                <h2>{convDisplayName}</h2>
                {typingCount > 0 ? (
                  <p className="mh-typing-text">
                    {typingCount > 1
                      ? isRTL
                        ? `${typingCount} أشخاص يكتبون`
                        : `${typingCount} people typing`
                      : isRTL
                        ? "يكتب..."
                        : "typing..."}
                    <span className="mh-typing-dots">
                      <span />
                      <span />
                      <span />
                    </span>
                  </p>
                ) : (selectedConversation?.isGroup ?? false) ? (
                  <p className="mh-chat-header-sub">
                    {isRTL ? "مجموعة" : "Group"}
                  </p>
                ) : null}
              </div>
            </header>

            <div className="mh-messages">
              {messages.length === 0 && (
                <div className="mh-messages-empty">
                  <FiMessageSquare size={34} />
                  <p>
                    {isRTL ? "ابدأ المحادثة الآن!" : "Start the conversation!"}
                  </p>
                </div>
              )}

              {messages.map((m, idx) => {
                const isOwn = m.senderId === currentUserId;
                const grouped =
                  idx > 0 && messages[idx - 1]?.senderId === m.senderId;
                const showName =
                  !isOwn &&
                  (selectedConversation?.isGroup ?? false) &&
                  !grouped;

                return (
                  <div
                    key={m.id}
                    className={`mh-msg-row${isOwn ? " own" : ""}${grouped ? " grouped" : ""}`}>
                    {!isOwn && (
                      <div
                        className={`mh-msg-avatar${grouped ? " hidden" : ""}`}>
                        {!grouped &&
                          (m.sender?.avatarUrl ? (
                            <img src={m.sender.avatarUrl} alt="" />
                          ) : (
                            (m.sender?.firstName?.[0] || "?").toUpperCase()
                          ))}
                      </div>
                    )}
                    <div className="mh-msg-content-group">
                      {showName && (
                        <span className="mh-msg-sender-name">
                          {m.sender?.firstName} {m.sender?.lastName}
                        </span>
                      )}
                      <div className={`mh-msg-bubble${isOwn ? " own" : ""}`}>
                        {m.replyToMessage && (
                          <div className="mh-reply-preview">
                            <span className="mh-reply-bar" />
                            <span className="mh-reply-text">
                              {m.replyToMessage.content}
                            </span>
                          </div>
                        )}
                        <span className="mh-msg-text">{m.content}</span>
                        <div className="mh-msg-meta">
                          <span className="mh-msg-time">
                            {formatTime(m.createdAt)}
                          </span>
                          {m.editedAt && (
                            <span className="mh-edited-tag">
                              {isRTL ? "معدّل" : "edited"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="mh-input-area">
              <input
                ref={inputRef}
                className="mh-input"
                value={messageDraft}
                onChange={handleInputChange}
                placeholder={isRTL ? "اكتب رسالة..." : "Write a message..."}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                className={`mh-send-btn${messageDraft.trim() ? " active" : ""}`}
                onClick={handleSend}
                disabled={!messageDraft.trim()}>
                <FiSend size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="mh-no-chat">
            <div className="mh-no-chat-icon">
              <FiMessageSquare size={46} />
            </div>
            <h3>{isRTL ? "مرحباً بك في الرسائل" : "Welcome to Messages"}</h3>
            <p>
              {isRTL
                ? "اختر محادثة موجودة أو ابدأ محادثة جديدة"
                : "Select a conversation or start a new one"}
            </p>
            <button
              className="mh-no-chat-btn"
              onClick={() => setIsModalOpen(true)}>
              <FiPlus size={14} />
              {isRTL ? "محادثة جديدة" : "New conversation"}
            </button>
          </div>
        )}
      </main>

      {isModalOpen && (
        <div
          className="mh-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
              resetModal();
            }
          }}>
          <div className="mh-modal">
            <div className="mh-modal-header">
              <h2>
                {isGroupMode
                  ? isRTL
                    ? "إنشاء مجموعة"
                    : "Create Group"
                  : isRTL
                    ? "محادثة جديدة"
                    : "New Conversation"}
              </h2>
              <button
                className="mh-modal-close"
                onClick={() => {
                  setIsModalOpen(false);
                  resetModal();
                }}>
                <FiX size={17} />
              </button>
            </div>

            <div className="mh-type-toggle">
              <button
                className={`mh-type-btn${!isGroupMode ? " active" : ""}`}
                onClick={() => {
                  setIsGroupMode(false);
                  setSelectedFriends([]);
                }}>
                <FiMessageSquare size={14} />
                {isRTL ? "فردية" : "Direct"}
              </button>
              <button
                className={`mh-type-btn${isGroupMode ? " active" : ""}`}
                onClick={() => {
                  setIsGroupMode(true);
                  setSelectedFriends([]);
                }}>
                <FiUsers size={14} />
                {isRTL ? "مجموعة" : "Group"}
              </button>
            </div>

            {isGroupMode && (
              <div className="mh-modal-field">
                <label className="mh-modal-label">
                  {isRTL ? "اسم المجموعة" : "Group name"}
                </label>
                <input
                  className="mh-modal-input"
                  placeholder={
                    isRTL ? "مثال: فريق العمل..." : "e.g. Work team..."
                  }
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  maxLength={200}
                />
              </div>
            )}

            <div className="mh-modal-search">
              <FiSearch size={14} />
              <input
                placeholder={isRTL ? "ابحث عن أصدقاء..." : "Search friends..."}
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
              />
            </div>

            <div className="mh-friends-list">
              {!isGroupMode && (
                <div
                  className={`mh-friend-item self${selectedFriends[0] === currentUserId ? " selected" : ""}`}
                  onClick={() => setSelectedFriends([currentUserId])}>
                  <div className="mh-friend-avatar self">
                    <FiBookmark size={14} />
                  </div>
                  <div className="mh-friend-info">
                    <span className="mh-friend-name">
                      {isRTL ? "رسائل محفوظة" : "Saved Messages"}
                    </span>
                    <span className="mh-friend-sub">
                      {isRTL
                        ? "احفظ ملاحظاتك ووصلاتك"
                        : "Save your notes and links"}
                    </span>
                  </div>
                  {selectedFriends[0] === currentUserId && (
                    <span className="mh-friend-check">
                      <FiCheck size={13} />
                    </span>
                  )}
                </div>
              )}

              {filteredFriends.map((f) => {
                const isSelected = selectedFriends.includes(f.userId);
                return (
                  <div
                    key={f.userId}
                    className={`mh-friend-item${isSelected ? " selected" : ""}`}
                    onClick={() => toggleFriendSelection(f.userId)}>
                    <div className="mh-friend-avatar">
                      {f.avatarUrl ? (
                        <img src={f.avatarUrl} alt={f.firstName} />
                      ) : (
                        f.firstName[0].toUpperCase()
                      )}
                    </div>
                    <div className="mh-friend-info">
                      <span className="mh-friend-name">
                        {f.firstName} {f.lastName}
                      </span>
                      {f.username && (
                        <span className="mh-friend-sub">@{f.username}</span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="mh-friend-check">
                        <FiCheck size={13} />
                      </span>
                    )}
                  </div>
                );
              })}

              {filteredFriends.length === 0 && (
                <div className="mh-friends-empty">
                  {isRTL ? "لا يوجد أصدقاء مطابقون" : "No matching friends"}
                </div>
              )}
            </div>

            {isGroupMode && selectedFriends.length > 0 && (
              <div className="mh-selected-chips">
                {selectedFriends.map((fid) => {
                  const fr = friends.find((f) => f.userId === fid);
                  if (!fr) return null;
                  return (
                    <span key={fid} className="mh-chip">
                      {fr.firstName}
                      <button onClick={() => toggleFriendSelection(fid)}>
                        <FiX size={10} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <div className="mh-modal-field">
              <label className="mh-modal-label">
                {isRTL ? "الرسالة الأولى" : "First message"}
              </label>
              <input
                className="mh-modal-input"
                placeholder={
                  isRTL
                    ? "اكتب رسالتك الأولى..."
                    : "Write your first message..."
                }
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !isCreating && handleCreateChat()
                }
              />
            </div>

            <button
              className="mh-confirm-btn"
              disabled={
                selectedFriends.length === 0 ||
                !firstMessage.trim() ||
                isCreating
              }
              onClick={handleCreateChat}>
              {isCreating ? (
                <span className="mh-spinner" />
              ) : (
                <>
                  {isGroupMode
                    ? isRTL
                      ? "إنشاء المجموعة"
                      : "Create Group"
                    : isRTL
                      ? "بدء المحادثة"
                      : "Start Chat"}
                  <ChevronIcon size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessengerHub;
