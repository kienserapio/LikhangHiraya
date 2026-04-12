import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearActiveOrders, getActiveOrders, subscribeToActiveOrders } from "../services/activeOrders";
import { hasCustomerDeliverySuccessBeenSeen } from "../services/deliverySuccessState";
import styles from "./ActiveOrdersDock.module.css";

const progressSteps = [
  { key: "PENDING", label: "Pending" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "RIDER_ASSIGNED", label: "Rider Assigned" },
  { key: "PICKED_UP", label: "Picked Up" },
  { key: "IN_TRANSIT", label: "In Transit" },
  { key: "ARRIVED", label: "Arrived" },
  { key: "DELIVERED", label: "Delivered" },
];

function statusToProgressIndex(status) {
  const normalized = String(status || "").trim().toUpperCase();
  if (normalized === "PREPARING") {
    return 1;
  }
  const index = progressSteps.findIndex((step) => step.key === normalized);
  return index < 0 ? 0 : index;
}

function formatDateTime(value) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function orderStatusLabel(status) {
  const normalized = String(status || "").trim().toUpperCase();
  const step = progressSteps.find((item) => item.key === normalized);
  if (step) {
    return step.label;
  }
  return normalized ? normalized.replaceAll("_", " ") : "Pending";
}

function buildEtaLabel(order) {
  const normalizedStatus = String(order?.status || "").trim().toUpperCase();

  if (normalizedStatus === "DELIVERED") {
    return "Order delivered successfully.";
  }

  if (order?.picked_up_at) {
    const pickedUpAt = new Date(order.picked_up_at);
    const eta = new Date(pickedUpAt.getTime() + 15 * 60 * 1000);
    const formatter = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" });
    return `Picked up at ${formatter.format(pickedUpAt)}. Estimated arrival: ${formatter.format(eta)}`;
  }

  if (normalizedStatus === "RIDER_ASSIGNED") {
    return "Your rider is heading to the cafe for pickup.";
  }

  if (normalizedStatus === "CONFIRMED" || normalizedStatus === "PREPARING") {
    return "Your order is being prepared.";
  }

  return "Waiting for rider assignment.";
}

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
}

export default function ActiveOrdersDock() {
  const location = useLocation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [orderIds, setOrderIds] = useState([]);
  const [isOpen, setIsOpen] = useState(Boolean(location.state?.openActiveOrders));
  const [isClearing, setIsClearing] = useState(false);
  const latestTrackedOrderIdsRef = useRef(new Set());
  const deliveredAlertedRef = useRef(new Set());

  const loadOrders = useCallback(async () => {
    try {
      const result = await getActiveOrders();
      setOrders(result.orders);
      setOrderIds(result.orderIds);
      return result.orderIds;
    } catch {
      setOrders([]);
      setOrderIds([]);
      return [];
    }
  }, []);

  useEffect(() => {
    latestTrackedOrderIdsRef.current = new Set((orderIds || []).map((id) => String(id)));
  }, [orderIds]);

  const handleDeliveredOrder = useCallback((orderId) => {
    const normalizedOrderId = String(orderId || "");
    if (!normalizedOrderId) {
      return;
    }
    if (!latestTrackedOrderIdsRef.current.has(normalizedOrderId)) {
      return;
    }
    if (deliveredAlertedRef.current.has(normalizedOrderId)) {
      return;
    }
    if (hasCustomerDeliverySuccessBeenSeen(normalizedOrderId)) {
      return;
    }

    deliveredAlertedRef.current.add(normalizedOrderId);
    setIsOpen(false);
    navigate(`/delivery-success/${normalizedOrderId}`, {
      state: { orderId: normalizedOrderId },
    });
  }, [navigate]);

  useEffect(() => {
    let isMounted = true;
    let cleanup = () => {};

    (async () => {
      const ids = await loadOrders();
      if (!isMounted) {
        return;
      }
      cleanup = subscribeToActiveOrders(ids, loadOrders, handleDeliveredOrder);
    })();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [handleDeliveredOrder, loadOrders]);

  const activeCount = useMemo(() => orderIds.length || orders.length, [orderIds.length, orders.length]);
  const productCount = useMemo(
    () => orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0), 0),
    [orders]
  );

  async function handleCancelOrders() {
    setIsClearing(true);
    try {
      await clearActiveOrders();
      await loadOrders();
      setIsOpen(false);
    } finally {
      setIsClearing(false);
    }
  }

  if (activeCount === 0) {
    return null;
  }

  return (
    <>
      <button type="button" className={styles.dock} onClick={() => setIsOpen(true)}>
        <span>View Your Order</span>
        <span className={styles.dockMeta}>{productCount} {productCount === 1 ? "product" : "products"}</span>
      </button>

      {isOpen ? (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Active Orders">
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <h2>Active Orders</h2>
              <button type="button" className={styles.closeButton} onClick={() => setIsOpen(false)}>
                Close
              </button>
            </div>

            <div className={styles.ordersList}>
              {orders.map((order) => {
                const activeIndex = statusToProgressIndex(order.status);
                const riderName = String(order.rider_name || order.riderName || "").trim();
                const riderPhone = String(order.rider_phone || order.riderPhone || "").trim();

                return (
                  <article key={order.id} className={styles.orderCard}>
                    <div className={styles.topLine}>
                      <strong>Order #{order.id.slice(0, 8)}</strong>
                      <span>{orderStatusLabel(order.status)}</span>
                    </div>

                    <p className={styles.metaText}>Placed: {formatDateTime(order.created_at)}</p>

                    <div className={styles.riderPanel}>
                      <div className={styles.riderMeta}>
                        <p className={styles.metaLabel}>Rider</p>
                        <p className={styles.metaValue}>{riderName || "Assigning rider..."}</p>
                      </div>
                      <div className={styles.riderMeta}>
                        <p className={styles.metaLabel}>Contact</p>
                        <p className={styles.metaValue}>{riderPhone || "--"}</p>
                      </div>
                    </div>

                    <p className={styles.etaText}>{buildEtaLabel(order)}</p>

                    <div className={styles.items}>
                      {order.items.map((item) => (
                        <div key={`${order.id}-${item.id}-${item.name}`} className={styles.itemRow}>
                          <p>{item.name}</p>
                          <p>x{item.quantity}</p>
                          <p>{toPeso(item.subtotal)}</p>
                        </div>
                      ))}
                    </div>

                    <div className={styles.totalRow}>
                      <span>Total</span>
                      <strong>{toPeso(order.total)}</strong>
                    </div>

                    <p className={styles.progressText}>Current Status: {orderStatusLabel(order.status)}</p>

                    <div className={styles.progressScroll}>
                      <div className={styles.progressStepper}>
                        {progressSteps.map((step, index) => {
                          const completed = index <= activeIndex;
                          return (
                            <div key={step.key} className={`${styles.progressStep} ${completed ? styles.progressStepActive : ""}`}>
                              <span className={styles.progressDot}>{completed ? "✓" : index + 1}</span>
                              <small>{step.label}</small>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleCancelOrders}
              disabled={isClearing}
            >
              {isClearing ? "Cancelling Orders..." : "Cancel Order"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
