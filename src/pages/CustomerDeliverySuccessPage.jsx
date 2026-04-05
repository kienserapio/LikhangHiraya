import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { orderApi } from "../services/api";
import {
  hasCustomerDeliverySuccessBeenSeen,
  markCustomerDeliverySuccessSeen,
} from "../services/deliverySuccessState";
import { supabase } from "../services/supabaseClient";
import "./CustomerDeliverySuccessPage.css";

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value || 0));
}

function formatShortOrderId(orderId) {
  const text = String(orderId || "").replaceAll("-", "").trim().toUpperCase();
  return text ? `#LH-${text.slice(0, 4)}` : "#LH-0000";
}

function formatDateTime(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function normalizeOrder(rawOrder) {
  if (!rawOrder) {
    return null;
  }

  const orderId = String(rawOrder.orderId || rawOrder.id || "").trim();
  if (!orderId) {
    return null;
  }

  const items = (Array.isArray(rawOrder.items) ? rawOrder.items : []).map((item, index) => {
    const quantity = Number(item?.quantity || 0);
    const unitPrice = Number(item?.unitPrice || item?.unit_price || 0);
    const subtotal = Number(item?.subtotal || unitPrice * quantity);

    return {
      key: String(item?.productId || item?.product_id || item?.id || `${orderId}-${index}`),
      name: item?.productName || item?.product_name || item?.name || "Unnamed Item",
      quantity,
      subtotal,
    };
  });

  const computedSubtotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  const subtotal = Number(rawOrder.subtotal || computedSubtotal);
  const deliveryFee = Number(rawOrder.deliveryFee || rawOrder.delivery_fee || 0);
  const total = Number(rawOrder.total || subtotal + deliveryFee);

  return {
    id: orderId,
    status: String(rawOrder.status || "").toUpperCase(),
    deliveredAt: rawOrder.deliveredAt || rawOrder.delivered_at || "",
    createdAt: rawOrder.createdAt || rawOrder.created_at || "",
    subtotal,
    deliveryFee,
    total,
    riderName: String(rawOrder.riderName || rawOrder.rider_name || "").trim(),
    riderPhone: String(rawOrder.riderPhone || rawOrder.rider_phone || "").trim(),
    items,
  };
}

async function hydrateRiderDetails(order) {
  if (!order || !order.id) {
    return order;
  }

  if (order.riderName && order.riderPhone) {
    return order;
  }

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .select("rider_id")
    .eq("id", order.id)
    .maybeSingle();

  if (orderError || !orderRow?.rider_id) {
    return order;
  }

  const { data: riderRow, error: riderError } = await supabase
    .from("users")
    .select("full_name, username, phone")
    .eq("id", orderRow.rider_id)
    .maybeSingle();

  if (riderError || !riderRow) {
    return order;
  }

  return {
    ...order,
    riderName: order.riderName || String(riderRow.full_name || riderRow.username || "").trim(),
    riderPhone: order.riderPhone || String(riderRow.phone || "").trim(),
  };
}

export default function CustomerDeliverySuccessPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadOrder() {
      const normalizedOrderId = String(orderId || "").trim();
      if (!normalizedOrderId) {
        if (mounted) {
          setIsLoading(false);
        }
        return;
      }

      if (hasCustomerDeliverySuccessBeenSeen(normalizedOrderId)) {
        navigate("/home", { replace: true });
        return;
      }

      try {
        const rawOrder = await orderApi.getById(normalizedOrderId);
        const normalizedOrder = normalizeOrder(rawOrder);

        if (!normalizedOrder || normalizedOrder.status !== "DELIVERED") {
          navigate("/home", { replace: true });
          return;
        }

        const hydratedOrder = await hydrateRiderDetails(normalizedOrder);

        if (!mounted) {
          return;
        }

        setOrder(hydratedOrder);
        markCustomerDeliverySuccessSeen(normalizedOrder.id);
        setError("");
      } catch (loadError) {
        if (!mounted) {
          return;
        }
        setError(loadError?.message || "Unable to load delivered order details.");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      mounted = false;
    };
  }, [navigate, orderId]);

  const summaryCount = useMemo(
    () => (order?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [order?.items]
  );

  if (!orderId) {
    return <Navigate to="/home" replace />;
  }

  if (isLoading) {
    return (
      <div className="customer-delivery-page">
        <div className="customer-delivery-loading">Loading delivered order...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="customer-delivery-page">
        <div className="customer-delivery-error-card">
          <h1>Delivery Success</h1>
          <p>{error}</p>
          <button type="button" onClick={() => navigate("/home", { replace: true })}>Back to Home</button>
        </div>
      </div>
    );
  }

  if (!order || order.status !== "DELIVERED") {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="customer-delivery-page">
      <header className="customer-delivery-topbar">
        <button
          type="button"
          className="customer-delivery-back"
          onClick={() => navigate("/home", { replace: true })}
          aria-label="Back to home"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14.8 6.5 9.3 12l5.5 5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1>Delivery Success</h1>
        <div className="customer-delivery-spacer" />
      </header>

      <main className="customer-delivery-main">
        <section className="customer-delivery-hero">
          <div className="customer-delivery-icon-wrap" aria-hidden="true">
            <div className="customer-delivery-icon-core">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="m7 12.3 3.3 3.3 6.7-7.1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <h2>Enjoy your coffee!</h2>
          <p>Your order has been successfully delivered.</p>
        </section>

        <section className="customer-delivery-card">
          <div className="customer-delivery-meta-row">
            <div>
              <span>Order ID</span>
              <p>{formatShortOrderId(order.id)}</p>
            </div>
            <div className="customer-delivery-meta-right">
              <span>Delivered at</span>
              <p>{formatDateTime(order.deliveredAt || order.createdAt)}</p>
            </div>
          </div>

          <div className="customer-delivery-items">
            <h3>Items Delivered</h3>
            {(order.items || []).map((item) => (
              <div key={item.key} className="customer-delivery-item-row">
                <div className="customer-delivery-item-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M6 8.5h9.2v5.6A2.9 2.9 0 0 1 12.3 17H8.9A2.9 2.9 0 0 1 6 14.1z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M15.2 9.6h1.5a2.1 2.1 0 0 1 0 4.2h-1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5.6 18.3h8.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="customer-delivery-item-copy">
                  <p>{item.quantity} {item.quantity === 1 ? "item" : "items"} · {item.name}</p>
                </div>
                <strong>{toPeso(item.subtotal)}</strong>
              </div>
            ))}
          </div>

          <div className="customer-delivery-totals">
            <div>
              <span>Subtotal</span>
              <strong>{toPeso(order.subtotal)}</strong>
            </div>
            <div>
              <span>Delivery Fee</span>
              <strong>{toPeso(order.deliveryFee)}</strong>
            </div>
            <div className="customer-delivery-total-row">
              <span>Total</span>
              <strong>{toPeso(order.total)}</strong>
            </div>
          </div>

          <p className="customer-delivery-summary-count">
            {summaryCount} total {summaryCount === 1 ? "item" : "items"} delivered
          </p>
        </section>

        <section className="customer-delivery-rider-card">
          <div className="customer-delivery-rider-avatar" aria-hidden="true" />
          <div className="customer-delivery-rider-copy">
            <span>Your Courier</span>
            <p>{order.riderName || "Rider information unavailable"}</p>
            <small>{order.riderPhone || "No contact available"}</small>
          </div>
        </section>
      </main>

      <footer className="customer-delivery-footer">
        <button type="button" onClick={() => navigate("/home", { replace: true })}>
          Back to Home
        </button>
      </footer>
    </div>
  );
}
