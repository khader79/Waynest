import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import { getApiErrorMessage } from "@/utils/errors";
import { navigateAfterAuth } from "@/utils/routing";
import { useAuth } from "@/context/AuthContext";
import { loginWithCredentials } from "@/api/auth";
import { resendEmailVerificationCode, verifyEmailCode } from "@/api/auth";

const TIMER_SECONDS = 15 * 60;

export const useEmailVerification = () => {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [remainingSeconds, setRemainingSeconds] = useState(TIMER_SECONDS);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [identifier, setIdentifier] = useState(null);
  const [password, setPassword] = useState(null);
  const [redirectTo, setRedirectTo] = useState(null);

  const inputsRef = useRef([]);
  const timerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const restartTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    setRemainingSeconds(TIMER_SECONDS);
    timerRef.current = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }

          return 0;
        }

        return current - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    const state = location.state;
    if (state?.identifier && state.password) {
      setIdentifier(state.identifier);
      setPassword(state.password);
      setRedirectTo(
        typeof state.redirectTo === "string" ? state.redirectTo : null,
      );
      localStorage.setItem(
        STORAGE_KEYS.pendingLoginCredentials,
        JSON.stringify(state),
      );
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEYS.pendingLoginCredentials);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (parsed.identifier && parsed.password) {
        setIdentifier(parsed.identifier);
        setPassword(parsed.password);
        setRedirectTo(
          typeof parsed.redirectTo === "string" ? parsed.redirectTo : null,
        );
      }
    } catch {
      localStorage.removeItem(STORAGE_KEYS.pendingLoginCredentials);
    }
  }, [location.state]);

  useEffect(() => {
    restartTimer();
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const isCodeComplete =
    digits.every((digit) => digit !== "") && digits.join("").length === 6;

  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const seconds = String(remainingSeconds % 60).padStart(2, "0");

  const updateDigit = (value, index) => {
    let nextValue = value;

    if (nextValue.length > 1 && index === 0) {
      const pastedDigits = nextValue.replace(/\D/g, "").slice(0, 6);
      const nextDigits = ["", "", "", "", "", ""];
      for (let position = 0; position < pastedDigits.length; position += 1) {
        nextDigits[position] = pastedDigits[position];
      }
      setDigits(nextDigits);
      const firstEmptyIndex = nextDigits.findIndex((digit) => digit === "");
      inputsRef.current[firstEmptyIndex === -1 ? 5 : firstEmptyIndex]?.focus();
      return;
    }

    nextValue = nextValue.replace(/\D/g, "");
    if (nextValue.length > 1) {
      nextValue = nextValue.charAt(0);
    }

    const nextDigits = [...digits];
    nextDigits[index] = nextValue;
    setDigits(nextDigits);

    if (nextValue && index < digits.length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (event, index) => {
    const currentValue = digits[index];

    if (event.key === "Backspace" && !currentValue && index > 0) {
      event.preventDefault();
      const nextDigits = [...digits];
      nextDigits[index - 1] = "";
      setDigits(nextDigits);
      inputsRef.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputsRef.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowRight" && index < digits.length - 1) {
      event.preventDefault();
      inputsRef.current[index + 1]?.focus();
      return;
    }

    if (
      !/^\d$/.test(event.key) &&
      event.key !== "Tab" &&
      event.key.length === 1
    ) {
      event.preventDefault();
    }
  };

  const resetCode = () => {
    setDigits(["", "", "", "", "", ""]);
    restartTimer();
    inputsRef.current[0]?.focus();
  };

  const autoLogin = async () => {
    if (!identifier || !password) {
      toast.info("Email verified. Please login with your credentials.");
      navigate("/login");
      return;
    }

    try {
      await loginWithCredentials({ identifier, password });
      const authenticatedUser = await login();
      localStorage.removeItem(STORAGE_KEYS.pendingLoginCredentials);
      const savedRedirect = localStorage.getItem(
        STORAGE_KEYS.pendingAuthRedirect,
      );
      const targetPath =
        redirectTo ||
        (savedRedirect && savedRedirect.trim() ? savedRedirect : null);
      localStorage.removeItem(STORAGE_KEYS.pendingAuthRedirect);
      navigateAfterAuth(navigate, authenticatedUser, targetPath);
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Login failed after verification."),
      );
      navigate("/login");
    }
  };

  const verify = async () => {
    if (!isCodeComplete) {
      toast.error("Please enter the full 6-digit code.");
      return;
    }

    if (remainingSeconds === 0) {
      toast.error("Code expired. Please request a new one.");
      return;
    }

    setIsVerifying(true);
    try {
      await verifyEmailCode(digits.join(""));
      toast.success("Email verified successfully.");
      await autoLogin();
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Failed to verify email. Please try again."),
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const resend = async () => {
    if (!identifier) {
      toast.error("Missing identifier");
      return;
    }

    setIsResending(true);
    try {
      await resendEmailVerificationCode(identifier);
      toast.success("Verification code sent.");
      resetCode();
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Failed to resend verification code."),
      );
    } finally {
      setIsResending(false);
    }
  };

  return {
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
  };
};
