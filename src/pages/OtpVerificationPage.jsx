import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTimer } from "../hooks/useTimer";
import { useAuthStore } from "../store/authStore";
import styles from "./Auth.module.css";

const OTP_LENGTH = 6;

function normalizeOtpType(value) {
  return value === "signup" ? "signup" : "magiclink";
}

export default function OtpVerificationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const otpContextFromStore = useAuthStore((state) => state.otpContext);
  const verifyOtpCode = useAuthStore((state) => state.verifyOtpCode);
  const resendOtp = useAuthStore((state) => state.resendOtp);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [localError, setLocalError] = useState("");
  const [notice, setNotice] = useState("");
  const [autoSubmittedCode, setAutoSubmittedCode] = useState("");
  const inputRefs = useRef([]);

  const { secondsLeft, formatted, restart } = useTimer(300);

  const mergedContext = useMemo(() => {
    const fromState = location.state && typeof location.state === "object" ? location.state : null;
    if (fromState?.email) {
      return {
        ...(otpContextFromStore || {}),
        ...fromState,
      };
    }
    return otpContextFromStore || fromState || null;
  }, [location.state, otpContextFromStore]);

  const email = String(mergedContext?.email || "").trim().toLowerCase();
  const otpType = normalizeOtpType(mergedContext?.otpType);
  const isPasswordResetFlow = mergedContext?.purpose === "password-reset";

  const otpCode = digits.join("");
  const isCompleteCode = digits.every((digit) => digit.length === 1);
  const canResend = secondsLeft <= 240;

  useEffect(() => {
    if (!isCompleteCode || otpCode.length !== OTP_LENGTH) {
      setAutoSubmittedCode("");
    }
  }, [isCompleteCode, otpCode]);

  useEffect(() => {
    if (!isCompleteCode || isLoading) {
      return;
    }
    if (autoSubmittedCode === otpCode) {
      return;
    }

    setAutoSubmittedCode(otpCode);
    void handleVerify(otpCode);
  }, [autoSubmittedCode, isCompleteCode, isLoading, otpCode]);

  async function handleVerify(overrideCode) {
    const token = String(overrideCode || otpCode || "").trim();
    if (token.length !== OTP_LENGTH) {
      setLocalError("Please enter the complete 6-digit code.");
      return;
    }

    if (isPasswordResetFlow) {
      navigate("/reset-password", { state: { email } });
      return;
    }

    try {
      setLocalError("");
      setNotice("");
      const nextRoute = await verifyOtpCode({ email, token, otpType });
      navigate(nextRoute || "/home", { replace: true });
    } catch (error) {
      setLocalError(error.message || "Invalid or expired OTP code.");
    }
  }

  function handleDigitChange(index, rawValue) {
    const value = String(rawValue || "").replace(/\D/g, "").slice(-1);
    setLocalError("");
    setNotice("");

    setDigits((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, event) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) {
      return;
    }

    event.preventDefault();

    const nextDigits = Array(OTP_LENGTH)
      .fill("")
      .map((_, index) => pasted[index] || "");

    setDigits(nextDigits);

    const nextFocusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[nextFocusIndex]?.focus();
  }

  async function handleResend() {
    if (!canResend) {
      return;
    }

    if (isPasswordResetFlow) {
      setNotice("Please request a new reset OTP from the Forgot Password page.");
      return;
    }

    try {
      setLocalError("");
      await resendOtp({ email, otpType });
      setNotice("A new OTP code has been sent to your Gmail inbox.");
      setDigits(Array(OTP_LENGTH).fill(""));
      restart(300);
      inputRefs.current[0]?.focus();
    } catch (error) {
      setLocalError(error.message || "Unable to resend OTP code.");
    }
  }

  if (!email) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={styles.wrap}>
      <div className={`${styles.decorationContainer} ${styles.headerDecoration}`} aria-hidden="true">
        <svg className={styles.decorationSvg} preserveAspectRatio="none" viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,0 L500,0 L500,100 C420,160 300,50 180,130 C100,180 40,110 0,160 Z" fill="#a68f82" />
        </svg>
        <img className={styles.placeholderPattern} src="/assets/Background.png" alt="" />
      </div>

      <div className={`${styles.decorationContainer} ${styles.footerDecoration}`} aria-hidden="true">
        <svg className={styles.decorationSvg} preserveAspectRatio="none" viewBox="0 0 500 150" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,150 L500,150 L500,60 C420,120 300,10 180,90 C100,140 40,70 0,120 Z" fill="#a68f82" />
        </svg>
        <img className={styles.placeholderPattern} src="/assets/Background.png" alt="" />
      </div>

      <main className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.welcomeTitle}>Verify Your OTP</h1>
          <p className={`${styles.subtitle} ${styles.loginHeaderSubtitle}`}>
            Enter the 6-digit code sent to <strong>{email}</strong>
          </p>
        </header>

        <div className={styles.card}>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void handleVerify();
            }}
          >
            <div className={styles.otpInputGroup} onPaste={handlePaste}>
              {digits.map((digit, index) => (
                <input
                  key={`otp-${index}`}
                  ref={(node) => {
                    inputRefs.current[index] = node;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  className={styles.otpInput}
                  value={digit}
                  onChange={(event) => handleDigitChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  aria-label={`OTP digit ${index + 1}`}
                />
              ))}
            </div>

            <p className={styles.otpTimerText}>Code expires in: {formatted}</p>
            <p className={styles.otpHint}>Resend will be available in the first 60 seconds to avoid spam protection limits.</p>

            {localError ? <p className={styles.error}>{localError}</p> : null}
            {notice ? <p className={styles.successText}>{notice}</p> : null}

            <div className={styles.otpActionsRow}>
              <button className={styles.submit} type="submit" disabled={isLoading}>
                {isLoading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                className={styles.resendButton}
                disabled={!canResend || isLoading}
                onClick={handleResend}
              >
                Resend Code
              </button>
            </div>
          </form>

          <div className={styles.row}>
            <span className={styles.forgotLink}>Need a different login?</span>
            <Link className={styles.link} to="/login">Back to Sign In</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
