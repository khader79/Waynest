import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter } from "react-router";
import RoutesComponent from "./Routes";
import ChangeThemeProvider from "./Context/ChangeTheme";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ChangeThemeProvider>
        <RoutesComponent />
      </ChangeThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
