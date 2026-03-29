import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { clearActiveOrders, getActiveOrders, subscribeToActiveOrders } from "../services/activeOrders";
import styles from "./ActiveOrdersDock.module.css";

const statuses = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "RIDER_ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "ARRIVED",
  "DELIVERED",
];

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
}

export default function ActiveOrdersDock() {
  const location = useLocation();
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

    deliveredAlertedRef.current.add(normalizedOrderId);
    window.alert("Order completed successfully.");
    setIsOpen(false);
  }, []);

  useEffect(() => {
    let cleanup = () => {};

    (async () => {
      const ids = await loadOrders();
      cleanup = subscribeToActiveOrders(ids, loadOrders, handleDeliveredOrder);
    })();

    return () => cleanup();
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
                const activeIndex = Math.max(0, statuses.indexOf(order.status));
                const pickedUpAt = order.picked_up_at ? new Date(order.picked_up_at) : null;
                const eta = pickedUpAt ? new Date(pickedUpAt.getTime() + 15 * 60 * 1000) : null;
                const timeFormatter = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" });

                return (
                  <article key={order.id} className={styles.orderCard}>
                    <div className={styles.topLine}>
                      <strong>Order #{order.id.slice(0, 8)}</strong>
                      <span>{order.status.replaceAll("_", " ")}</span>
                    </div>

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

                    {eta && order.status !== "DELIVERED" ? (
                      <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: "0.84rem" }}>
                        Rider picked up your order at {timeFormatter.format(pickedUpAt)}. Estimated arrival: {timeFormatter.format(eta)}
                      </p>
                    ) : null}

                    <div className={styles.stepper}>
                      {statuses.slice(0, 7).map((step, index) => (
                        <div key={step} className={index <= activeIndex ? styles.stepActive : styles.step}>
                          <span className={styles.dot} />
                          <small>{step.replaceAll("_", " ")}</small>
                        </div>
                      ))}
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
