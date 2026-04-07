/** Display name for friend/member rows (API: social-graph/friends). */
export const friendPrimaryName = (peer, fallback = "Traveler") => {
  if (!peer) {
    return fallback;
  }
  const full = `${peer.firstName ?? ""} ${peer.lastName ?? ""}`.trim();
  return full || peer.username || fallback;
};

/**
 * Second line: @handle only when the first line is a real name (avoids "khader" + "@khader").
 * If no username, falls back to role when present.
 */
export const peerSecondaryLine = (peer) => {
  if (!peer) {
    return "";
  }
  const full = `${peer.firstName ?? ""} ${peer.lastName ?? ""}`.trim();
  if (peer.username) {
    if (full && full.toLowerCase() !== peer.username.toLowerCase()) {
      return `@${peer.username}`;
    }
    return "";
  }
  return peer.role ?? "";
};
