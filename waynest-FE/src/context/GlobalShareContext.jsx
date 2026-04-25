import { createContext, useCallback, useContext, useMemo, useState } from "react";
import GlobalShareDialog from "@/components/shared/GlobalShareDialog";

const noop = () => {};

const GlobalShareContext = createContext({
  openShare: noop,
  closeShare: noop,
});

export const GlobalShareProvider = ({ children }) => {
  const [shareState, setShareState] = useState({
    open: false,
    payload: null,
  });

  const openShare = useCallback((payload) => {
    if (!payload || typeof payload !== "object") {
      return;
    }

    setShareState({
      open: true,
      payload,
    });
  }, []);

  const closeShare = useCallback(() => {
    setShareState({
      open: false,
      payload: null,
    });
  }, []);

  const value = useMemo(
    () => ({
      openShare,
      closeShare,
    }),
    [closeShare, openShare],
  );

  return (
    <GlobalShareContext.Provider value={value}>
      {children}
      <GlobalShareDialog
        open={shareState.open}
        payload={shareState.payload}
        onClose={closeShare}
      />
    </GlobalShareContext.Provider>
  );
};

export const useGlobalShare = () => useContext(GlobalShareContext);

