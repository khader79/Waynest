import React, { useEffect, useRef, useState } from "react";
import "./VerifyEmail.css";
import { useNavigate, useLocation } from "react-router-dom";
import { postJson } from "../../../../api/apiService";
import { EMAIL_VERIFICATION_ENDPOINTS, AUTH_ENDPOINTS } from "../../../../api/endpoints";
import { toast } from "react-toastify";
import apiClient from "../../../../api/apiClient";

const TIMER_SECONDS = 15 * 60; // 15 minutes

const VerifyEmail: React.FC = () => {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(TIMER_SECONDS);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const timerRef = useRef<number | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);

  useEffect(() => {
    // read pending credentials from navigation state
    const state = location.state as { identifier?: string; password?: string } | null;
    if (state?.identifier && state?.password) {
      setIdentifier(state.identifier);
      setPassword(state.password);
      localStorage.setItem(
        "pending_login_credentials",
        JSON.stringify({ identifier: state.identifier, password: state.password },
        ),
      );
    } else {
      // fallback to localStorage if user refreshed
      const stored = localStorage.getItem("pending_login_credentials");
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as { identifier?: string; password?: string };
          if (parsed.identifier && parsed.password) {
            setIdentifier(parsed.identifier);
            setPassword(parsed.password);
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  }, [location.state]);

  useEffect(() => {
    // start timer
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    setRemainingSeconds(TIMER_SECONDS);
    timerRef.current = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // focus first input on mount
    if (inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, []);

  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const seconds = String(remainingSeconds % 60).padStart(2, "0");

  const isCodeComplete = digits.every((d) => d !== "") && digits.join("").length === 6;

  const handleInputChange = (value: string, index: number) => {
    let v = value || "";

    // handle paste of full code into first input
    if (v.length > 1 && index === 0) {
      const onlyDigits = v.replace(/\D/g, "").slice(0, 6);
      const newDigits = ["", "", "", "", "", ""];
      for (let i = 0; i < onlyDigits.length; i++) {
        newDigits[i] = onlyDigits[i];
      }
      setDigits(newDigits);
      const firstEmpty = newDigits.findIndex((d) => d === "");
      const nextIndex = firstEmpty === -1 ? 5 : firstEmpty;
      inputsRef.current[nextIndex]?.focus();
      return;
    }

    v = v.replace(/\D/g, "");
    if (v.length > 1) {
      v = v.charAt(0);
    }

    const newDigits = [...digits];
    newDigits[index] = v;
    setDigits(newDigits);

    if (v && index < digits.length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    const key = e.key;
    const current = digits[index];

    if (key === "Backspace") {
      if (!current && index > 0) {
        e.preventDefault();
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        setDigits(newDigits);
        inputsRef.current[index - 1]?.focus();
      }
      return;
    }

    if (key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
      return;
    }

    if (key === "ArrowRight" && index < digits.length - 1) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
      return;
    }

    if (!/^\d$/.test(key) && key !== "Tab") {
      if (key.length === 1) {
        e.preventDefault();
      }
    }
  };

  const resetCodeAndTimer = () => {
    setDigits(["", "", "", "", "", ""]);
    setRemainingSeconds(TIMER_SECONDS);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    if (inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  };

  const handleVerify = async () => {
    if (!isCodeComplete) {
      toast.error("Please enter the full 6-digit code.");
      return;
    }

    if (remainingSeconds === 0) {
      toast.error("Code expired. Please request a new one.");
      return;
    }

    const code = digits.join("");
    setIsVerifying(true);
    try {
      await postJson(EMAIL_VERIFICATION_ENDPOINTS.VERIFY, { code });
      toast.success("Email verified successfully.");
      await autoLogin();
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to verify email. Please try again.";
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await postJson(EMAIL_VERIFICATION_ENDPOINTS.RESEND, {});
      toast.success("Verification code sent.");
      resetCodeAndTimer();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to resend verification code.";
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  };

  const autoLogin = async () => {
    if (!identifier || !password) {
      toast.info("Email verified. Please login with your credentials.");
      navigate("/login");
      return;
    }

    try {
      // use apiClient directly to keep device fingerprint header behavior
      await apiClient.post(
        AUTH_ENDPOINTS.LOGIN,
        { identifier, password },
      );
      localStorage.removeItem("pending_login_credentials");
      // after successful login, AuthContext will redirect appropriately once login() is called from Protected routes
      navigate("/user-panel");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Login failed after verification.";
      toast.error(message);
      navigate("/login");
    }
  };

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
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              className="digit-input"
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
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
            onClick={handleVerify}
            disabled={isVerifying || !isCodeComplete || remainingSeconds === 0}
          >
            {isVerifying ? "Verifying..." : "Verify Code"}
          </button>
          <button
            className="btn secondary"
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? "Resending..." : "Resend Code"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

