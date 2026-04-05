import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  formatPeso,
  isValidPhilippineMobile,
  loadOnlinePaymentDraft,
  normalizePhilippineMobile,
  updateOnlinePaymentDraft,
} from "../services/paymentSimulation";
import "./GcashLoginPage.css";

export default function GcashLoginPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => loadOnlinePaymentDraft());
  const [mobileNumber, setMobileNumber] = useState(() => normalizePhilippineMobile(draft?.gcashMobile || ""));
  const [error, setError] = useState("");

  const amountDueLabel = useMemo(() => formatPeso(draft?.total || 0), [draft?.total]);

  if (!draft) {
    return <Navigate to="/create-order" replace />;
  }

  function handleNumberChange(event) {
    const normalized = normalizePhilippineMobile(event.target.value).slice(0, 10);
    setMobileNumber(normalized);
    if (error) {
      setError("");
    }
  }

  function handleNext() {
    if (!isValidPhilippineMobile(mobileNumber)) {
      setError("Enter a valid Philippine mobile number.");
      return;
    }

    const nextDraft = updateOnlinePaymentDraft({
      gcashMobile: normalizePhilippineMobile(mobileNumber),
      loginStartedAt: new Date().toISOString(),
    });

    setDraft(nextDraft || draft);
    navigate("/payment/gcash/pin");
  }

  return (
    <div className="gcash-page gcash-login-page">
      <header className="gcash-topbar">
        <button type="button" className="gcash-topbar-back" aria-label="Back to create order" onClick={() => navigate("/create-order")}> 
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14.8 6.5 9.3 12l5.5 5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="gcash-topbar-title">GCash Login</h1>
        <div className="gcash-topbar-icon" aria-hidden="true" />
      </header>

      <main className="gcash-main">
        <section className="gcash-login-merchant">
          <p className="gcash-login-label">Merchant</p>
          <h2 className="gcash-login-brand">{draft.merchantName || "Likhang Hiraya"}</h2>
          <div className="gcash-login-amount-wrap">
            <p className="gcash-muted">Amount Due</p>
            <p className="gcash-login-amount">{amountDueLabel}</p>
          </div>
        </section>

        <section className="gcash-login-form">
          <label className="gcash-login-input-label" htmlFor="gcashMobileNumber">Mobile number</label>
          <div className="gcash-mobile-field">
            <span className="gcash-mobile-prefix">+63</span>
            <input
              id="gcashMobileNumber"
              className="gcash-mobile-input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="9XX XXX XXXX"
              value={mobileNumber}
              onChange={handleNumberChange}
              maxLength={10}
            />
          </div>

          {error ? <p className="gcash-inline-error">{error}</p> : null}

          <p className="gcash-login-disclaimer">
            By clicking Next, you agree to {draft.merchantName || "Likhang Hiraya"} and GCash payment terms.
          </p>

          <button type="button" className="gcash-primary-btn" onClick={handleNext}>
            Next
          </button>
        </section>

        <section className="gcash-login-security" aria-hidden="true">
          <p>Secure Connection</p>
          <div className="gcash-login-dots">
            <span />
            <span />
            <span />
          </div>
        </section>
      </main>
    </div>
  );
}
