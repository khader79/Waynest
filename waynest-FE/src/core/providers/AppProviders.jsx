
import { ConfigProvider } from "antd";
import { CookiesProvider } from "react-cookie";
import { AuthProvider } from "@/core/providers/AuthContext";
import LanguageProvider from "@/core/providers/LanguageContext";
import ThemeProvider from "@/core/providers/ThemeContext";

export const AppProviders = ({ children }) =>
<CookiesProvider>
    <ThemeProvider>
      <LanguageProvider>
        <ConfigProvider>
          <AuthProvider>{children}</AuthProvider>
        </ConfigProvider>
      </LanguageProvider>
    </ThemeProvider>
  </CookiesProvider>;