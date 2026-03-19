import type { PropsWithChildren } from "react";
import { ConfigProvider } from "antd";
import { CookiesProvider } from "react-cookie";
import { AuthProvider } from "@/core/providers/AuthContext";
import LanguageProvider from "@/core/providers/LanguageContext";
import ThemeProvider from "@/core/providers/ThemeContext";

export const AppProviders = ({ children }: PropsWithChildren) => (
  <CookiesProvider>
    <ThemeProvider>
      <LanguageProvider>
        <ConfigProvider>
          <AuthProvider>{children}</AuthProvider>
        </ConfigProvider>
      </LanguageProvider>
    </ThemeProvider>
  </CookiesProvider>
);
