import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import { useAuthStore } from "../store/authStore";
import { createActiveOrder } from "../services/activeOrders";
import { createOnlinePaymentDraft, saveOnlinePaymentDraft } from "../services/paymentSimulation";
import "./CreateOrderPage.css";

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);
}

export default function CreateOrderPage() {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const items = useCartStore((state) => state.items);
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);
  const clear = useCartStore((state) => state.clear);
  const subtotal = useCartStore((state) => state.subtotal());
  const total = useCartStore((state) => state.total());
  const profile = useAuthStore((state) => state.profile);
  const isOnlinePayment = paymentMethod === "ONLINE_PAYMENT";
  const canCreateOrder = items.length > 0 && paymentMethod !== "" && !isSubmitting;

  async function handleCreateOrder() {
    if (!canCreateOrder) {
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);
    try {
      if (isOnlinePayment) {
        const onlinePaymentDraft = createOnlinePaymentDraft({
          profile,
          items,
          subtotal,
          total,
          paymentMethod,
        });

        saveOnlinePaymentDraft(onlinePaymentDraft);
        navigate("/payment/gcash/login");
        return;
      }

      const created = await createActiveOrder({
        profile,
        items,
        paymentMethod,
        paymentReferenceNumber: "",
        subtotal,
        total,
      });
      clear();
      navigate("/order-confirmation", { state: { orderId: created.orderId } });
    } catch (error) {
      setSubmitError(error.message || "Unable to create order");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="create-order">
      <main className="create-main">
        <header>
          <button aria-label="Back" className="back-btn" onClick={() => navigate("/cart")}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
        </header>

        <h1 className="order-title">Your Order:</h1>

        <div className="order-list">
          {items.length === 0 ? <p>Your cart is empty.</p> : null}
          {items.map((item) => (
            <div className="order-card" key={item.cartKey || item.id} data-purpose="order-item">
              <div className="order-thumb"><img alt={item.name} src={item.imageUrl || ""} /></div>
              <div className="order-body">
                <div className="order-head">
                  <h2>{item.name}</h2>
                  <div className="rate"><span>★</span> <span>4.8</span></div>
                </div>
                <p className="price">{toPeso(item.pricePhp)}</p>
                <div className="qty">
                  <button className="qty-btn" onClick={() => decrement(item.cartKey || item.id)} aria-label={`Decrease ${item.name}`}>-</button>
                  <span className="qty-value">{item.quantity}</span>
                  <button className="qty-btn" onClick={() => increment(item.cartKey || item.id)} aria-label={`Increase ${item.name}`}>+</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="delivery" data-purpose="delivery-address">
          <span style={{ color: "#b91c1c" }}>📍</span>
          <span>{profile.address || "Manila, Globe St. ABC 123"}</span>
        </div>

        <div data-purpose="payment-section">
          <h3 className="pay-title">Payment method:</h3>
          <div className="pay-box">
            <select
              className="pay-select"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              aria-label="Select payment method"
            >
              <option value="" disabled>Select payment method</option>
              <option value="ONLINE_PAYMENT">Online Payment (GCash)</option>
              <option value="CASH_ON_DELIVERY">Cash on Delivery</option>
            </select>
          </div>

          {isOnlinePayment ? (
            <p className="gcash-flow-note" data-purpose="gcash-flow-note">
              You will complete payment in GCash simulation before your order is submitted.
            </p>
          ) : null}
        </div>

        <div className="total-wrap"><p>Total: {toPeso(total)}</p></div>
        {submitError ? <p style={{ color: "#b91c1c", margin: "6px 0 0", fontWeight: 600 }}>{submitError}</p> : null}
      </main>

      <button
        className={`create-footer ${canCreateOrder ? "" : "disabled"}`}
        onClick={handleCreateOrder}
        disabled={!canCreateOrder}
        aria-disabled={!canCreateOrder}
      >
        <span>{isSubmitting ? (isOnlinePayment ? "Preparing Payment..." : "Creating Order...") : (isOnlinePayment ? "Proceed to GCash" : "Create Order")}</span>
        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
}
