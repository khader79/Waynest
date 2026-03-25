import { Modal } from "antd";
import { useEffect, useMemo, useState } from "react";
import { FaCalendarAlt, FaMapMarkerAlt, FaStar } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { globalSearch, type SearchHit } from "@/services/search/globalSearch.service";
import { useAuth } from "@/core/providers/AuthContext";
import { getApiErrorMessage } from "@/core/utils/errors";
import {
  acceptFriendship,
  createConversation,
  declineFriendship,
  followUser,
  fetchGlobalMessages,
  fetchInbox,
  fetchSocialFeed,
  getFriendshipStateByUsername,
  getSocialGraphState,
  requestFriendship,
  saveSocialPost,
  toggleSocialLike,
  unfollowUser,
  type FriendshipStateApi,
  type SocialPost,
} from "@/services/social/social.service";
import { fetchPublicProviderBySlug } from "@/services/public/publicDirectory.service";
import { copyTextToClipboard } from "@/core/utils/clipboard";
import { useExplorePage } from "../../hooks/useExplorePage";
import "./Explore.css";
import "../social/SocialFeed.css";

const getFallbackImage = (type: string) => {
  switch (type) {
    case "RESTAURANT":
      return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=75&auto=format&fit=crop";
    case "CAFE":
      return "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=75&auto=format&fit=crop";
    case "MUSEUM":
      return "https://images.unsplash.com/photo-1566127992631-137a642a90f4?w=600&q=75&auto=format&fit=crop";
    case "PARK":
      return "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&q=75&auto=format&fit=crop";
    case "HISTORICAL":
      return "https://images.unsplash.com/photo-1600628422019-6c9b5b6f2a4b?w=600&q=75&auto=format&fit=crop";
    case "SHOP":
      return "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=75&auto=format&fit=crop";
    case "ATTRACTION":
      return "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&q=75&auto=format&fit=crop";
    default:
      return "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&q=75&auto=format&fit=crop";
  }
};

const Explore = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {
    activeCategory,
    events,
    filteredPlaces,
    loading,
    setActiveCategory,
  } = useExplorePage();
  const tt = (key: string, defaultValue: string) => t(key, { defaultValue });

  type ExploreTab = "discover" | "community" | "messages";
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: ExploreTab =
    tabParam === "community" || tabParam === "messages" ? tabParam : "discover";

  const setTab = (tab: ExploreTab) => {
    setSearchParams({ tab }, { replace: true });
  };

  const [globalQuery, setGlobalQuery] = useState("");
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalResults, setGlobalResults] = useState<SearchHit[]>([]);

  const [friendshipByUsername, setFriendshipByUsername] = useState<
    Record<string, FriendshipStateApi | null | undefined>
  >({});
  const [providerMetaBySlug, setProviderMetaBySlug] = useState<
    Record<string, { ownerUserId: string | null; following: boolean | null }>
  >({});

  type MessageRow = {
    id: string;
    conversationId: string;
    content: string;
    createdAt: string;
    senderId: string;
    unreadCount?: number;
  };

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [participantId, setParticipantId] = useState("");
  const [firstMessage, setFirstMessage] = useState("");

  const [quickMessageOpen, setQuickMessageOpen] = useState(false);
  const [quickMessageParticipantId, setQuickMessageParticipantId] = useState<string | null>(null);
  const [quickMessageTargetLabel, setQuickMessageTargetLabel] = useState<string>("");
  const [quickMessageText, setQuickMessageText] = useState("");
  const [quickMessageSending, setQuickMessageSending] = useState(false);

  const [feedLoading, setFeedLoading] = useState(true);
  const [feedPosts, setFeedPosts] = useState<SocialPost[]>([]);

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

  const refreshFriendship = async (username: string) => {
    const fs = await getFriendshipStateByUsername(username);
    setFriendshipByUsername((prev) => ({ ...prev, [username]: fs }));
  };

  const refreshProviderMeta = async (slug: string) => {
    const provider = await fetchPublicProviderBySlug(slug);
    const ownerUserId = provider.ownerUserId ?? null;
    if (!ownerUserId) {
      setProviderMetaBySlug((prev) => ({ ...prev, [slug]: { ownerUserId: null, following: null } }));
      return;
    }
    const graph = await getSocialGraphState(ownerUserId);
    setProviderMetaBySlug((prev) => ({
      ...prev,
      [slug]: { ownerUserId, following: graph.following },
    }));
  };

  const categories = [
    { key: "all", label: tt("explore.categories.all", "All") },
    { key: "events", label: tt("explore.categories.events", "Events") },
    { key: "RESTAURANT", label: tt("explore.categories.restaurant", "Restaurant") },
    { key: "CAFE", label: tt("explore.categories.cafe", "Cafe") },
    { key: "ATTRACTION", label: tt("explore.categories.attraction", "Attraction") },
    { key: "MUSEUM", label: tt("explore.categories.museum", "Museum") },
    { key: "PARK", label: tt("explore.categories.park", "Park") },
    { key: "HISTORICAL", label: tt("explore.categories.historical", "Historical") },
  ];
  const activeCategoryLabel = useMemo(
    () =>
      categories.find((category) => category.key === activeCategory)?.label ??
      tt("explore.categories.all", "All"),
    [activeCategory, categories, tt],
  );

  useEffect(() => {
    const q = globalQuery.trim();
    if (!q) {
      setGlobalResults([]);
      setGlobalLoading(false);
      return;
    }

    let active = true;
    setGlobalLoading(true);

    const handle = window.setTimeout(async () => {
      try {
        const res = await globalSearch(q, 6);
        if (!active) return;
        setGlobalResults(Array.isArray(res.items) ? res.items : []);
      } catch (error) {
        if (!active) return;
        toast.error(
          getApiErrorMessage(
            error,
            t("explore.search.failed", { defaultValue: "Search failed" }),
          ),
        );
        setGlobalResults([]);
      } finally {
        if (active) setGlobalLoading(false);
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, [globalQuery, t]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const usernames = Array.from(
      new Set(
        globalResults
          .map((r) => (r.type === "user" ? parseUserUsernameFromHref(r.href) : null))
          .filter((x): x is string => Boolean(x)),
      ),
    );
    if (!usernames.length) return;

    let active = true;
    void (async () => {
      await Promise.all(
        usernames.map(async (username) => {
          try {
            const fs = await getFriendshipStateByUsername(username);
            if (!active) return;
            setFriendshipByUsername((prev) => ({ ...prev, [username]: fs }));
          } catch {
            // Ignore per-item failures
          }
        }),
      );
    })();
    return () => {
      active = false;
    };
  }, [globalResults, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const slugs = Array.from(
      new Set(
        globalResults
          .map((r) => (r.type === "provider" ? parseProviderSlugFromHref(r.href) : null))
          .filter((x): x is string => Boolean(x)),
      ),
    );
    if (!slugs.length) return;

    const top = slugs.slice(0, 4);
    let active = true;
    void (async () => {
      await Promise.all(
        top.map(async (slug) => {
          try {
            const provider = await fetchPublicProviderBySlug(slug);
            const ownerUserId = provider.ownerUserId ?? null;
            if (!active) return;
            if (!ownerUserId) {
              setProviderMetaBySlug((prev) => ({ ...prev, [slug]: { ownerUserId: null, following: null } }));
              return;
            }
            const graph = await getSocialGraphState(ownerUserId);
            setProviderMetaBySlug((prev) => ({
              ...prev,
              [slug]: { ownerUserId, following: graph.following },
            }));
          } catch {
            // Ignore
          }
        }),
      );
    })();

    return () => {
      active = false;
    };
  }, [globalResults, isAuthenticated]);

  useEffect(() => {
    if (activeTab !== "community") return;

    let active = true;
    void (async () => {
      try {
        setFeedLoading(true);
        const payload = await fetchSocialFeed("for-you");
        if (!active) return;
        setFeedPosts(Array.isArray(payload) ? payload.slice(0, 10) : []);
      } catch (error) {
        if (!active) return;
        toast.error(
          getApiErrorMessage(
            error,
            t("social.feed.loadFailed", { defaultValue: "Failed to load social feed" }),
          ),
        );
        setFeedPosts([]);
      } finally {
        if (active) setFeedLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [t, activeTab]);

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

      navigate(`/inbox/${conversationId}`);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          tt("social.inbox.createFailed", "Failed to send message"),
        ),
      );
    } finally {
      setQuickMessageSending(false);
    }
  };

  const loadMessages = async () => {
    setMessagesLoading(true);
    try {
      const inboxRows = await fetchInbox();
      const unreadByConversation = new Map(
        (Array.isArray(inboxRows) ? inboxRows : []).map((row: { id: string; unreadCount?: number }) => [
          row.id,
          row.unreadCount ?? 0,
        ]),
      );

      const global = await fetchGlobalMessages({ limit: 30 });
      const merged = (Array.isArray(global) ? global : []).map((msg: any) => ({
        ...msg,
        unreadCount: unreadByConversation.get(msg.conversationId) ?? 0,
      }));

      setMessages(merged);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("social.inbox.loadFailed", { defaultValue: "Failed to load inbox" }),
        ),
      );
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "messages") return;
    if (!isAuthenticated) return;
    void loadMessages();
  }, [activeTab, isAuthenticated]);

  const userHits = useMemo(
    () => globalResults.filter((hit) => hit.type === "user"),
    [globalResults],
  );
  const providerHits = useMemo(
    () => globalResults.filter((hit) => hit.type === "provider"),
    [globalResults],
  );
  const placeHits = useMemo(
    () => globalResults.filter((hit) => hit.type === "place"),
    [globalResults],
  );
  const eventHits = useMemo(
    () => globalResults.filter((hit) => hit.type === "event"),
    [globalResults],
  );

  return (
    <div className="explore-page">
      <div
        className="explore-tabs"
        role="tablist"
        aria-label={tt("explore.tabs.ariaLabel", "Explore tabs")}>
        <button
          id="explore-tab-discover"
          type="button"
          className={`explore-tabs__btn ${activeTab === "discover" ? "active" : ""}`}
          role="tab"
          aria-controls="explore-panel-discover"
          aria-selected={activeTab === "discover"}
          tabIndex={activeTab === "discover" ? 0 : -1}
          onClick={() => setTab("discover")}>
          {tt("explore.tabs.discover", "Discover")}
        </button>
        <button
          id="explore-tab-community"
          type="button"
          className={`explore-tabs__btn ${activeTab === "community" ? "active" : ""}`}
          role="tab"
          aria-controls="explore-panel-community"
          aria-selected={activeTab === "community"}
          tabIndex={activeTab === "community" ? 0 : -1}
          onClick={() => setTab("community")}>
          {tt("explore.tabs.community", "Community")}
        </button>
        <button
          id="explore-tab-messages"
          type="button"
          className={`explore-tabs__btn ${activeTab === "messages" ? "active" : ""}`}
          role="tab"
          aria-controls="explore-panel-messages"
          aria-selected={activeTab === "messages"}
          tabIndex={activeTab === "messages" ? 0 : -1}
          onClick={() => setTab("messages")}>
          {tt("explore.tabs.messages", "Messages")}
        </button>
      </div>

      {activeTab === "discover" ? (
        <div
          id="explore-panel-discover"
          role="tabpanel"
          aria-labelledby="explore-tab-discover">
          {!globalQuery.trim() ? (
            <div className="filter-bar">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category.key}
                  className={activeCategory === category.key ? "active" : ""}
                  onClick={() => setActiveCategory(category.key)}>
                  {category.label}
                </button>
              ))}
            </div>
          ) : null}

        <div className="explore-people-search">
          <h2 className="explore-people-search__title">{tt("explore.search.title", "Search")}</h2>

          <div className="explore-people-search__box">
            <input
              type="search"
              value={globalQuery}
              onChange={(event) => setGlobalQuery(event.target.value)}
              placeholder={tt("explore.search.placeholder", "Search people, providers, places, events...")}
              className="explore-search-input"
            />
          </div>

          {globalQuery.trim() ? (
            <div className="explore-search-results" aria-live="polite">
              {globalLoading ? (
                <p className="explore-search-results__loading">{tt("explore.search.loading", "Searching...")}</p>
              ) : null}

              {!globalLoading &&
              userHits.length === 0 &&
              providerHits.length === 0 &&
              placeHits.length === 0 &&
              eventHits.length === 0 ? (
                <div className="explore-empty-state">
                  {tt("explore.search.noResults", "No results")}
                </div>
              ) : null}

              {userHits.length > 0 ? (
                <div className="explore-search-results__section">
                  <h3 className="explore-search-results__section-title">{tt("explore.search.people", "People")}</h3>
                  <div className="explore-people-results">
                    {userHits.map((hit) => {
                      const username = parseUserUsernameFromHref(hit.href);
                      if (!username) return null;
                      const fs = friendshipByUsername[username];
                      const state = fs?.state;
                      const targetUserId = fs?.targetUserId ?? null;
                      const canMessage = state === "ACCEPTED" && Boolean(targetUserId);

                      return (
                        <div key={hit.href} className="explore-people-result-row">
                          <div className="explore-people-result-main">
                            <span className="explore-people-avatar">
                              {username.trim().charAt(0).toUpperCase()}
                            </span>
                            <div className="explore-people-result-text">
                              <strong className="explore-people-result-name">{hit.title}</strong>
                              {hit.subtitle ? (
                                <small className="explore-people-result-sub">{hit.subtitle}</small>
                              ) : null}
                            </div>
                          </div>

                          <div className="explore-people-result-actions">
                            {!isAuthenticated ? (
                              <button
                                type="button"
                                className="view-details-btn"
                                onClick={() =>
                                  toast.info(tt("explore.people.login", "Please login to connect"))
                                }>
                                Connect
                              </button>
                            ) : state === "ACCEPTED" ? (
                              <>
                                <span className="explore-people-pill explore-people-pill--muted">
                                  {tt("friends.connected", "Friends")}
                                </span>
                                {canMessage ? (
                                  <button
                                    type="button"
                                    className="explore-people-action-btn explore-people-action-btn--outline"
                                    onClick={() =>
                                      openQuickMessage(targetUserId as string, hit.title)
                                    }>
                                    {tt("social.message", "Message")}
                                  </button>
                                ) : null}
                              </>
                            ) : state === "PENDING_OUTGOING" ? (
                              <span className="explore-people-pill explore-people-pill--muted">
                                {tt("friends.requestSent", "Request sent")}
                              </span>
                            ) : state === "PENDING_INCOMING" ? (
                              <>
                                <button
                                  type="button"
                                  className="explore-people-action-btn"
                                  onClick={async () => {
                                    try {
                                      if (!fs?.requesterId) return;
                                      await acceptFriendship(fs.requesterId);
                                      await refreshFriendship(username);
                                    } catch (error) {
                                      toast.error(
                                        getApiErrorMessage(
                                          error,
                                          tt("friends.acceptFail", "Accept failed"),
                                        ),
                                      );
                                    }
                                  }}>
                                  {tt("friends.accept", "Accept")}
                                </button>
                                <button
                                  type="button"
                                  className="explore-people-action-btn explore-people-action-btn--danger"
                                  onClick={async () => {
                                    try {
                                      if (!fs?.requesterId) return;
                                      await declineFriendship(fs.requesterId);
                                      await refreshFriendship(username);
                                    } catch (error) {
                                      toast.error(
                                        getApiErrorMessage(
                                          error,
                                          tt("friends.declineFail", "Decline failed"),
                                        ),
                                      );
                                    }
                                  }}>
                                  {tt("friends.decline", "Decline")}
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="explore-people-action-btn"
                                onClick={async () => {
                                  try {
                                    await requestFriendship(username);
                                    await refreshFriendship(username);
                                  } catch (error) {
                                    toast.error(
                                      getApiErrorMessage(
                                        error,
                                        tt("friends.requestFail", "Request failed"),
                                      ),
                                    );
                                  }
                                }}>
                                {tt("friends.add", "Add friend")}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {providerHits.length > 0 ? (
                <div className="explore-search-results__section">
                  <h3 className="explore-search-results__section-title">{tt("explore.search.providers", "Providers")}</h3>
                  <div className="explore-people-results">
                    {providerHits.map((hit) => {
                      const slug = parseProviderSlugFromHref(hit.href);
                      if (!slug) return null;
                      const meta = providerMetaBySlug[slug];
                      const ownerUserId = meta?.ownerUserId ?? null;
                      const following = meta?.following ?? null;
                      const canMessage = following === true && Boolean(ownerUserId);

                      return (
                        <div key={hit.href} className="explore-people-result-row">
                          <div className="explore-people-result-main">
                            <span className="explore-people-avatar explore-people-avatar--accent">
                              {hit.title.trim().charAt(0).toUpperCase()}
                            </span>
                            <div className="explore-people-result-text">
                              <strong className="explore-people-result-name">{hit.title}</strong>
                              {hit.subtitle ? (
                                <small className="explore-people-result-sub">{hit.subtitle}</small>
                              ) : null}
                            </div>
                          </div>

                          <div className="explore-people-result-actions">
                            {!isAuthenticated ? (
                              <button
                                type="button"
                                className="view-details-btn"
                                onClick={() =>
                                  toast.info(tt("explore.people.login", "Please login to connect"))
                                }>
                                Follow
                              </button>
                            ) : following === true ? (
                              <>
                                <button
                                  type="button"
                                  className="explore-people-action-btn explore-people-action-btn--outline"
                                  disabled={!ownerUserId}
                                  onClick={async () => {
                                    try {
                                      if (!ownerUserId) return;
                                      await unfollowUser(ownerUserId);
                                      await refreshProviderMeta(slug);
                                    } catch (error) {
                                      toast.error(
                                        getApiErrorMessage(
                                          error,
                                          tt("social.unfollowFail", "Unfollow failed"),
                                        ),
                                      );
                                    }
                                  }}>
                                  {tt("social.unfollow", "Unfollow")}
                                </button>
                                {canMessage ? (
                                  <button
                                    type="button"
                                    className="explore-people-action-btn explore-people-action-btn--outline"
                                    onClick={() => openQuickMessage(ownerUserId as string, hit.title)}>
                                    {tt("social.message", "Message")}
                                  </button>
                                ) : null}
                              </>
                            ) : (
                              <button
                                type="button"
                                className="explore-people-action-btn"
                                disabled={!ownerUserId}
                                onClick={async () => {
                                  try {
                                    let currentOwnerUserId = ownerUserId;
                                    if (!currentOwnerUserId) {
                                      await refreshProviderMeta(slug);
                                      currentOwnerUserId =
                                        providerMetaBySlug[slug]?.ownerUserId ?? null;
                                    }
                                    if (!currentOwnerUserId) return;
                                    await followUser(currentOwnerUserId);
                                    await refreshProviderMeta(slug);
                                  } catch (error) {
                                    toast.error(
                                      getApiErrorMessage(
                                        error,
                                        tt("social.followFail", "Follow failed"),
                                      ),
                                    );
                                  }
                                }}>
                                {tt("social.follow", "Follow")}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {eventHits.length > 0 ? (
                <div className="explore-search-results__section">
                  <h3 className="explore-search-results__section-title">{tt("explore.search.events", "Events")}</h3>
                  <div className="grid">
                    {eventHits.map((hit) => (
                      <div key={hit.href} className="place-card">
                        <div className="place-image">
                          <img
                            src={hit.imageUrl || getFallbackImage("ATTRACTION")}
                            alt={hit.title}
                            onError={({ currentTarget }) => {
                              currentTarget.onerror = null;
                              currentTarget.src = getFallbackImage("ATTRACTION");
                            }}
                          />
                        </div>
                        <div className="place-content">
                          <h3 className="place-title">{hit.title}</h3>
                          <p className="place-city">
                            <FaMapMarkerAlt className="place-icon" />
                            {hit.subtitle ?? "-"}
                          </p>
                          <p className="place-description">{hit.subtitle ?? "-"}</p>
                          <div className="place-meta">
                            <span className="place-rating">
                              <FaCalendarAlt className="place-star" />
                              -
                            </span>
                            <span className="place-type">{tt("explore.labels.event", "Event")}</span>
                          </div>
                          <button type="button" className="view-details-btn" onClick={() => navigate(hit.href)}>
                            {tt("explore.actions.viewDetails", "View details")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {placeHits.length > 0 ? (
                <div className="explore-search-results__section">
                  <h3 className="explore-search-results__section-title">{tt("explore.search.places", "Places")}</h3>
                  <div className="grid">
                    {placeHits.map((hit) => (
                      <div key={hit.href} className="place-card">
                        <div className="place-image">
                          <img
                            src={hit.imageUrl || getFallbackImage("ATTRACTION")}
                            alt={hit.title}
                            onError={({ currentTarget }) => {
                              currentTarget.onerror = null;
                              currentTarget.src = getFallbackImage("ATTRACTION");
                            }}
                          />
                        </div>
                        <div className="place-content">
                          <h3 className="place-title">{hit.title}</h3>
                          <p className="place-city">
                            <FaMapMarkerAlt className="place-icon" />
                            {hit.subtitle ?? "-"}
                          </p>
                          <p className="place-description">{hit.subtitle ?? "-"}</p>
                          <div className="place-meta">
                            <span className="place-rating">
                              <FaStar className="place-star" />
                              -
                            </span>
                            <span className="place-type">{tt("explore.labels.place", "Place")}</span>
                          </div>
                          <button type="button" className="view-details-btn" onClick={() => navigate(hit.href)}>
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
        </div>

        {!globalQuery.trim() ? (loading ? (
          <div className="explore-skeleton-grid" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="explore-skeleton-card" key={index}>
                <div className="explore-skeleton-image" />
                <div className="explore-skeleton-body">
                  <div className="explore-skeleton-line explore-skeleton-line--title" />
                  <div className="explore-skeleton-line explore-skeleton-line--city" />
                  <div className="explore-skeleton-line explore-skeleton-line--description" />
                  <div className="explore-skeleton-line explore-skeleton-line--description-short" />
                  <div className="explore-skeleton-meta">
                    <div className="explore-skeleton-pill" />
                    <div className="explore-skeleton-pill" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredPlaces.length === 0 && events.length === 0 ? (
          <div className="explore-empty-state">
            {tt(
              "explore.emptyStateCategory",
              `No results in ${activeCategoryLabel} category`,
            )}
          </div>
        ) : (
          <>
            {events.length > 0 ? (
              <>
                <h2 className="explore-section-title">{tt("explore.sections.events", "Events")}</h2>
                <div className="grid">
                  {events.map((event) => (
                    <div className="place-card" key={event.id}>
                      <div className="place-image">
                        <img
                          src={event.imageUrl || getFallbackImage("ATTRACTION")}
                          alt={event.title}
                          onError={({ currentTarget }) => {
                            currentTarget.onerror = null;
                            currentTarget.src = getFallbackImage("ATTRACTION");
                          }}
                        />
                      </div>

                      <div className="place-content">
                        <h3 className="place-title">{event.title}</h3>

                        <p className="place-city">
                          <FaMapMarkerAlt className="place-icon" />
                          {event.venue?.city?.name ?? event.venue?.name ?? "-"}
                        </p>
                        <p className="place-description">{event.description}</p>

                        <div className="place-meta">
                          <span className="place-rating">
                            <FaCalendarAlt className="place-star" />
                            {event.startDate ? new Date(event.startDate).toLocaleDateString() : "-"}
                          </span>
                          <span className="place-type">{tt("explore.labels.event", "Event")}</span>
                        </div>
                        <button
                          type="button"
                          className="view-details-btn"
                          onClick={() =>
                            navigate(`/events/${event.slug?.trim() ? event.slug : event.id}`)
                          }>
                          {tt("explore.actions.viewDetails", "View details")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {filteredPlaces.length > 0 ? (
              <>
                <h2 className="explore-section-title">{tt("explore.sections.places", "Places")}</h2>
                <div className="grid">
                  {filteredPlaces.map((place) => (
                    <div className="place-card" key={place.id}>
                      <div className="place-image">
                        <img
                          src={place.imageUrl || getFallbackImage(place.type)}
                          alt={place.name}
                          onError={({ currentTarget }) => {
                            currentTarget.onerror = null;
                            currentTarget.src = getFallbackImage(place.type);
                          }}
                        />
                      </div>

                      <div className="place-content">
                        <h3 className="place-title">{place.name}</h3>

                        <p className="place-city">
                          <FaMapMarkerAlt className="place-icon" />
                          {place.city?.name}
                        </p>
                        <p className="place-description">{place.description}</p>

                        <div className="place-meta">
                          <span className="place-rating">
                            <FaStar className="place-star" />
                            {place.ratingAverage} ({place.ratingCount})
                          </span>
                          <span className="place-type">{place.type}</span>
                        </div>
                        <button
                          type="button"
                          className="view-details-btn"
                          onClick={() =>
                            navigate(`/places/${place.slug?.trim() ? place.slug : place.id}`)
                          }>
                          {tt("explore.actions.viewDetails", "View details")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </>
        )) : null}
        </div>
      ) : null}

      {activeTab === "community" ? (
        <section
          id="explore-panel-community"
          role="tabpanel"
          aria-labelledby="explore-tab-community"
          className="explore-social-section">
          <div className="explore-social-section__header">
            <h2 className="explore-social-section__title">{tt("explore.social.title", "Community Posts")}</h2>
          </div>

          {feedLoading ? (
            <div className="social-loading">{tt("social.feed.loading", "Loading feed...")}</div>
          ) : feedPosts.length === 0 ? (
            <div className="social-empty">{tt("social.feed.empty", "No posts yet.")}</div>
          ) : (
            <div className="social-post-list">
              {feedPosts.map((post) => {
                const authorHref = post.author?.username
                  ? `/u/${encodeURIComponent(post.author.username)}`
                  : `/social/users/${encodeURIComponent(post.authorId)}`;

                return (
                  <article key={post.id} className="social-post-card">
                    <div className="social-post-meta">
                      <strong>
                        <Link to={authorHref}>
                          {post.author?.username ?? tt("social.feed.traveler", "Traveler")}
                        </Link>
                      </strong>
                      <span>{new Date(post.createdAt).toLocaleString()}</span>
                    </div>

                    {post.title ? <h3>{post.title}</h3> : null}
                    {post.body ? <p>{post.body}</p> : null}

                    <div className="social-post-actions">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!isAuthenticated) {
                            toast.info(tt("social.feed.loginFirst", "Please login first"));
                            return;
                          }
                          try {
                            await toggleSocialLike(post.id);
                          } catch (error) {
                            toast.error(
                              getApiErrorMessage(error, tt("social.feed.likeFail", "Like failed")),
                            );
                          }
                        }}>
                        {tt("social.feed.actions.like", "Like")}
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          if (!isAuthenticated) {
                            toast.info(tt("social.feed.loginFirst", "Please login first"));
                            return;
                          }
                          try {
                            await saveSocialPost(post.id);
                            toast.success(tt("social.feed.savedToAccount", "Saved to your account"));
                          } catch (error) {
                            toast.error(
                              getApiErrorMessage(error, tt("social.feed.saveFail", "Save failed")),
                            );
                          }
                        }}>
                        {tt("social.feed.actions.saveCopy", "Save & Copy")}
                      </button>

                      <Link to={`/social/post/${post.id}`}>
                        {tt("social.feed.actions.comments", "Comments")}
                      </Link>

                      <button
                        type="button"
                        onClick={async () => {
                          if (!post.shareSlug) {
                            toast.info(
                              tt(
                                "social.feed.shareUnavailable",
                                "This post has no shareable trip yet",
                              ),
                            );
                            return;
                          }
                          const url = `${window.location.origin}/trip/${post.shareSlug}`;
                          try {
                            await copyTextToClipboard(url);
                            toast.success(tt("social.feed.shareCopied", "Trip link copied"));
                          } catch (error) {
                            toast.error(
                              getApiErrorMessage(error, tt("social.feed.shareFail", "Share failed")),
                            );
                          }
                        }}>
                        {tt("social.feed.actions.share", "Share")}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "messages" ? (
        <section
          id="explore-panel-messages"
          role="tabpanel"
          aria-labelledby="explore-tab-messages"
          className="social-feed-page">
          <h1>{tt("social.messages.title", "Messages")}</h1>

          {!isAuthenticated ? (
            <p className="social-empty">{tt("social.messages.loginRequired", "Please login to view messages")}</p>
          ) : (
            <>
              <article className="social-composer">
                <h3>{t("social.inbox.startConversation", { defaultValue: "Start a conversation" })}</h3>
                <input
                  type="text"
                  placeholder={t("social.inbox.recipientId", { defaultValue: "Recipient user id" })}
                  value={participantId}
                  onChange={(event) => setParticipantId(event.target.value)}
                />
                <textarea
                  placeholder={t("social.inbox.firstMessage", { defaultValue: "Your first message" })}
                  value={firstMessage}
                  onChange={(event) => setFirstMessage(event.target.value)}
                />
                <button
                  type="button"
                  className="explore-primary-btn"
                  disabled={creatingConversation || !participantId.trim() || !firstMessage.trim()}
                  onClick={async () => {
                    try {
                      setCreatingConversation(true);
                      await createConversation({
                        participantIds: [participantId.trim()],
                        firstMessage: firstMessage.trim(),
                      });
                      setParticipantId("");
                      setFirstMessage("");
                      toast.success(t("social.inbox.created", { defaultValue: "Conversation created" }));
                      await loadMessages();
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
                  }}>
                  {creatingConversation
                    ? t("social.inbox.creating", { defaultValue: "Creating..." })
                    : t("social.inbox.createConversation", { defaultValue: "Create conversation" })}
                </button>
              </article>

              {messagesLoading ? (
                <p className="social-loading">
                  {t("social.inbox.loading", { defaultValue: "Loading conversations..." })}
                </p>
              ) : messages.length === 0 ? (
                <p className="social-empty">{t("social.inbox.empty", { defaultValue: "No conversations yet." })}</p>
              ) : (
                <div className="social-post-list">
                  {messages.map((row) => (
                    <Link
                      key={row.id}
                      to={`/inbox/${row.conversationId}`}
                      className="social-post-card">
                      <strong>{row.content}</strong>
                      <small>{new Date(row.createdAt).toLocaleString()}</small>
                      {row.unreadCount && row.unreadCount > 0 ? (
                        <span
                          className="social-feed-header__btn"
                          style={{ paddingInline: 10, minHeight: 28 }}>
                          {t("social.inbox.unreadCount", {
                            defaultValue: "Unread: {{count}}",
                            count: row.unreadCount ?? 0,
                          })}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      ) : null}

      <Modal
        className="explore-quickmessage-modal"
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

export default Explore;
