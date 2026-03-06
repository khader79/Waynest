import { RouterProvider } from "react-router-dom";
import { ConfigProvider } from "antd";
import "./App.css";
import router from "./routes";
import ThemeProvider from "./context/ThemeContext";
import LanguageProvider from "./context/LanguageContext";
import { CookiesProvider } from "react-cookie";

function App() {
  return (
    <>
      <CookiesProvider>
        <ThemeProvider>
          <LanguageProvider>
            <ConfigProvider>
              <RouterProvider router={router} />
            </ConfigProvider>
          </LanguageProvider>
        </ThemeProvider>
      </CookiesProvider>
    </>
  );
}

export default App;
