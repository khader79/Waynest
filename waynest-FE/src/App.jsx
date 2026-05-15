import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, App as AntdApp } from "antd";
import { RouterProvider } from "react-router-dom";
import { Suspense, useEffect, useState } from "react";
import i18n, {
  LANGUAGE_STORAGE_KEY,
  applyLanguageToDocument,
  isRtlLanguage,
  normalizeLanguageCode,
} from "./i18n";
import { ToastContainer } from "react-toastify";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { RouteLoadingState } from "@/components/shared/RouteLoadingState";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import router from "@/router";
import "react-toastify/dist/ReactToastify.css";
import "./styles/app.css";
import "./design-system/design-system.css";
import "./styles/premiumExperience.css";

const getToastClassName = ({ type, defaultClassName }) =>
  [defaultClassName, "custom-toast", `custom-toast--${type || "default"}`]
    .filter(Boolean)
    .join(" ");

const getToastBodyClassName = ({ defaultClassName }) =>
  [defaultClassName, "custom-toast-body"].filter(Boolean).join(" ");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const antTheme = {
  token: {
    colorPrimary: "var(--color-primary)",
    colorSuccess: "var(--color-success)",
    colorWarning: "var(--color-warning)",
    colorError: "var(--color-danger)",
    colorInfo: "var(--color-secondary)",
    colorLink: "var(--color-secondary)",
    colorBgBase: "var(--color-bg)",
    colorBgContainer: "var(--panel-surface)",
    colorBgElevated: "var(--panel-surface-strong)",
    colorBgLayout: "var(--color-bg)",
    colorText: "var(--color-text-primary)",
    colorTextBase: "var(--color-text-primary)",
    colorTextSecondary: "var(--color-text-secondary)",
    colorTextDescription: "var(--color-text-secondary)",
    colorBorder: "var(--panel-border)",
    colorBorderSecondary: "var(--panel-border-strong)",
    colorFillAlter: "var(--panel-surface-soft)",
    colorFillSecondary: "var(--panel-surface-soft-2)",
    colorFillTertiary: "var(--panel-surface-transparent)",
    borderRadius: 14,
    borderRadiusLG: 18,
    borderRadiusSM: 10,
  },
  components: {
    Table: {
      headerBg: "var(--panel-surface-strong)",
      headerColor: "var(--panel-text-soft)",
      headerSortActiveBg: "var(--panel-surface-soft)",
      headerSortHoverBg: "var(--panel-surface-soft-2)",
      bodySortBg: "var(--panel-primary-bg-subtle)",
      rowHoverBg: "var(--panel-hover-bg)",
      rowSelectedBg: "var(--panel-primary-bg-soft)",
      rowSelectedHoverBg: "var(--panel-primary-bg-medium)",
      rowExpandedBg: "var(--panel-surface-soft)",
      borderColor: "var(--panel-border-strong)",
      footerBg: "var(--panel-surface-soft)",
      footerColor: "var(--color-text-secondary)",
      headerSplitColor: "var(--panel-border)",
      fixedHeaderSortActiveBg: "var(--panel-surface-soft)",
      headerFilterHoverBg: "var(--panel-hover-bg)",
      filterDropdownBg: "var(--panel-surface-strong)",
      filterDropdownMenuBg: "var(--panel-surface-strong)",
      expandIconBg: "var(--panel-surface-soft)",
      stickyScrollBarBg: "var(--panel-border-strong)",
      cellPaddingBlock: 14,
      cellPaddingInline: 16,
      cellPaddingBlockMD: 12,
      cellPaddingInlineMD: 14,
      cellPaddingBlockSM: 8,
      cellPaddingInlineSM: 10,
    },
    Pagination: {
      itemBg: "var(--panel-surface-soft)",
      itemActiveBg: "var(--color-primary)",
      itemActiveColor: "var(--color-text-inverse)",
      itemActiveColorHover: "var(--color-text-inverse)",
      itemLinkBg: "var(--panel-surface-transparent)",
      itemInputBg: "var(--panel-input-bg)",
      itemActiveBgDisabled: "var(--panel-surface-soft)",
      itemActiveColorDisabled: "var(--panel-text-muted)",
    },
  },
};

function AppShell() {
  useDeviceFingerprint();
  const { user } = useAuth();
  const [isRtl, setIsRtl] = useState(() =>
    isRtlLanguage(i18n.resolvedLanguage || i18n.language),
  );

  useEffect(() => {
    const syncDocumentLanguage = (language) => {
      const nextIsRtl = applyLanguageToDocument(language);
      setIsRtl(nextIsRtl);
    };

    syncDocumentLanguage(i18n.resolvedLanguage || i18n.language);

    const handleLanguageChanged = (language) => {
      syncDocumentLanguage(language);
    };

    i18n.on("languageChanged", handleLanguageChanged);
    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored) {
        const normalized = normalizeLanguageCode(stored);
        if (normalized && normalized !== i18n.language) {
          i18n.changeLanguage(normalized);
        }
      }
    } catch {
      /* ignore */
    }
  }, [user]);

  return (
    <>
      <Suspense fallback={<RouteLoadingState />}>
        <RouterProvider router={router} />
      </Suspense>
      <ToastContainer
        position={isRtl ? "top-left" : "top-right"}
        autoClose={3800}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        draggablePercent={20}
        limit={4}
        rtl={isRtl}
        theme="light"
        className="custom-toast-container"
        toastClassName={getToastClassName}
        bodyClassName={getToastBodyClassName}
        progressClassName="custom-toast-progress"
      />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AntdApp>
          <ConfigProvider theme={antTheme}>
            <AuthProvider>
              <NotificationsProvider>
                <CurrencyProvider>
                  <AppShell />
                </CurrencyProvider>
              </NotificationsProvider>
            </AuthProvider>
          </ConfigProvider>
        </AntdApp>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
