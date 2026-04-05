import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import { createActiveOrder } from "../services/activeOrders";
import {
  clearOnlinePaymentDraft,
  countOrderQuantity,
  formatDateTime,
  formatPeso,
  loadOnlinePaymentDraft,
  summarizeOrderItems,
} from "../services/paymentSimulation";
import "./GcashPaymentSuccessPage.css";

export default function GcashPaymentSuccessPage() {
  const navigate = useNavigate();
  const clearCart = useCartStore((state) => state.clear);

  const [draft] = useState(() => loadOnlinePaymentDraft());
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const amountLabel = useMemo(() => formatPeso(draft?.total || 0), [draft?.total]);
  const dateTimeLabel = useMemo(() => formatDateTime(draft?.paymentCompletedAt || new Date().toISOString()), [draft?.paymentCompletedAt]);
  const summaryLabel = useMemo(() => summarizeOrderItems(draft?.items || []), [draft?.items]);
  const quantityLabel = useMemo(() => countOrderQuantity(draft?.items || []), [draft?.items]);

  if (!draft) {
    return <Navigate to="/create-order" replace />;
  }

  async function handleContinue() {
    setSubmitError("");
    setIsSubmittingOrder(true);

    try {
      const createdOrder = await createActiveOrder({
        profile: draft.profile,
        items: draft.items,
        paymentMethod: draft.paymentMethod || "ONLINE_PAYMENT",
        paymentReferenceNumber: draft.paymentReference || "",
        subtotal: draft.subtotal,
        total: draft.total,
      });

      clearCart();
      clearOnlinePaymentDraft();
      navigate("/order-confirmation", { state: { orderId: createdOrder.orderId } });
    } catch (error) {
      setSubmitError(error.message || "Payment succeeded but order submission failed. Please try again.");
      setIsSubmittingOrder(false);
    }
  }

  return (
    <div className="gcash-page gcash-success-page">
      <header className="gcash-topbar">
        <button type="button" className="gcash-topbar-back" aria-label="Back to payment review" onClick={() => navigate("/payment/gcash/confirm")}> 
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14.8 6.5 9.3 12l5.5 5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="gcash-topbar-title">{draft.merchantName || "Likhang Hiraya"}</h1>
        <div className="gcash-topbar-icon" aria-hidden="true" />
      </header>

      <main className="gcash-main gcash-success-main">
        <section className="gcash-success-status">
          <div className="gcash-success-check" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="m7 12.3 3.3 3.3 6.7-7.1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="gcash-headline">Successfully Paid To <span>{draft.merchantName || "Likhang Hiraya"}</span></h2>
        </section>

        <section className="gcash-card gcash-success-card">
          <p className="gcash-success-total-label">Total Amount</p>
          <h3 className="gcash-success-total">{amountLabel}</h3>

          <div className="gcash-success-grid">
            <div className="gcash-success-row">
              <span>Date/Time</span>
              <strong>{dateTimeLabel}</strong>
            </div>
            <div className="gcash-success-row">
              <span>Payment Method</span>
              <strong>GCash</strong>
            </div>
            <div className="gcash-success-row">
              <span>Reference No.</span>
              <strong className="gcash-reference">{draft.paymentReference || "Generating..."}</strong>
            </div>
          </div>
        </section>

        <section className="gcash-success-summary">
          <div className="gcash-success-summary-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="4.2" y="5.6" width="15.6" height="12.8" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 9.5h8M8 13h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h4>Order Summary</h4>
            <p>{summaryLabel}</p>
            <p className="gcash-success-summary-meta">{quantityLabel} total item{quantityLabel === 1 ? "" : "s"}</p>
          </div>
        </section>

        {submitError ? <p className="gcash-inline-error">{submitError}</p> : null}
      </main>

      <footer className="gcash-success-footer">
        <button type="button" className="gcash-primary-btn" disabled={isSubmittingOrder} onClick={handleContinue}>
          {isSubmittingOrder ? "Submitting Order..." : "Continue"}
        </button>
      </footer>
    </div>
  );
}
