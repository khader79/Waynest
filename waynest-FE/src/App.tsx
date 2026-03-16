import { RouterProvider } from "react-router-dom";
import ThemeProvider from "./context/ThemeContext";
import LanguageProvider from "./context/LanguageContext";
import { CookiesProvider } from "react-cookie";
import { ConfigProvider } from "antd";
import { ToastContainer } from "react-toastify";
import router from "./routes";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import { useDeviceFingerprint } from "./hooks/useDeviceFingerprint";

function App() {
  useDeviceFingerprint();

  return (
    <CookiesProvider>
      <ThemeProvider>
        <LanguageProvider>
          <ConfigProvider>
            <RouterProvider router={router} />
            <ToastContainer
              position="top-right"
              autoClose={3000}
              theme="colored"
              className="custom-toast-container"
            />
          </ConfigProvider>
        </LanguageProvider>
      </ThemeProvider>
    </CookiesProvider>
  );
}

export default App;
