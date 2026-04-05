import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { RouterProvider } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import router from "@/router";
import "react-toastify/dist/ReactToastify.css";
import "./styles/app.css";

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

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        theme="colored"
        className="custom-toast-container"
      />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={antTheme}>
        <AuthProvider>
          <NotificationsProvider>
            <AppShell />
          </NotificationsProvider>
        </AuthProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
