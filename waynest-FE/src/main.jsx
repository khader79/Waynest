import { createRoot } from "react-dom/client";
import "./styles/global.css";
import App from "./App";
import "@/core/i18n";

createRoot(document.getElementById("root")).render(<App />);
