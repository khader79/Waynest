import { Modal } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { globalSearch, type SearchHit } from "@/services/search/globalSearch.service";
import { useAuth } from "@/core/providers/AuthContext";
import { getApiErrorMessage } from "@/core/utils/errors";
import {
  acceptFriendship,
  createConversation,
  declineFriendship,
  followUser,
  getFriendshipStateByUsername,
  getSocialGraphState,
  requestFriendship,
  unfollowUser,
  type FriendshipStateApi,
} from "@/services/social/social.service";
import { fetchPublicProviderBySlug } from "@/services/public/publicDirectory.service";
import "./NavbarPublicSearchDropdown.css";

type ProviderMeta = { ownerUserId: string | null; following: boolean | null };

type Props = {
  onAfterNavigate?: () => void;
  variant?: "desktop" | "mobile";
};

const parseUserUsernameFromHref = (href: string): string | null => {
  const match = href.match(/^\/u\/(.+)$/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
};

const parseProviderSlugFromHref = (href: string): string | null => {
  const match = href.match(/^\/p\/(.+)$/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
};

export const NavbarPublicSearchDropdown = ({ onAfterNavigate, variant = "desktop" }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [q, setQ] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [results, setResults] = useState<SearchHit[]>([]);

  const [friendshipByUsername, setFriendshipByUsername] = useState<
    Record<string, FriendshipStateApi | null | undefined>
  >({});
  const [providerMetaBySlug, setProviderMetaBySlug] = useState<Record<string, ProviderMeta | null>>(
    {},
  );

  const rootRef = useRef<HTMLDivElement>(null);

  const [quickMessageOpen, setQuickMessageOpen] = useState(false);
  const [quickMessageParticipantId, setQuickMessageParticipantId] = useState<string | null>(null);
  const [quickMessageTargetLabel, setQuickMessageTargetLabel] = useState("");
  const [quickMessageText, setQuickMessageText] = useState("");
  const [quickMessageSending, setQuickMessageSending] = useState(false);

  const tt = (key: string, defaultValue: string) => t(key, { defaultValue });

  const close = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    const handleOutsideMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current) return;
      if (!rootRef.current.contains(target)) {
        close();
      }
    };

    document.addEventListener("mousedown", handleOutsideMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideMouseDown);
    };
  }, []);

  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setFriendshipByUsername({});
      setProviderMetaBySlug({});
      setGlobalLoading(false);
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    setGlobalLoading(true);
    const handle = window.setTimeout(async () => {
      try {
        const res = await globalSearch(trimmed, 10);
        setResults(Array.isArray(res.items) ? res.items : []);
      } catch (error) {
        toast.error(
          getApiErrorMessage(
            error,
            tt("explore.search.error", "Search failed"),
          ),
        );
        setResults([]);
      } finally {
        setGlobalLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const userHits = useMemo(() => results.filter((hit) => hit.type === "user"), [results]);
  const providerHits = useMemo(() => results.filter((hit) => hit.type === "provider"), [results]);
  const placeHits = useMemo(() => results.filter((hit) => hit.type === "place"), [results]);
  const eventHits = useMemo(() => results.filter((hit) => hit.type === "event"), [results]);

  const usernames = useMemo(() => {
    const set = new Set<string>();
    for (const hit of userHits) {
      const username = parseUserUsernameFromHref(hit.href);
      if (username) set.add(username);
    }
    return Array.from(set);
  }, [userHits]);

  useEffect(() => {
    let active = true;
    void (async () => {
      await Promise.all(
        usernames.map(async (username) => {
          try {
            const fs = await getFriendshipStateByUsername(username);
            if (!active) return;
            setFriendshipByUsername((prev) => ({ ...prev, [username]: fs }));
          } catch {
            if (!active) return;
            setFriendshipByUsername((prev) => ({ ...prev, [username]: null }));
          }
        }),
      );
    })();

    return () => {
      active = false;
    };
  }, [usernames]);

  const providerSlugs = useMemo(() => {
    const set = new Set<string>();
    for (const hit of providerHits) {
      const slug = parseProviderSlugFromHref(hit.href);
      if (slug) set.add(slug);
    }
    return Array.from(set);
  }, [providerHits]);

  useEffect(() => {
    let active = true;
    void (async () => {
      await Promise.all(
        providerSlugs.map(async (slug) => {
          try {
            const provider = await fetchPublicProviderBySlug(slug);
            const ownerUserId = provider.ownerUserId ?? null;
            if (!ownerUserId) {
              if (!active) return;
              setProviderMetaBySlug((prev) => ({ ...prev, [slug]: { ownerUserId: null, following: null } }));
              return;
            }

            const graph = await getSocialGraphState(ownerUserId);
            if (!active) return;
            setProviderMetaBySlug((prev) => ({
              ...prev,
              [slug]: { ownerUserId, following: graph.following },
            }));
          } catch {
            if (!active) return;
            setProviderMetaBySlug((prev) => ({ ...prev, [slug]: null }));
          }
        }),
      );
    })();

    return () => {
      active = false;
    };
  }, [providerSlugs]);

  const openQuickMessage = (participantId: string, label: string) => {
    setQuickMessageParticipantId(participantId);
    setQuickMessageTargetLabel(label);
    setQuickMessageText("");
    setQuickMessageOpen(true);
  };

  const sendQuickMessage = async () => {
    if (!quickMessageParticipantId) return;
    const text = quickMessageText.trim();
    if (!text) return;

    setQuickMessageSending(true);
    try {
      const payload = (await createConversation({
        participantIds: [quickMessageParticipantId],
        firstMessage: text,
      })) as unknown as { conversation?: { id?: string }; conversationId?: string };

      const conversationId = payload?.conversation?.id ?? payload?.conversationId;
      if (!conversationId) {
        toast.error(tt("social.inbox.createFailed", "Failed to open chat"));
        return;
      }

      setQuickMessageOpen(false);
      setQuickMessageParticipantId(null);
      setQuickMessageText("");
      close();
      navigate(`/inbox/${conversationId}`);
      onAfterNavigate?.();
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, tt("social.inbox.createFailed", "Failed to send message")),
      );
    } finally {
      setQuickMessageSending(false);
    }
  };

  const handleNavigate = (href: string) => {
    close();
    navigate(href);
    onAfterNavigate?.();
  };

  const renderPeopleAction = (username: string, hit: SearchHit) => {
    if (!isAuthenticated) {
      return (
        <button
          type="button"
          className="navbar-search-action-btn navbar-search-action-btn--outline"
          onClick={() => toast.info(tt("explore.people.login", "Please login to connect"))}>
          {tt("friends.connect", "Connect")}
        </button>
      );
    }

    const fs = friendshipByUsername[username];
    const state = fs?.state;
    const requesterId = fs?.requesterId ?? null;
    const targetUserId = fs?.targetUserId ?? null;

    if (state === "ACCEPTED") {
      return (
        <div className="navbar-search-actions-stack">
          <span className="navbar-search-pill navbar-search-pill--muted">
            {tt("friends.connected", "Friends")}
          </span>
          {targetUserId ? (
            <button
              type="button"
              className="navbar-search-action-btn navbar-search-action-btn--outline"
              onClick={() => openQuickMessage(targetUserId, hit.title)}>
              {tt("social.message", "Message")}
            </button>
          ) : null}
        </div>
      );
    }

    if (state === "PENDING_OUTGOING") {
      return (
        <span className="navbar-search-pill navbar-search-pill--muted">{tt("friends.requestSent", "Request sent")}</span>
      );
    }

    if (state === "PENDING_INCOMING") {
      return (
        <div className="navbar-search-actions-stack">
          <button
            type="button"
            className="navbar-search-action-btn navbar-search-action-btn--primary"
            disabled={!requesterId}
            onClick={async () => {
              if (!requesterId) return;
              await acceptFriendship(requesterId);
              const next = await getFriendshipStateByUsername(username);
              setFriendshipByUsername((prev) => ({ ...prev, [username]: next }));
            }}>
            {tt("friends.accept", "Accept")}
          </button>
          <button
            type="button"
            className="navbar-search-action-btn navbar-search-action-btn--danger"
            disabled={!requesterId}
            onClick={async () => {
              if (!requesterId) return;
              await declineFriendship(requesterId);
              const next = await getFriendshipStateByUsername(username);
              setFriendshipByUsername((prev) => ({ ...prev, [username]: next }));
            }}>
            {tt("friends.decline", "Decline")}
          </button>
        </div>
      );
    }

    if (!fs) {
      return (
        <button type="button" className="navbar-search-action-btn" disabled>
          {tt("explore.search.loading", "Loading...")}
        </button>
      );
    }

    return (
      <button
        type="button"
        className="navbar-search-action-btn navbar-search-action-btn--primary"
        disabled={!username}
        onClick={async () => {
          try {
            await requestFriendship(username);
            const next = await getFriendshipStateByUsername(username);
            setFriendshipByUsername((prev) => ({ ...prev, [username]: next }));
          } catch (error) {
            toast.error(getApiErrorMessage(error, tt("friends.requestFail", "Request failed")));
          }
        }}>
        {tt("friends.add", "Add friend")}
      </button>
    );
  };

  const renderProviderAction = (slug: string, hit: SearchHit) => {
    const meta = providerMetaBySlug[slug];
    const ownerUserId = meta?.ownerUserId ?? null;
    const following = meta?.following ?? null;

    if (!isAuthenticated) {
      return (
        <button
          type="button"
          className="navbar-search-action-btn navbar-search-action-btn--primary"
          onClick={() => toast.info(tt("explore.people.login", "Please login to connect"))}>
          {tt("social.follow", "Follow")}
        </button>
      );
    }

    if (!meta) {
      return (
        <button type="button" className="navbar-search-action-btn" disabled>
          {tt("explore.search.loading", "Loading...")}
        </button>
      );
    }

    const canMessage = following === true && Boolean(ownerUserId);
    if (following === true) {
      return (
        <div className="navbar-search-actions-stack">
          <button
            type="button"
            className="navbar-search-action-btn navbar-search-action-btn--outline"
            disabled={!ownerUserId}
            onClick={async () => {
              if (!ownerUserId) return;
              try {
                await unfollowUser(ownerUserId);
                const nextMeta = await (async () => {
                  const provider = await fetchPublicProviderBySlug(slug);
                  const nextOwnerUserId = provider.ownerUserId ?? null;
                  if (!nextOwnerUserId) return { ownerUserId: null, following: null };
                  const graph = await getSocialGraphState(nextOwnerUserId);
                  return { ownerUserId: nextOwnerUserId, following: graph.following };
                })();
                setProviderMetaBySlug((prev) => ({ ...prev, [slug]: nextMeta }));
              } catch (error) {
                toast.error(getApiErrorMessage(error, tt("social.unfollowFail", "Unfollow failed")));
              }
            }}>
            {tt("social.unfollow", "Unfollow")}
          </button>
          {canMessage ? (
            <button
              type="button"
              className="navbar-search-action-btn navbar-search-action-btn--outline"
              onClick={() => openQuickMessage(ownerUserId as string, hit.title)}>
              {tt("social.message", "Message")}
            </button>
          ) : null}
        </div>
      );
    }

    return (
      <button
        type="button"
        className="navbar-search-action-btn navbar-search-action-btn--primary"
        disabled={!ownerUserId}
        onClick={async () => {
          if (!ownerUserId) return;
          try {
            await followUser(ownerUserId);
            const provider = await fetchPublicProviderBySlug(slug);
            const nextOwnerUserId = provider.ownerUserId ?? null;
            if (!nextOwnerUserId) {
              setProviderMetaBySlug((prev) => ({ ...prev, [slug]: { ownerUserId: null, following: null } }));
              return;
            }
            const graph = await getSocialGraphState(nextOwnerUserId);
            setProviderMetaBySlug((prev) => ({ ...prev, [slug]: { ownerUserId: nextOwnerUserId, following: graph.following } }));
          } catch (error) {
            toast.error(getApiErrorMessage(error, tt("social.followFail", "Follow failed")));
          }
        }}>
        {tt("social.follow", "Follow")}
      </button>
    );
  };

  const variantClass = variant === "mobile" ? "navbar-search-dropdown--mobile" : "";

  return (
    <div ref={rootRef} className={`navbar-search-dropdown ${variantClass}`}>
      <form
        className="navbar-search-dropdown__form"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = q.trim();
          if (!trimmed) return;
          close();
          navigate(`/search?q=${encodeURIComponent(trimmed)}`);
          onAfterNavigate?.();
        }}>
        <input
          className="navbar-search-dropdown__input"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tt("search.placeholder", "Search people, places, events...")}
          autoComplete="off"
        />
      </form>

      {isOpen ? (
        <div className="navbar-search-dropdown__panel" role="list" aria-label="Search results">
          {globalLoading ? <div className="navbar-search-dropdown__loading">{tt("explore.search.loading", "Searching...")}</div> : null}

          {!globalLoading && userHits.length === 0 && providerHits.length === 0 && placeHits.length === 0 && eventHits.length === 0 ? (
            <div className="navbar-search-dropdown__empty">{tt("explore.search.noResults", "No results")}</div>
          ) : null}

          {userHits.length > 0 ? (
            <div className="navbar-search-dropdown__section">
              <div className="navbar-search-dropdown__section-title">{tt("explore.search.people", "People")}</div>
              <div className="navbar-search-dropdown__rows">
                {userHits.map((hit) => {
                  const username = parseUserUsernameFromHref(hit.href);
                  if (!username) return null;

                  return (
                    <div key={hit.href} className="navbar-search-dropdown__row">
                      <div className="navbar-search-dropdown__row-main">
                        <span className="navbar-search-avatar">{username.trim().charAt(0).toUpperCase()}</span>
                        <div className="navbar-search-dropdown__row-text">
                          <strong className="navbar-search-dropdown__row-title">{hit.title}</strong>
                          {hit.subtitle ? <small className="navbar-search-dropdown__row-sub">{hit.subtitle}</small> : null}
                        </div>
                      </div>
                      <div className="navbar-search-dropdown__row-actions">
                        {renderPeopleAction(username, hit)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {providerHits.length > 0 ? (
            <div className="navbar-search-dropdown__section">
              <div className="navbar-search-dropdown__section-title">{tt("explore.search.providers", "Providers")}</div>
              <div className="navbar-search-dropdown__rows">
                {providerHits.map((hit) => {
                  const slug = parseProviderSlugFromHref(hit.href);
                  if (!slug) return null;

                  return (
                    <div key={hit.href} className="navbar-search-dropdown__row">
                      <div className="navbar-search-dropdown__row-main">
                        <span className="navbar-search-avatar navbar-search-avatar--accent">{hit.title.trim().charAt(0).toUpperCase()}</span>
                        <div className="navbar-search-dropdown__row-text">
                          <strong className="navbar-search-dropdown__row-title">{hit.title}</strong>
                          {hit.subtitle ? <small className="navbar-search-dropdown__row-sub">{hit.subtitle}</small> : null}
                        </div>
                      </div>
                      <div className="navbar-search-dropdown__row-actions">
                        {renderProviderAction(slug, hit)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {placeHits.length > 0 ? (
            <div className="navbar-search-dropdown__section">
              <div className="navbar-search-dropdown__section-title">{tt("explore.search.places", "Places")}</div>
              <div className="navbar-search-dropdown__place-rows">
                {placeHits.map((hit) => (
                  <div key={hit.href} className="navbar-search-place-row">
                    {hit.imageUrl ? (
                      <img className="navbar-search-place-row__img" src={hit.imageUrl} alt={hit.title} />
                    ) : (
                      <div className="navbar-search-place-row__img navbar-search-place-row__img--placeholder" />
                    )}
                    <div className="navbar-search-place-row__body">
                      <div className="navbar-search-place-row__title">{hit.title}</div>
                      {hit.subtitle ? <div className="navbar-search-place-row__sub">{hit.subtitle}</div> : null}
                    </div>
                    <div className="navbar-search-place-row__actions">
                      <button
                        type="button"
                        className="navbar-search-action-btn navbar-search-action-btn--outline"
                        onClick={() => handleNavigate(hit.href)}>
                        {tt("explore.actions.viewDetails", "View details")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {eventHits.length > 0 ? (
            <div className="navbar-search-dropdown__section">
              <div className="navbar-search-dropdown__section-title">{tt("explore.search.events", "Events")}</div>
              <div className="navbar-search-dropdown__place-rows">
                {eventHits.map((hit) => (
                  <div key={hit.href} className="navbar-search-place-row">
                    {hit.imageUrl ? (
                      <img className="navbar-search-place-row__img" src={hit.imageUrl} alt={hit.title} />
                    ) : (
                      <div className="navbar-search-place-row__img navbar-search-place-row__img--placeholder" />
                    )}
                    <div className="navbar-search-place-row__body">
                      <div className="navbar-search-place-row__title">{hit.title}</div>
                      {hit.subtitle ? <div className="navbar-search-place-row__sub">{hit.subtitle}</div> : null}
                    </div>
                    <div className="navbar-search-place-row__actions">
                      <button
                        type="button"
                        className="navbar-search-action-btn navbar-search-action-btn--outline"
                        onClick={() => handleNavigate(hit.href)}>
                        {tt("explore.actions.viewDetails", "View details")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <Modal
        className="navbar-quickmessage-modal"
        title={tt("social.quickMessage.title", "Quick Message")}
        open={quickMessageOpen}
        onCancel={() => setQuickMessageOpen(false)}
        onOk={() => void sendQuickMessage()}
        okText={tt("social.quickMessage.send", "Send")}
        okButtonProps={{
          disabled: quickMessageSending || !quickMessageText.trim(),
        }}
        confirmLoading={quickMessageSending}
        destroyOnClose>
        <div className="social-composer">
          <h3>
            {tt("social.quickMessage.to", "To")}: {quickMessageTargetLabel}
          </h3>
          <textarea
            placeholder={tt("social.quickMessage.placeholder", "Write a message...")}
            value={quickMessageText}
            onChange={(event) => setQuickMessageText(event.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

