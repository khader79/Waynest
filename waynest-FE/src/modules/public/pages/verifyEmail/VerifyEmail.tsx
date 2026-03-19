import { useEmailVerification } from "../../hooks/useEmailVerification";
import "./VerifyEmail.css";

const VerifyEmail = () => {
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
          <h1>Verify Your Email</h1>
          <p>Enter the 6-digit code sent to your email</p>
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
          <div className="timer expired">Code expired. Request a new one.</div>
        )}

        <div className="buttons">
          <button
            className="btn primary"
            onClick={() => void verify()}
            disabled={isVerifying || !isCodeComplete || remainingSeconds === 0}>
            {isVerifying ? "Verifying..." : "Verify Code"}
          </button>
          <button
            className="btn secondary"
            onClick={() => void resend()}
            disabled={isResending}>
            {isResending ? "Resending..." : "Resend Code"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
