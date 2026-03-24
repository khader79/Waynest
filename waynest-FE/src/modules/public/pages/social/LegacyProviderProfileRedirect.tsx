import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { fetchPublicUserCard } from "@/services/public/publicDirectory.service";
import { RouteLoadingState } from "@/ui/feedback/RouteLoadingState";

/**
 * Old URLs used provider account user id. Resolve business page slug when possible.
 */
const LegacyProviderProfileRedirect = () => {
  const { legacy = "" } = useParams();
  const [path, setPath] = useState<string | null>(null);
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
        if (!active) {
          return;
        }
        if (card.providerSlug) {
          setPath(`/p/${encodeURIComponent(card.providerSlug)}`);
        } else {
          setPath(`/u/${encodeURIComponent(card.username)}`);
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
  if (!path) {
    return <RouteLoadingState />;
  }
  return <Navigate to={path} replace />;
};

export default LegacyProviderProfileRedirect;
