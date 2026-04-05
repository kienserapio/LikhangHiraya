import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  formatPeso,
  loadOnlinePaymentDraft,
  summarizeOrderItems,
  updateOnlinePaymentDraft,
  generatePaymentReference,
} from "../services/paymentSimulation";
import "./GcashConfirmPaymentPage.css";

export default function GcashConfirmPaymentPage() {
  const navigate = useNavigate();
  const [draft] = useState(() => loadOnlinePaymentDraft());

  const [isPaying, setIsPaying] = useState(false);

  const amountLabel = useMemo(() => formatPeso(draft?.total || 0), [draft?.total]);
  const serviceFeeLabel = useMemo(() => formatPeso(draft?.serviceFee || 0), [draft?.serviceFee]);
  const subtotalLabel = useMemo(() => formatPeso(draft?.subtotal || 0), [draft?.subtotal]);
  const summaryLabel = useMemo(() => summarizeOrderItems(draft?.items || []), [draft?.items]);

  if (!draft) {
    return <Navigate to="/create-order" replace />;
  }

  function handleConfirmPayment() {
    setIsPaying(true);

    updateOnlinePaymentDraft({
      paymentStatus: "SUCCESS",
      paymentCompletedAt: new Date().toISOString(),
      paymentReference: generatePaymentReference(),
      reviewConfirmedAt: new Date().toISOString(),
    });

    navigate("/payment/gcash/success");
  }

  return (
    <div className="gcash-page gcash-confirm-page">
      <header className="gcash-topbar">
        <button type="button" className="gcash-topbar-back" aria-label="Back to PIN screen" onClick={() => navigate("/payment/gcash/pin")}> 
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14.8 6.5 9.3 12l5.5 5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="gcash-topbar-title">{draft.merchantName || "Likhang Hiraya"}</h1>
        <div className="gcash-topbar-icon" aria-hidden="true" />
      </header>

      <main className="gcash-main">
        <section className="gcash-confirm-stepper" aria-label="GCash payment progress">
          <div className="gcash-confirm-step gcash-confirm-step-done">
            <span className="gcash-confirm-dot" />
            <small>Login</small>
          </div>
          <div className="gcash-confirm-line gcash-confirm-line-done" />
          <div className="gcash-confirm-step gcash-confirm-step-done">
            <span className="gcash-confirm-dot" />
            <small>Review</small>
          </div>
          <div className="gcash-confirm-line" />
          <div className="gcash-confirm-step">
            <span className="gcash-confirm-dot" />
            <small>Receipt</small>
          </div>
        </section>

        <section className="gcash-confirm-header">
          <p className="gcash-confirm-eyebrow">Transaction Details</p>
          <h2 className="gcash-headline gcash-confirm-amount">{amountLabel}</h2>
          <p className="gcash-confirm-merchant">{draft.merchantName || "Likhang Hiraya"}</p>
        </section>

        <section className="gcash-card gcash-confirm-info">
          <div className="gcash-confirm-row">
            <span>Merchant</span>
            <strong>{draft.merchantName || "Likhang Hiraya"}</strong>
          </div>
          <div className="gcash-confirm-row">
            <span>Transaction Type</span>
            <strong>Purchase</strong>
          </div>
          <div className="gcash-confirm-row">
            <span>Order Summary</span>
            <strong>{summaryLabel}</strong>
          </div>
          <div className="gcash-confirm-row">
            <span>Item Subtotal</span>
            <strong>{subtotalLabel}</strong>
          </div>
          <div className="gcash-confirm-row">
            <span>Service Fee</span>
            <strong>{serviceFeeLabel}</strong>
          </div>
          <div className="gcash-confirm-row gcash-confirm-total-row">
            <span>Total to Pay</span>
            <strong>{amountLabel}</strong>
          </div>
        </section>

        <p className="gcash-confirm-note">
          Please review all details before proceeding. Payment simulation must be completed before your order is submitted.
        </p>
      </main>

      <footer className="gcash-confirm-footer">
        <button type="button" className="gcash-primary-btn" disabled={isPaying} onClick={handleConfirmPayment}>
          {isPaying ? "Processing..." : `Pay ${amountLabel}`}
        </button>
        <button type="button" className="gcash-cancel-btn" onClick={() => navigate("/create-order")}>Cancel and Return</button>
      </footer>
    </div>
  );
}
