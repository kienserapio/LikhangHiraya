import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { loadOnlinePaymentDraft, updateOnlinePaymentDraft } from "../services/paymentSimulation";
import "./GcashPinPage.css";

const PIN_LENGTH = 4;

const KEYPAD_LAYOUT = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "backspace"];

export default function GcashPinPage() {
  const navigate = useNavigate();
  const [draft] = useState(() => loadOnlinePaymentDraft());
  const [pin, setPin] = useState("");

  const pinSlots = useMemo(
    () => Array.from({ length: PIN_LENGTH }, (_, index) => ({ key: `pin-${index}`, filled: index < pin.length })),
    [pin.length]
  );

  if (!draft) {
    return <Navigate to="/create-order" replace />;
  }

  function handleKeyPress(key) {
    if (key === "backspace") {
      setPin((previous) => previous.slice(0, -1));
      return;
    }

    if (!/^\d$/.test(key)) {
      return;
    }

    setPin((previous) => (previous.length < PIN_LENGTH ? `${previous}${key}` : previous));
  }

  function handleLogin() {
    if (pin.length !== PIN_LENGTH) {
      return;
    }

    updateOnlinePaymentDraft({
      pinVerifiedAt: new Date().toISOString(),
    });

    navigate("/payment/gcash/confirm");
  }

  return (
    <div className="gcash-page gcash-pin-page">
      <header className="gcash-topbar">
        <button type="button" className="gcash-topbar-back" aria-label="Back to GCash login" onClick={() => navigate("/payment/gcash/login")}> 
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14.8 6.5 9.3 12l5.5 5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="gcash-topbar-title">{draft.merchantName || "Likhang Hiraya"}</h1>
        <div className="gcash-topbar-icon" aria-hidden="true" />
      </header>

      <main className="gcash-main gcash-pin-main">
        <section className="gcash-pin-identity">
          <div className="gcash-pin-lock" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M6.5 10.2h11v7.2a1.6 1.6 0 0 1-1.6 1.6H8.1a1.6 1.6 0 0 1-1.6-1.6z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8.9 10.2V8.4a3.1 3.1 0 0 1 6.2 0v1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="gcash-headline">Enter your 4-digit PIN</h2>
          <p className="gcash-muted">Any 4 numbers are accepted for this simulation.</p>
        </section>

        <section className="gcash-pin-visual" aria-live="polite">
          {pinSlots.map((slot) => (
            <span key={slot.key} className={`gcash-pin-dot ${slot.filled ? "gcash-pin-dot-filled" : ""}`.trim()} />
          ))}
        </section>

        <section className="gcash-pin-actions">
          <button type="button" className="gcash-primary-btn" disabled={pin.length !== PIN_LENGTH} onClick={handleLogin}>
            Log in
          </button>
        </section>

        <section className="gcash-pin-keypad" aria-label="PIN keypad">
          {KEYPAD_LAYOUT.map((key, index) => {
            if (!key) {
              return <div key={`empty-${index}`} aria-hidden="true" />;
            }

            if (key === "backspace") {
              return (
                <button
                  key={key}
                  type="button"
                  className="gcash-keypad-btn gcash-keypad-back"
                  onClick={() => handleKeyPress(key)}
                  aria-label="Delete last PIN digit"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M9 8.5h9a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H9l-3.5-3.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="m12.2 10.6 3.6 3.6m0-3.6-3.6 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              );
            }

            return (
              <button
                key={key}
                type="button"
                className="gcash-keypad-btn"
                onClick={() => handleKeyPress(key)}
                aria-label={`PIN digit ${key}`}
              >
                {key}
              </button>
            );
          })}
        </section>
      </main>
    </div>
  );
}
