import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  completeRiderDelivery,
  confirmArrival,
  fetchRiderDashboard,
  startTransit,
  subscribeToRiderOrders,
} from "../../services/riderApi";
import RiderBottomNav from "../../components/rider/RiderBottomNav";
import RiderPageLoader from "../../components/rider/RiderPageLoader";
import styles from "./RiderPages.module.css";

const steps = ["ASSIGNED", "PICKUP", "TRANSIT", "DELIVERED"];

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
}

function mapsLink(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function normalizeRiderItem(item) {
  const quantity = Number(item?.quantity || 0);
  const unitPrice = Number(item?.unitPrice || item?.unit_price || 0);
  return {
    key: String(item?.productId || item?.product_id || item?.id || "unknown"),
    name: item?.productName || item?.product_name || item?.name || "Unnamed Product",
    quantity,
    subtotal: Number(item?.subtotal || unitPrice * quantity),
  };
}

function activeStepFromStatus(status) {
  if (status === "CONFIRMED" || status === "PREPARING" || status === "RIDER_ASSIGNED") {
    return 0;
  }
  if (status === "PICKED_UP") {
    return 1;
  }
  if (status === "IN_TRANSIT" || status === "ARRIVED") {
    return 2;
  }
  if (status === "DELIVERED") {
    return 3;
  }
  return 0;
}

export default function RiderActiveDeliveryPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const activeOrder = dashboard?.activeOrder || null;

  async function refresh() {
    const data = await fetchRiderDashboard();
    setDashboard(data);
  }

  useEffect(() => {
    let mounted = true;
    fetchRiderDashboard()
      .then((data) => {
        if (mounted) {
          setDashboard(data);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = subscribeToRiderOrders(refresh);
    return cleanup;
  }, []);

  const etaLabel = useMemo(() => {
    if (!activeOrder?.pickedUpAt) {
      return "";
    }
    const pickup = new Date(activeOrder.pickedUpAt);
    const eta = new Date(pickup.getTime() + 15 * 60 * 1000);
    const format = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" });
    return `Picked up at ${format.format(pickup)}. Estimated arrival: ${format.format(eta)}`;
  }, [activeOrder?.pickedUpAt]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <RiderPageLoader />
      </div>
    );
  }

  if (!activeOrder) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.card}>
            <h1 style={{ marginTop: 0 }}>Active Delivery</h1>
            <p className={styles.subtitle}>No assigned mission right now.</p>
            <div className={styles.actions}>
              <button className={styles.primary} onClick={() => navigate("/rider/dashboard")}>Back to Dashboard</button>
            </div>
          </section>
        </div>
        <RiderBottomNav />
      </div>
    );
  }

  const stepIndex = activeStepFromStatus(activeOrder.status);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1>Active Delivery Mission</h1>
            <p className={styles.subtitle}>Order #{activeOrder.orderId.slice(0, 8)} for {activeOrder.customerName}</p>
          </div>
          <button className={styles.outline} onClick={() => navigate("/rider/dashboard")}>Dashboard</button>
        </header>

        <section className={styles.card}>
          <div className={styles.progressWrap}>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
            </div>
          </div>

          <div className={styles.stepper}>
            {steps.map((step, idx) => (
              <div key={step} className={idx <= stepIndex ? styles.stepActive : styles.step}>
                <span className={styles.stepDot} />
                <span>{step}</span>
              </div>
            ))}
          </div>

          <div className={styles.grid} style={{ marginTop: 16 }}>
            <div>
              <p className={styles.label}>Customer</p>
              <p className={styles.value}>{activeOrder.customerName}</p>
            </div>
            <div>
              <p className={styles.label}>Phone</p>
              <p className={styles.value}>{activeOrder.customerPhone}</p>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className={styles.label}>Address</p>
              <p className={styles.value}>{activeOrder.customerAddress}</p>
            </div>
          </div>

          <div className={styles.items}>
            {(activeOrder.items || []).map((rawItem, index) => {
              const item = normalizeRiderItem(rawItem);
              return (
                <div className={styles.item} key={`${activeOrder.orderId}-${item.key}-${index}`}>
                  <span>{item.quantity}x {item.name}</span>
                  <span>{toPeso(item.subtotal)}</span>
                </div>
              );
            })}
          </div>

          {etaLabel ? <p className={styles.subtitle} style={{ marginTop: 12 }}>{etaLabel}</p> : null}

          <div className={styles.actions}>
            {activeOrder.status === "CONFIRMED" || activeOrder.status === "PREPARING" || activeOrder.status === "RIDER_ASSIGNED" ? (
              <>
                <button className={styles.secondary} onClick={() => window.open(mapsLink("Likhang Hiraya Cafe, Manila"), "_blank")}>Get Directions to Cafe</button>
                <div className={styles.handoverPendingCard} role="status" aria-live="polite">
                  <p className={styles.handoverPendingTitle}>Handover Pending</p>
                  <p className={styles.handoverPendingText}>
                    Please present your Order ID to the barista. Waiting for shop confirmation...
                  </p>
                </div>
              </>
            ) : null}

            {activeOrder.status === "PICKED_UP" ? (
              <>
                <button className={styles.secondary} onClick={() => window.open(mapsLink(activeOrder.customerAddress), "_blank")}>Navigate to Customer</button>
                <button className={styles.primary} onClick={() => startTransit(activeOrder.orderId).then(refresh)}>Start Transit</button>
              </>
            ) : null}

            {activeOrder.status === "IN_TRANSIT" ? (
              <>
                <button className={styles.secondary} onClick={() => window.open(mapsLink(activeOrder.customerAddress), "_blank")}>Navigate to Customer</button>
                <button className={styles.primary} onClick={() => confirmArrival(activeOrder.orderId).then(refresh)}>Confirm Arrival</button>
              </>
            ) : null}

            {activeOrder.status === "ARRIVED" ? (
              <>
                <button className={styles.outline}>Total to Collect: {toPeso(activeOrder.total)}</button>
                <button
                  className={styles.primary}
                  onClick={async () => {
                    const deliveredOrder = await completeRiderDelivery(activeOrder.orderId);
                    navigate(`/rider/delivery-success/${activeOrder.orderId}`, {
                      state: { deliveredOrder },
                      replace: true,
                    });
                  }}
                >
                  Complete Delivery
                </button>
              </>
            ) : null}
          </div>
        </section>
      </div>
      <RiderBottomNav />
    </div>
  );
}
