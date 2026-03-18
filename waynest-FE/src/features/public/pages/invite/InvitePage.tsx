import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { postJson } from "../../../../api/apiService";
import { AUTH_ENDPOINTS } from "../../../../api/endpoints";
import "./InvitePage.css";

type Status = "loading" | "success" | "error";

const InvitePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Invalid invite link. No token found.");
      return;
    }

    const fingerprint = localStorage.getItem("device_fingerprint");

    if (!fingerprint) {
      setStatus("error");
      setMessage(
        "Could not detect your device fingerprint. Please try again or use a different browser.",
      );
      return;
    }

    const activate = async () => {
      try {
        await postJson(AUTH_ENDPOINTS.INVITE_JOIN, { token });
        setStatus("success");
        setMessage(
          "Your device has been added successfully. You can now log in.",
        );
      } catch (error: unknown) {
        const msg = (error as { response?: { data?: { message?: string } } })
          ?.response?.data?.message;
        setStatus("error");
        setMessage(
          msg ?? "This invite link has already been used or has expired.",
        );
      }
    };

    void activate();
  }, [navigate, searchParams]);

  return (
    <div className="invite-page container-center">
      <div className="invite-card">
        {status === "loading" && (
          <>
            <div className="invite-spinner" />
            <p className="invite-message">Activating your device…</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="invite-icon invite-icon--success">✓</div>
            <h1 className="invite-title">Device Activated</h1>
            <p className="invite-message">{message}</p>
            <button className="invite-btn" onClick={() => navigate("/login")}>
              Go to Login
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="invite-icon invite-icon--error">✕</div>
            <h1 className="invite-title">Link Invalid</h1>
            <p className="invite-message">{message}</p>
            <Link to="/" className="invite-btn invite-btn--secondary">
              Go to Home
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default InvitePage;
