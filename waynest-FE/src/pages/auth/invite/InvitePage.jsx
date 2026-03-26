import { Link, useNavigate } from "react-router-dom";
import { useInviteActivation } from "@/hooks/public/useInviteActivation";
import "./InvitePage.css";

const InvitePage = () => {
  const navigate = useNavigate();
  const { message, status } = useInviteActivation();

  return (
    <div className="invite-page container-center">
      <div className="invite-card">
        {status === "loading" &&
        <>
            <div className="invite-spinner" />
            <p className="invite-message">Activating your device...</p>
          </>
        }

        {status === "success" &&
        <>
            <div className="invite-icon invite-icon--success">✓</div>
            <h1 className="invite-title">Device Activated</h1>
            <p className="invite-message">{message}</p>
            <button className="invite-btn" onClick={() => navigate("/login")}>
              Go to Login
            </button>
          </>
        }

        {status === "error" &&
        <>
            <div className="invite-icon invite-icon--error">✕</div>
            <h1 className="invite-title">Link Invalid</h1>
            <p className="invite-message">{message}</p>
            <Link to="/" className="invite-btn invite-btn--secondary">
              Go to Home
            </Link>
          </>
        }
      </div>
    </div>);

};

export default InvitePage;