import { RouterProvider } from "react-router-dom";
import "./App.css";
import router from "./routes";
import ThemeProvider from "./context/ThemeContext";
import LanguageProvider from "./context/LanguageContext";

function App() {
  return (
    <>
      <ThemeProvider>
        <LanguageProvider>
          <RouterProvider router={router} />
        </LanguageProvider>
      </ThemeProvider>
    </>
  );
}

export default App;
