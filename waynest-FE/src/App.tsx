import { RouterProvider } from "react-router-dom";
import ThemeProvider from "./context/ThemeContext";
import LanguageProvider from "./context/LanguageContext";
import { CookiesProvider } from "react-cookie";
import { ConfigProvider } from "antd";
import router from "./routes";
import "./App.css";

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
