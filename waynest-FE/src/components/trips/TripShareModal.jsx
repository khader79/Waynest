/**
 * TripShareModal — Facebook-style sharing modal.
 *
 * Two tabs:
 * 1. Share to Feed  — post to your Waynest feed (friends or public)
 * 2. Share with Friends — pick a friend, adds trip to their calendar via the platform
 */

import { useState, useEffect, useCallback } from "react";
import { fetchFriends } from "@/api/social";
import { createSocialPost } from "@/api/social";
import { shareTripToCalendar } from "@/api/calendar";
import { publishTripPlan } from "@/api/trips";
import { toast } from "react-toastify";
import styles from "./TripShareModal.module.css";

export default function TripShareModal({
  tripPlan,
  shareTitle,
  setShareTitle,
  publicShareUrl,
  hasShareLink,
  onPublishPlan,
  publishing,
  onClose,
}) {
  const [tab, setTab] = useState("feed");          // "feed" | "friends"
  const [caption, setCaption] = useState(shareTitle || "");
  const [visibility, setVisibility] = useState("FRIENDS");
  const [posting, setPosting] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [sendingTo, setSendingTo] = useState(null);
  const [sentIds, setSentIds] = useState(new Set());

  // Keep parent title in sync
  useEffect(() => {
    if (shareTitle && !caption) setCaption(shareTitle);
  }, [shareTitle]);

  // Load friends when tab switches
  useEffect(() => {
    if (tab !== "friends" || friends.length) return;
    setLoadingFriends(true);
    fetchFriends()
      .then((list) => setFriends(Array.isArray(list) ? list : []))
      .catch(() => toast.error("Could not load friends list"))
      .finally(() => setLoadingFriends(false));
  }, [tab]);

  const handlePostToFeed = useCallback(async () => {
    if (!caption.trim()) { toast.warn("Add a caption first"); return; }
    setPosting(true);
    try {
      // Publish to get a link first (if not already)
      if (!hasShareLink && caption.trim()) {
        setShareTitle?.(caption.trim());
      }
      // Publish the trip
      await onPublishPlan?.();

      const postText = `🗺 ${caption}${publicShareUrl ? `\n🔗 ${publicShareUrl}` : ""}`;
      await createSocialPost({
        content: postText,
        visibility: visibility === "FRIENDS" ? "FRIENDS" : "PUBLIC",
      });
      toast.success(
        visibility === "PUBLIC"
          ? "🌍 Shared publicly on your feed!"
          : "👥 Shared with your friends on your feed!"
      );
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Could not share to feed");
    } finally {
      setPosting(false);
    }
  }, [caption, visibility, hasShareLink, publicShareUrl, onPublishPlan]);

  const getFriendId = (friend) => friend.userId || friend.id;

  const handleSendToFriend = useCallback(async (friend) => {
    if (!tripPlan?.tripPlanId) {
      toast.warn("Save the trip first before sharing with friends.");
      return;
    }
    const friendId = getFriendId(friend);
    if (!friendId) return;
    setSendingTo(friendId);
    try {
      await shareTripToCalendar(tripPlan.tripPlanId, friendId);
      setSentIds((prev) => new Set([...prev, friendId]));
      toast.success(`✅ Trip sent to ${friend.username || friend.displayName || "friend"}!`);
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Could not send trip");
    } finally {
      setSendingTo(null);
    }
  }, [tripPlan?.tripPlanId]);

  const filteredFriends = friends.filter((f) => {
    if (!searchQ.trim()) return true;
    const q = searchQ.toLowerCase();
    return (
      (f.username || "").toLowerCase().includes(q) ||
      (f.displayName || f.name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Share this trip</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Trip name input */}
        <div className={styles.tripNameRow}>
          <input
            type="text"
            className={styles.tripNameInput}
            placeholder="Give your trip a name…"
            value={caption}
            onChange={(e) => { setCaption(e.target.value); setShareTitle?.(e.target.value); }}
            maxLength={100}
          />
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === "feed" ? styles.tabActive : ""}`}
            onClick={() => setTab("feed")}
          >
            📣 Share to Feed
          </button>
          <button
            className={`${styles.tab} ${tab === "friends" ? styles.tabActive : ""}`}
            onClick={() => setTab("friends")}
          >
            👥 Send to Friend
          </button>
        </div>

        {/* ── FEED TAB ── */}
        {tab === "feed" && (
          <div className={styles.tabContent}>
            <p className={styles.hint}>
              Your trip will appear as a post on Waynest — friends or everyone can see it.
            </p>

            {/* Visibility selector */}
            <div className={styles.visRow}>
              <button
                className={`${styles.visBtn} ${visibility === "FRIENDS" ? styles.visBtnActive : ""}`}
                onClick={() => setVisibility("FRIENDS")}
              >
                <span className={styles.visBtnIcon}>👥</span>
                <div>
                  <div className={styles.visBtnLabel}>Friends</div>
                  <div className={styles.visBtnSub}>Only your friends see this</div>
                </div>
              </button>
              <button
                className={`${styles.visBtn} ${visibility === "PUBLIC" ? styles.visBtnActive : ""}`}
                onClick={() => setVisibility("PUBLIC")}
              >
                <span className={styles.visBtnIcon}>🌍</span>
                <div>
                  <div className={styles.visBtnLabel}>Public</div>
                  <div className={styles.visBtnSub}>Anyone on Waynest can see it</div>
                </div>
              </button>
            </div>

            {/* Post preview */}
            <div className={styles.preview}>
              <div className={styles.previewHeader}>Preview</div>
              <p className={styles.previewText}>
                🗺 {caption || "Your trip name…"}
                {publicShareUrl && <><br />🔗 {publicShareUrl}</>}
              </p>
            </div>

            {/* Action row */}
            <div className={styles.actionRow}>
              {hasShareLink && (
                <button
                  className={styles.copyBtn}
                  onClick={() => {
                    navigator.clipboard?.writeText(publicShareUrl || "");
                    toast.success("Link copied!");
                  }}
                >
                  📋 Copy link
                </button>
              )}
              <button
                className={styles.shareBtn}
                onClick={handlePostToFeed}
                disabled={posting || !caption.trim()}
              >
                {posting ? "Sharing…" : `📣 Post to ${visibility === "FRIENDS" ? "Friends" : "Everyone"}`}
              </button>
            </div>

            {/* External quick-share */}
            {hasShareLink && (
              <div className={styles.externalRow}>
                <span className={styles.externalLabel}>Also share via:</span>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`${caption} ${publicShareUrl}`)}`}
                  target="_blank" rel="noreferrer" className={`${styles.extBtn} ${styles.extBtnWa}`}
                >💬 WhatsApp</a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(publicShareUrl)}&text=${encodeURIComponent(caption)}`}
                  target="_blank" rel="noreferrer" className={`${styles.extBtn} ${styles.extBtnTg}`}
                >✈️ Telegram</a>
              </div>
            )}
          </div>
        )}

        {/* ── FRIENDS TAB ── */}
        {tab === "friends" && (
          <div className={styles.tabContent}>
            <p className={styles.hint}>
              Send this trip to a friend — it will be added to their Waynest calendar.
            </p>

            {!tripPlan?.tripPlanId && (
              <div className={styles.saveNotice}>
                ⚠️ Save the trip first to send it to friends.
              </div>
            )}

            <input
              type="text"
              className={styles.friendSearch}
              placeholder="Search friends…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />

            <div className={styles.friendsList}>
              {loadingFriends && (
                <div className={styles.friendsLoading}>
                  <span className={styles.spinner} /> Loading friends…
                </div>
              )}
              {!loadingFriends && filteredFriends.length === 0 && (
                <div className={styles.friendsEmpty}>
                  {searchQ ? "No friends match your search." : "No friends found. Add friends on Waynest!"}
                </div>
              )}
              {filteredFriends.map((f) => {
                const friendId = getFriendId(f);
                const sent = sentIds.has(friendId);
                const sending = sendingTo === friendId;
                const name = f.displayName || f.username || f.name || "Friend";
                const initials = name.slice(0, 2).toUpperCase();
                return (
                  <div key={friendId} className={styles.friendRow}>
                    <div className={styles.friendAvatar}>
                      {f.avatarUrl
                        ? <img src={f.avatarUrl} alt={name} className={styles.friendAvatarImg} />
                        : <span>{initials}</span>
                      }
                    </div>
                    <div className={styles.friendInfo}>
                      <span className={styles.friendName}>{name}</span>
                      {f.username && <span className={styles.friendUsername}>@{f.username}</span>}
                    </div>
                    <button
                      className={`${styles.sendBtn} ${sent ? styles.sendBtnSent : ""}`}
                      onClick={() => !sent && handleSendToFriend(f)}
                      disabled={sending || sent || !tripPlan?.tripPlanId}
                    >
                      {sending ? "⟳" : sent ? "✅ Sent" : "Send"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
