import { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./AuthPromptModal.css";

export const AuthPromptModal = ({
  open,
  onClose,
  target = "/account/provider/apply",
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const nextParam = useMemo(() => encodeURIComponent(target), [target]);

  if (!open) return null;

  return (
    <div className="auth-prompt-backdrop" role="dialog" aria-modal="true">
      <div className="auth-prompt-card">
        <button
          className="auth-prompt-close"
          onClick={onClose}
          aria-label="Close">
          ✕
        </button>
        <h3 className="auth-prompt-title">تحتاج لتسجيل الدخول</h3>
        <p className="auth-prompt-body">
          سجّل الدخول أو اصنع حسابًا لتكملة عملية التقديم كمزوّد.
        </p>

        <div className="auth-prompt-actions">
          <button
            type="button"
            className="auth-prompt-btn auth-prompt-btn--login"
            onClick={() => {
              onClose();
              navigate(`/login?next=${nextParam}`, {
                state: { from: location },
              });
            }}>
            تسجيل الدخول
          </button>

          <button
            type="button"
            className="auth-prompt-btn auth-prompt-btn--register"
            onClick={() => {
              onClose();
              navigate(`/register/provider?next=${nextParam}`, {
                state: { from: location },
              });
            }}>
            إنشاء حساب مزوّد
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPromptModal;
