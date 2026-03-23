import { RouterProvider } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import router from "@/core/router";
import { AppProviders } from "@/core/providers/AppProviders";
import { useDeviceFingerprint } from "@/core/hooks";
import "react-toastify/dist/ReactToastify.css";
import "./styles/app.css";

function App() {
  useDeviceFingerprint();

  return (
    <AppProviders>
      <RouterProvider router={router} />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        theme="colored"
        className="custom-toast-container"
      />
    </AppProviders>
  );
}

export default App;
