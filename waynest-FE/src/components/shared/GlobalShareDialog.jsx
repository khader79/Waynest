import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Modal } from "antd";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { FiCheck, FiCopy, FiExternalLink, FiMessageSquare, FiSend } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import {
  createConversation,
  fetchFriends,
  fetchInbox,
  sendMessage,
} from "@/api/social";
import { setActiveWorkspace } from "@/utils/activeWorkspaceStorage";
import { getResolvedAvatarUrl, handleAvatarImageError } from "@/utils/avatar";
import { copyTextToClipboard } from "@/utils/clipboard";
import { getApiErrorMessage } from "@/utils/errors";
import "./GlobalShareDialog.css";

const FRIEND_SEARCH_DEBOUNCE_MS = 240;

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const buildTitle = (payload, t) =>
  normalizeText(payload?.title) ||
  t("share.defaultTitle", { defaultValue: "Shared from Waynest" });

const buildText = (payload, t) =>
  normalizeText(payload?.text) ||
  t("share.defaultText", {
    defaultValue: "Take a look at this on Waynest.",
  });

const buildUrl = (payload) => normalizeText(payload?.url);

const buildCopyText = (payload, t) => {
  const explicitCopy = normalizeText(payload?.copyText);
  if (explicitCopy) {
    return explicitCopy;
  }

  return [buildTitle(payload, t), buildText(payload, t), buildUrl(payload)]
    .filter(Boolean)
    .join("\n\n")
    .trim();
};

const buildInternalMessage = (payload, t) => {
  const explicitMessage = normalizeText(payload?.internalMessage);
  if (explicitMessage) {
    return explicitMessage;
  }

  return [
    t("share.internalLead", {
      defaultValue: "Shared with you on Waynest",
    }),
    buildTitle(payload, t),
    buildText(payload, t),
    buildUrl(payload),
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
};

const getFriendDisplayName = (friend, fallback) => {
  const fullName = `${friend?.firstName ?? ""} ${friend?.lastName ?? ""}`.trim();
  return fullName || friend?.username || fallback;
};

const findDirectConversationId = (inbox, userId) => {
  if (!Array.isArray(inbox) || !userId) {
    return null;
  }

  const directConversation = inbox.find((conversation) => {
    if (!conversation || conversation.isGroup || !Array.isArray(conversation.members)) {
      return false;
    }

    return conversation.members.some(
      (member) => String(member?.userId ?? "") === String(userId),
    );
  });

  return directConversation?.id ?? null;
};

const GlobalShareDialog = ({ open, payload, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [sending, setSending] = useState(false);

  const shareTitle = useMemo(() => buildTitle(payload, t), [payload, t]);
  const shareText = useMemo(() => buildText(payload, t), [payload, t]);
  const shareUrl = useMemo(() => buildUrl(payload), [payload]);
  const copyText = useMemo(() => buildCopyText(payload, t), [payload, t]);
  const internalMessage = useMemo(
    () => buildInternalMessage(payload, t),
    [payload, t],
  );
  const hasNativeShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function";

  useEffect(() => {
    if (!open) {
      setFriendSearch("");
      setSelectedUserIds([]);
      setFriends([]);
      setSending(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isAuthenticated) {
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setFriendsLoading(true);
          const nextFriends = await fetchFriends(friendSearch);
          if (!active) {
            return;
          }
          setFriends(Array.isArray(nextFriends) ? nextFriends : []);
        } catch (error) {
          if (active) {
            toast.error(
              getApiErrorMessage(
                error,
                t("share.friendsLoadFailed", {
                  defaultValue: "Could not load your friends",
                }),
              ),
            );
            setFriends([]);
          }
        } finally {
          if (active) {
            setFriendsLoading(false);
          }
        }
      })();
    }, FRIEND_SEARCH_DEBOUNCE_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [friendSearch, isAuthenticated, open, t]);

  const closeDialog = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const toggleSelectedUser = useCallback((userId) => {
    if (!userId) {
      return;
    }

    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((value) => value !== userId)
        : [...current, userId],
    );
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await copyTextToClipboard(copyText || shareUrl || shareTitle);
      toast.success(
        t("share.copySuccess", {
          defaultValue: "Share link copied",
        }),
      );
      closeDialog();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("share.copyFailed", {
            defaultValue: "Could not copy this share link",
          }),
        ),
      );
    }
  }, [closeDialog, copyText, shareTitle, shareUrl, t]);

  const handleNativeShare = useCallback(async () => {
    if (!hasNativeShare) {
      return;
    }

    try {
      await navigator.share({
        title: shareTitle || undefined,
        text: shareText || undefined,
        url: shareUrl || undefined,
      });
      closeDialog();
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "AbortError"
      ) {
        return;
      }

      toast.error(
        getApiErrorMessage(
          error,
          t("share.nativeFailed", {
            defaultValue: "Could not open the share menu",
          }),
        ),
      );
    }
  }, [closeDialog, hasNativeShare, shareText, shareTitle, shareUrl, t]);

  const handleNavigateToLogin = useCallback(() => {
    navigate("/login", {
      state: {
        from: location,
      },
    });
    closeDialog();
  }, [closeDialog, location, navigate]);

  const handleSendToFriends = useCallback(async () => {
    if (!selectedUserIds.length) {
      toast.info(
        t("share.pickFriendsFirst", {
          defaultValue: "Pick at least one friend first",
        }),
      );
      return;
    }

    if (!internalMessage) {
      toast.error(
        t("share.missingContent", {
          defaultValue: "There is nothing to share yet",
        }),
      );
      return;
    }

    setSending(true);
    try {
      const inbox = await fetchInbox();
      const conversationIds = [];

      for (const userId of selectedUserIds) {
        const existingConversationId = findDirectConversationId(inbox, userId);

        if (existingConversationId) {
          await sendMessage(existingConversationId, internalMessage);
          conversationIds.push(existingConversationId);
          continue;
        }

        const created = await createConversation({
          participantIds: [userId],
          firstMessage: internalMessage,
        });
        const nextConversationId = created?.conversation?.id ?? null;
        if (nextConversationId) {
          conversationIds.push(nextConversationId);
        }
      }

      try {
        window.dispatchEvent(new Event("chat:message"));
      } catch {
        // Best-effort refresh signal for inbox surfaces.
      }

      toast.success(
        selectedUserIds.length === 1
          ? t("share.sentSingleSuccess", {
              defaultValue: "Shared in chat",
            })
          : t("share.sentManySuccess", {
              defaultValue: "Shared with {{count}} friends",
              count: selectedUserIds.length,
            }),
      );

      if (user?.role === "PROVIDER" && user?.id) {
        setActiveWorkspace(user.id, "personal");
      }

      closeDialog();

      if (selectedUserIds.length === 1 && conversationIds[0]) {
        navigate(`/social?conversation=${encodeURIComponent(conversationIds[0])}`);
      } else {
        navigate("/social");
      }
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("share.sendFailed", {
            defaultValue: "Could not share this in chat",
          }),
        ),
      );
    } finally {
      setSending(false);
    }
  }, [closeDialog, internalMessage, navigate, selectedUserIds, t, user?.id, user?.role]);

  return (
    <Modal
      open={open}
      onCancel={closeDialog}
      footer={null}
      centered
      width={720}
      className="global-share-modal"
      title={payload?.dialogTitle || t("share.dialogTitle", { defaultValue: "Share" })}>
      <div className="global-share-dialog">
        <section className="global-share-dialog__preview">
          <p className="global-share-dialog__eyebrow">
            {t("share.previewLabel", { defaultValue: "Share preview" })}
          </p>
          <h3>{shareTitle}</h3>
          <p>{shareText}</p>
          {shareUrl ? (
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="global-share-dialog__link">
              <FiExternalLink aria-hidden />
              <span>{shareUrl}</span>
            </a>
          ) : null}
        </section>

        <section className="global-share-dialog__actions">
          <button
            type="button"
            className="global-share-dialog__actionBtn global-share-dialog__actionBtn--primary"
            onClick={() => void handleCopy()}>
            <FiCopy aria-hidden />
            <span>{t("share.copyLink", { defaultValue: "Copy link" })}</span>
          </button>

          {hasNativeShare ? (
            <button
              type="button"
              className="global-share-dialog__actionBtn"
              onClick={() => void handleNativeShare()}>
              <FiSend aria-hidden />
              <span>
                {t("share.shareOutside", {
                  defaultValue: "Share outside Waynest",
                })}
              </span>
            </button>
          ) : null}
        </section>

        <section className="global-share-dialog__friends">
          <div className="global-share-dialog__friendsHead">
            <div>
              <p className="global-share-dialog__eyebrow">
                {t("share.inAppLabel", { defaultValue: "Share in Waynest" })}
              </p>
              <h3>
                {t("share.sendToFriends", {
                  defaultValue: "Send to your friends",
                })}
              </h3>
            </div>

            {selectedUserIds.length > 0 ? (
              <span className="global-share-dialog__selectedCount">
                {t("share.selectedCount", {
                  defaultValue: "{{count}} selected",
                  count: selectedUserIds.length,
                })}
              </span>
            ) : null}
          </div>

          {isAuthenticated ? (
            <>
              <label className="global-share-dialog__search">
                <span className="sr-only">
                  {t("share.searchFriends", {
                    defaultValue: "Search friends",
                  })}
                </span>
                <input
                  type="search"
                  value={friendSearch}
                  onChange={(event) => setFriendSearch(event.target.value)}
                  placeholder={t("share.searchPlaceholder", {
                    defaultValue: "Search your friends...",
                  })}
                />
              </label>

              <div className="global-share-dialog__friendsList" role="list">
                {friendsLoading ? (
                  <div className="global-share-dialog__empty">
                    {t("common.loading", { defaultValue: "Loading..." })}
                  </div>
                ) : friends.length > 0 ? (
                  friends.map((friend) => {
                    const friendId = normalizeText(friend?.userId);
                    const friendName = getFriendDisplayName(
                      friend,
                      t("social.feed.traveler", { defaultValue: "Traveler" }),
                    );
                    const avatarUrl = getResolvedAvatarUrl(friend);
                    const selected = selectedUserIds.includes(friendId);

                    return (
                      <button
                        key={friendId}
                        type="button"
                        className={`global-share-dialog__friendRow${
                          selected ? " is-selected" : ""
                        }`}
                        onClick={() => toggleSelectedUser(friendId)}>
                        <span className="global-share-dialog__friendAvatar">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt=""
                              onError={handleAvatarImageError}
                            />
                          ) : (
                            friendName.charAt(0).toUpperCase()
                          )}
                        </span>

                        <span className="global-share-dialog__friendMeta">
                          <strong>{friendName}</strong>
                          <span>
                            {friend?.username
                              ? `@${friend.username}`
                              : t("share.friendLabel", {
                                  defaultValue: "Waynest friend",
                                })}
                          </span>
                        </span>

                        <span className="global-share-dialog__friendCheck" aria-hidden>
                          {selected ? <FiCheck /> : null}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="global-share-dialog__empty">
                    {t("share.noFriends", {
                      defaultValue: "No friends found to share with yet",
                    })}
                  </div>
                )}
              </div>

              <div className="global-share-dialog__footer">
                <button
                  type="button"
                  className="global-share-dialog__chatBtn"
                  disabled={sending || selectedUserIds.length === 0}
                  onClick={() => void handleSendToFriends()}>
                  <FiMessageSquare aria-hidden />
                  <span>
                    {sending
                      ? t("share.sending", { defaultValue: "Sending..." })
                      : t("share.sendInChat", {
                          defaultValue: "Send in Waynest chat",
                        })}
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="global-share-dialog__authPrompt">
              <p>
                {t("share.loginPrompt", {
                  defaultValue:
                    "Sign in so you can send this directly to your Waynest friends.",
                })}
              </p>
              <div className="global-share-dialog__authActions">
                <button
                  type="button"
                  className="global-share-dialog__chatBtn"
                  onClick={handleNavigateToLogin}>
                  {t("auth.login", { defaultValue: "Log in" })}
                </button>
                <Link to="/register" className="global-share-dialog__inlineLink" onClick={closeDialog}>
                  {t("auth.register", { defaultValue: "Create account" })}
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
};

export default GlobalShareDialog;

