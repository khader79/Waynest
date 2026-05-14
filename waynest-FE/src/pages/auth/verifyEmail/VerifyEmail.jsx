import { useTranslation } from "react-i18next";
import { useEmailVerification } from "@/hooks/public/useEmailVerification";
import "./VerifyEmail.css";

const VerifyEmail = () => {
  const { t } = useTranslation();
  const {
    digits,
    handleKeyDown,
    inputsRef,
    isCodeComplete,
    isResending,
    isVerifying,
    minutes,
    remainingSeconds,
    resend,
    seconds,
    updateDigit,
    verify,
  } = useEmailVerification();

  return (
    <div className="verify-page container-center">
      <div className="verify-card">
        <div className="verify-header">
          <h1>
            {t("verification.title", { defaultValue: "Verify Your Email" })}
          </h1>
          <p>
            {t("verification.subtitle", {
              defaultValue: "Enter the 6-digit code sent to your email",
            })}
          </p>
        </div>

        <div className="digits-wrapper">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputsRef.current[index] = element;
              }}
              className="digit-input"
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(event) => updateDigit(event.target.value, index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            />
          ))}
        </div>

        {remainingSeconds > 0 ? (
          <div className="timer">
            {minutes}:{seconds}
          </div>
        ) : (
          <div className="timer expired">
            {t("verification.expired", {
              defaultValue: "Code expired. Request a new one.",
            })}
          </div>
        )}

        {isCodeComplete && !isVerifying && (
          <div className="auto-verify-message">
            {t("verification.autoVerify", {
              defaultValue: "✓ Code is valid. Verifying automatically...",
            })}
          </div>
        )}

        <div className="buttons">
          <button
            className="btn primary"
            onClick={() => void verify()}
            disabled={isVerifying || !isCodeComplete || remainingSeconds === 0}>
            {isVerifying
              ? t("verification.verifying", { defaultValue: "Verifying..." })
              : t("verification.verifyCode", { defaultValue: "Verify Code" })}
          </button>
          <button
            className="btn secondary"
            onClick={() => void resend()}
            disabled={isResending}>
            {isResending
              ? t("verification.resending", { defaultValue: "Resending..." })
              : t("verification.resendCode", { defaultValue: "Resend Code" })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
