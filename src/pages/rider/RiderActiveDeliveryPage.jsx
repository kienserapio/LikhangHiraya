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

const MISSION_STEPS = [
  { key: "ASSIGNED", label: "Assigned" },
  { key: "PICKUP", label: "Pickup" },
  { key: "TRANSIT", label: "Transit" },
  { key: "DELIVERED", label: "Delivered" },
];
const ESTIMATED_ARRIVAL_MINUTES = 15;

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
}

function mapsLink(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function formatOrderLabel(orderId) {
  const raw = String(orderId || "").trim();
  if (!raw) {
    return "#--------";
  }
  return `#${raw.slice(0, 8)}`;
}

function RiderMissionIcon({ type }) {
  if (type === "check") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5.5 12.5 10 17l8.5-8.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "pickup") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4.5 6.5h15v9.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8 6.5V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "transit") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 12.2 20 5l-6.4 16-2.2-6.2L5.2 12z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "delivered") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3.5 4.5 8v8L12 20.5 19.5 16V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8.6 12.1 10.9 14.4 15.7 9.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "timer") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="13" r="7.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 13V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 13 15 14.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9.2 3.5h5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "person") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8.3" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5.4 18.3c1.55-2.45 3.82-3.65 6.6-3.65 2.78 0 5.05 1.2 6.6 3.65" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "call") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6.2 4.8c.6-.6 1.55-.6 2.15 0l1.7 1.7c.58.58.58 1.52 0 2.1l-1.1 1.1a1 1 0 0 0-.24 1.02c.8 2.2 2.54 3.95 4.74 4.75.36.13.76.04 1.02-.24l1.1-1.1c.58-.58 1.52-.58 2.1 0l1.7 1.7c.6.6.6 1.55 0 2.15l-.6.6c-.95.95-2.34 1.32-3.66.98-7.48-1.94-13.3-7.77-15.25-15.25-.34-1.32.03-2.7.98-3.66z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "location") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 20.5s6-5.44 6-10a6 6 0 1 0-12 0c0 4.56 6 10 6 10z" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="10.5" r="2.3" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (type === "directions") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m3 12 17-7-7 17-2.3-6.7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "update") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4.2 12.1h10.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <path d="m10.7 6.7 5.4 5.4-5.4 5.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return null;
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
  const [isUpdating, setIsUpdating] = useState(false);
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

  const estimatedCompletion = useMemo(() => {
    return `${ESTIMATED_ARRIVAL_MINUTES} minutes`;
  }, []);

  const progressStepIndex = activeOrder ? activeStepFromStatus(activeOrder.status) : 0;
  const progressPercent = ((progressStepIndex + 1) / MISSION_STEPS.length) * 100;

  const isHandoverPending =
    activeOrder?.status === "CONFIRMED"
    || activeOrder?.status === "PREPARING"
    || activeOrder?.status === "RIDER_ASSIGNED";

  const customerDirectionsLink = activeOrder ? mapsLink(activeOrder.customerAddress) : "";
  const cafeDirectionsLink = mapsLink("Likhang Hiraya Cafe, Manila");

  const actionConfig = (() => {
    if (!activeOrder) {
      return null;
    }

    if (activeOrder.status === "PICKED_UP") {
      return {
        navigateLabel: "Navigate to Customer",
        navigateLink: customerDirectionsLink,
        updateLabel: "Start Transit",
        onUpdate: () => startTransit(activeOrder.orderId).then(refresh),
      };
    }

    if (activeOrder.status === "IN_TRANSIT") {
      return {
        navigateLabel: "Navigate to Customer",
        navigateLink: customerDirectionsLink,
        updateLabel: "Confirm Arrival",
        onUpdate: () => confirmArrival(activeOrder.orderId).then(refresh),
      };
    }

    if (activeOrder.status === "ARRIVED") {
      return {
        navigateLabel: "Navigate to Customer",
        navigateLink: customerDirectionsLink,
        updateLabel: "Complete Delivery",
        onUpdate: async () => {
          const deliveredOrder = await completeRiderDelivery(activeOrder.orderId);
          navigate(`/rider/delivery-success/${activeOrder.orderId}`, {
            state: { deliveredOrder },
            replace: true,
          });
        },
      };
    }

    return {
      navigateLabel: "Get Directions to Cafe",
      navigateLink: cafeDirectionsLink,
      updateLabel: "",
      onUpdate: null,
    };
  })();

  async function handleUpdateAction() {
    if (!actionConfig?.onUpdate || isUpdating) {
      return;
    }

    try {
      setIsUpdating(true);
      await actionConfig.onUpdate();
    } finally {
      setIsUpdating(false);
    }
  }

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

  return (
    <div className={`${styles.page} ${styles.activeMissionPage}`}>
      <div className={`${styles.shell} ${styles.activeMissionShell}`}>
        <header className={styles.activeMissionHeader}>
          <div>
            <h1>Active Delivery</h1>
            <p className={styles.activeMissionSubhead}>Order {formatOrderLabel(activeOrder.orderId)}</p>
          </div>
          <button type="button" className={styles.outline} onClick={() => navigate("/rider/dashboard")}>Dashboard</button>
        </header>

        <section className={styles.activeMissionCard}>
          <div className={styles.activeMissionProgressLine} aria-hidden="true">
            <div className={styles.activeMissionProgressTrack}>
              <div className={styles.activeMissionProgressFill} style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className={styles.activeMissionSteps}>
            {MISSION_STEPS.map((step, idx) => {
              const isCompleted = idx < progressStepIndex;
              const isCurrent = idx === progressStepIndex;
              const isActive = idx <= progressStepIndex;

              return (
                <div
                  key={step.key}
                  className={`${styles.activeMissionStep} ${isActive ? styles.activeMissionStepActive : ""}`.trim()}
                >
                  <span
                    className={`${styles.activeMissionStepDot} ${isCompleted ? styles.activeMissionStepDone : ""} ${isCurrent ? styles.activeMissionStepCurrent : ""}`.trim()}
                    aria-hidden="true"
                  >
                    <RiderMissionIcon
                      type={
                        step.key === "ASSIGNED"
                          ? "check"
                          : step.key === "PICKUP"
                            ? "pickup"
                            : step.key === "TRANSIT"
                              ? "transit"
                              : "delivered"
                      }
                    />
                  </span>
                  <span>{step.label}</span>
                </div>
              );
            })}
          </div>

          <div className={styles.activeMissionEtaCard}>
            <span className={styles.activeMissionEtaIcon} aria-hidden="true">
              <RiderMissionIcon type="timer" />
            </span>
            <div>
              <p className={styles.activeMissionEtaLabel}>Expected Completion</p>
              <p className={styles.activeMissionEtaValue}>{estimatedCompletion}</p>
            </div>
          </div>
        </section>

        <section className={styles.activeMissionCard}>
          <div className={styles.activeMissionCustomerHead}>
            <div className={styles.activeMissionCustomerIdentity}>
              <div className={styles.activeMissionCustomerAvatar} aria-hidden="true">
                <RiderMissionIcon type="person" />
              </div>
              <div>
                <h2 className={styles.activeMissionCustomerName}>{activeOrder.customerName}</h2>
                <p className={styles.activeMissionCustomerPhone}>
                  <span className={styles.activeMissionInlineIcon} aria-hidden="true">
                    <RiderMissionIcon type="call" />
                  </span>
                  <span>{activeOrder.customerPhone}</span>
                </p>
              </div>
            </div>
          </div>

          <div className={styles.activeMissionAddressRow}>
            <span className={styles.activeMissionInlineIcon} aria-hidden="true">
              <RiderMissionIcon type="location" />
            </span>
            <div>
              <p className={styles.activeMissionAddressTitle}>{activeOrder.customerAddress}</p>
            </div>
          </div>

          <div className={styles.activeMissionItemsSection}>
            <h3 className={styles.activeMissionItemsHeading}>Order Content</h3>

            <div className={styles.activeMissionItemsList}>
              {(activeOrder.items || []).map((rawItem, index) => {
                const item = normalizeRiderItem(rawItem);
                return (
                  <div className={styles.activeMissionItemRow} key={`${activeOrder.orderId}-${item.key}-${index}`}>
                    <div className={styles.activeMissionItemLeft}>
                      <span className={styles.activeMissionItemQty}>{item.quantity}x</span>
                      <div className={styles.activeMissionItemTextBlock}>
                        <p className={styles.activeMissionItemName}>{item.name}</p>
                      </div>
                    </div>
                    <p className={styles.activeMissionItemPrice}>{toPeso(item.subtotal)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className={styles.activeMissionStickyActions}>
          <div className={styles.activeMissionStickyInner}>
            <button
              type="button"
              className={styles.activeMissionNavigateBtn}
              onClick={() => window.open(actionConfig.navigateLink, "_blank")}
            >
              <span className={styles.activeMissionButtonIcon} aria-hidden="true">
                <RiderMissionIcon type="directions" />
              </span>
              <span>{actionConfig.navigateLabel}</span>
            </button>

            {actionConfig.updateLabel ? (
              <button
                type="button"
                className={styles.activeMissionUpdateBtn}
                onClick={handleUpdateAction}
                disabled={isUpdating}
              >
                <span className={styles.activeMissionButtonIcon} aria-hidden="true">
                  <RiderMissionIcon type="update" />
                </span>
                <span>{isUpdating ? "Updating..." : actionConfig.updateLabel}</span>
              </button>
            ) : null}

            {isHandoverPending ? (
              <div className={styles.activeMissionStatusCard} role="status" aria-live="polite">
                <p className={styles.activeMissionStatusTitle}>Handover Pending</p>
                <p className={styles.activeMissionStatusText}>
                  Please present your Order ID to the barista. Waiting for shop confirmation...
                </p>
              </div>
            ) : null}

            {activeOrder.status === "ARRIVED" ? (
              <div className={styles.activeMissionStatusCard} role="status" aria-live="polite">
                <p className={styles.activeMissionStatusTitle}>Collection Status</p>
                <p className={styles.activeMissionStatusText}>Total to collect: {toPeso(activeOrder.total)}</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
      <RiderBottomNav />
    </div>
  );
}
