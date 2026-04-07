import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { fetchPublicUserCard } from "@/api/public";
import { RouteLoadingState } from "@/components/shared/RouteLoadingState";

/**
 * Old URLs used /social/users/:id. Resolve to canonical /u/:username.
 */
const LegacyUserProfileRedirect = () => {
  const { legacy = "" } = useParams();
  const [target, setTarget] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!legacy) {
      setFailed(true);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const card = await fetchPublicUserCard(legacy);
        if (active) {
          setTarget(card.username);
        }
      } catch {
        if (active) {
          setFailed(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [legacy]);

  if (failed) {
    return <Navigate to="/social" replace />;
  }
  if (!target) {
    return <RouteLoadingState />;
  }
  return <Navigate to={`/u/${encodeURIComponent(target)}`} replace />;
};

export default LegacyUserProfileRedirect;
