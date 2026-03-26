import { RouterProvider } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "@/context/AuthContext";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import router from "@/router";
import "react-toastify/dist/ReactToastify.css";
import "./styles/app.css";

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
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
