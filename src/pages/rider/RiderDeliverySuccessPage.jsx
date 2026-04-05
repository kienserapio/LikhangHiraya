import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { orderApi } from "../../services/api";
import {
  hasRiderDeliverySuccessBeenSeen,
  markRiderDeliverySuccessSeen,
} from "../../services/deliverySuccessState";
import { fetchRiderDashboard } from "../../services/riderApi";
import styles from "./RiderDeliverySuccessPage.module.css";

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value || 0));
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

  const subtotal = Number(rawOrder.subtotal || items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0));
  const deliveryFee = Number(rawOrder.deliveryFee || rawOrder.delivery_fee || 0);
  const total = Number(rawOrder.total || subtotal + deliveryFee);

  return {
    id: orderId,
    status: String(rawOrder.status || "").toUpperCase(),
    deliveredAt: rawOrder.deliveredAt || rawOrder.delivered_at || "",
    subtotal,
    deliveryFee,
    total,
    items,
  };
}

function formatDeliveryDateTime(value) {
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

function shortOrderTag(orderId) {
  const normalized = String(orderId || "").replaceAll("-", "").trim().toUpperCase();
  return normalized ? `#KC-${normalized.slice(0, 5)}` : "#KC-00000";
}

export default function RiderDeliverySuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams();

  const stateOrder = useMemo(
    () => normalizeOrder(location.state?.deliveredOrder || location.state?.order || null),
    [location.state]
  );

  const [order, setOrder] = useState(stateOrder);
  const [riderPayout, setRiderPayout] = useState(null);
  const [isLoading, setIsLoading] = useState(!stateOrder);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadPageData() {
      const normalizedOrderId = String(orderId || "").trim();
      if (!normalizedOrderId) {
        if (mounted) {
          setIsLoading(false);
        }
        return;
      }

      if (hasRiderDeliverySuccessBeenSeen(normalizedOrderId)) {
        navigate("/rider/dashboard", { replace: true });
        return;
      }

      try {
        const baseOrder =
          stateOrder && String(stateOrder.id) === normalizedOrderId
            ? stateOrder
            : normalizeOrder(await orderApi.getById(normalizedOrderId));

        if (!baseOrder || baseOrder.status !== "DELIVERED") {
          navigate("/rider/dashboard", { replace: true });
          return;
        }

        const riderDashboard = await fetchRiderDashboard();
        const matchingHistory = (riderDashboard?.history || []).find(
          (entry) => String(entry?.orderId || "") === normalizedOrderId
        );

        if (!mounted) {
          return;
        }

        setOrder(baseOrder);
        setRiderPayout(
          matchingHistory && matchingHistory.riderPayout !== undefined
            ? Number(matchingHistory.riderPayout || 0)
            : null
        );
        markRiderDeliverySuccessSeen(normalizedOrderId);
        setError("");
      } catch (loadError) {
        if (!mounted) {
          return;
        }
        setError(loadError?.message || "Unable to load delivery success details.");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadPageData();

    return () => {
      mounted = false;
    };
  }, [navigate, orderId, stateOrder]);

  const itemCount = useMemo(
    () => (order?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [order?.items]
  );

  if (!orderId) {
    return <Navigate to="/rider/dashboard" replace />;
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading delivery success...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <section className={styles.errorCard}>
            <h1>Delivery Successful</h1>
            <p>{error}</p>
            <button type="button" onClick={() => navigate("/rider/dashboard", { replace: true })}>
              Back to Dashboard
            </button>
          </section>
        </main>
      </div>
    );
  }

  if (!order || order.status !== "DELIVERED") {
    return <Navigate to="/rider/dashboard" replace />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.brandRow}>
          <div className={styles.avatar} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8.2" r="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M5.4 18.5c1.5-2.5 3.7-3.7 6.6-3.7 2.9 0 5.1 1.2 6.6 3.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <span className={styles.brandTitle}>Likhang Hiraya</span>
        </div>
        <div className={styles.onlineState}>
          <span aria-hidden="true" />
          Online
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="m7 12.3 3.3 3.3 6.7-7.1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1>Delivery Successful</h1>
          <p>The artisan batch has arrived.</p>
        </section>

        <section className={styles.kpiGrid}>
          <article className={styles.kpiCard}>
            <span>Total Earnings</span>
            <div>
              <strong>{riderPayout === null ? "Processing..." : toPeso(riderPayout)}</strong>
              <small>{`Order Total ${toPeso(order.total)}`}</small>
            </div>
          </article>

          <article className={styles.kpiCard}>
            <span>Order Number</span>
            <div>
              <strong>{shortOrderTag(order.id)}</strong>
              <small>{`Delivered ${formatDeliveryDateTime(order.deliveredAt)}`}</small>
            </div>
          </article>
        </section>

        <section className={styles.summaryCard}>
          <h3>Order Summary</h3>
          <div className={styles.summaryRows}>
            {(order.items || []).map((item) => (
              <div key={item.key} className={styles.summaryRow}>
                <span>{`${item.quantity} ${item.quantity === 1 ? "item" : "items"} · ${item.name}`}</span>
                <strong>{toPeso(item.subtotal)}</strong>
              </div>
            ))}
          </div>

          <div className={styles.totalRows}>
            <div>
              <span>{`Items (${itemCount})`}</span>
              <strong>{toPeso(order.subtotal)}</strong>
            </div>
            <div>
              <span>Delivery Fee</span>
              <strong>{toPeso(order.deliveryFee)}</strong>
            </div>
            <div className={styles.totalRowMain}>
              <span>Total</span>
              <strong>{toPeso(order.total)}</strong>
            </div>
          </div>
        </section>

        <button
          type="button"
          className={styles.dashboardButton}
          onClick={() => navigate("/rider/dashboard", { replace: true })}
        >
          Back to Dashboard
        </button>
      </main>
    </div>
  );
}
