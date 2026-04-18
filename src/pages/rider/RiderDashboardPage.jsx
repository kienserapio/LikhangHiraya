import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  acceptRiderOrder,
  declineRiderOrder,
  fetchRiderDashboard,
  fetchRiderProfile,
  subscribeToRiderOrders,
} from "../../services/riderApi";
import { useNewOrders } from "../../hooks/useNewOrders";
import { useAuthStore } from "../../store/authStore";
import RiderBottomNav from "../../components/rider/RiderBottomNav";
import RiderPageLoader from "../../components/rider/RiderPageLoader";
import { HIRAYA_LOGO_URL } from "../../constants/branding";
import styles from "./RiderDashboard.module.css";

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
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

function getOrderLabel(orderId) {
  const raw = String(orderId || "").trim();
  if (!raw) {
    return "No Order ID";
  }
  return `#${raw.slice(0, 8).toUpperCase()}`;
}

function formatName(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

function firstName(value, fallback) {
  const text = String(value || "").trim();
  if (!text) {
    return fallback;
  }
  return text.split(/\s+/)[0];
}

function getOrderItemCount(order) {
  if (!Array.isArray(order?.items)) {
    return 0;
  }
  return order.items.reduce((total, rawItem) => total + Number(rawItem?.quantity || 0), 0);
}

function getOrderSummary(order) {
  if (!order) {
    return "Awaiting order details";
  }

  const itemCount = getOrderItemCount(order);
  const itemLabel = itemCount === 1 ? "1 item" : `${itemCount} items`;
  const address = formatName(order.customerAddress, "Address not provided");
  return `${itemLabel} • ${address}`;
}

const RIDER_DECLINED_ORDERS_KEY = "lh_rider_declined_pending_orders";

function loadDeclinedPendingOrders() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RIDER_DECLINED_ORDERS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map((value) => String(value)) : [];
  } catch {
    return [];
  }
}

function saveDeclinedPendingOrders(orderIds) {
  localStorage.setItem(RIDER_DECLINED_ORDERS_KEY, JSON.stringify(orderIds));
}

export default function RiderDashboardPage() {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const user = useAuthStore((state) => state.user);
  const [dashboard, setDashboard] = useState(null);
  const [resolvedRiderName, setResolvedRiderName] = useState("");
  const [loading, setLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [declinedOrderIds, setDeclinedOrderIds] = useState(loadDeclinedPendingOrders);

  const pendingOrders = useMemo(() => {
    if (Array.isArray(dashboard?.pendingOrders)) {
      return dashboard.pendingOrders;
    }
    return dashboard?.incomingOrder ? [dashboard.incomingOrder] : [];
  }, [dashboard]);

  const incomingOrder = useMemo(
    () => pendingOrders.find((order) => !declinedOrderIds.includes(String(order?.orderId || ""))) || null,
    [declinedOrderIds, pendingOrders]
  );

  const pendingQueueOrders = useMemo(
    () => pendingOrders.filter((order) => String(order?.orderId || "") !== String(incomingOrder?.orderId || "")),
    [incomingOrder?.orderId, pendingOrders]
  );

  const updateDeclinedOrderIds = useCallback((updater) => {
    setDeclinedOrderIds((previous) => {
      const next = typeof updater === "function" ? updater(previous) : updater;
      saveDeclinedPendingOrders(next);
      return next;
    });
  }, []);

  const riderFirstName = useMemo(
    () => firstName(resolvedRiderName || dashboard?.riderName || profile?.fullName || user?.username, "Rider"),
    [dashboard?.riderName, profile?.fullName, resolvedRiderName, user?.username]
  );

  const shiftLabel = useMemo(() => formatName(dashboard?.workingShift, "Unassigned"), [dashboard?.workingShift]);

  const onlineLabel = useMemo(() => (dashboard?.online ? "Online" : "Offline"), [dashboard?.online]);

  const loadDashboard = useCallback(async () => {
    const next = await fetchRiderDashboard();
    setDashboard(next || null);
  }, []);

  const handleDeclineOrder = useCallback(
    async (orderId) => {
      if (!orderId) {
        return;
      }

      const normalizedOrderId = String(orderId);
      updateDeclinedOrderIds((previous) => {
        if (previous.includes(normalizedOrderId)) {
          return previous;
        }
        return [...previous, normalizedOrderId];
      });

      try {
        await declineRiderOrder(orderId);
      } finally {
        await loadDashboard();
      }
    },
    [loadDashboard, updateDeclinedOrderIds]
  );

  useEffect(() => {
    let mounted = true;
    fetchRiderDashboard()
      .then((next) => {
        if (mounted) {
          setDashboard(next || null);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    fetchRiderProfile()
      .then((nextProfile) => {
        const nextFullName = String(nextProfile?.fullName || "").trim();
        if (!mounted || !nextFullName) {
          return;
        }

        setResolvedRiderName(nextFullName);

        if (String(profile?.fullName || "").trim() !== nextFullName) {
          updateProfile({ fullName: nextFullName });
        }
      })
      .catch(() => {
        // Ignore profile fetch errors here and keep existing fallbacks.
      });

    return () => {
      mounted = false;
    };
  }, [profile?.fullName, updateProfile, user?.username]);

  useEffect(() => {
    if (!incomingOrder) {
      setSecondsLeft(30);
      return undefined;
    }

    setSecondsLeft(30);
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          void handleDeclineOrder(incomingOrder.orderId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [incomingOrder?.orderId, handleDeclineOrder]);

  useEffect(() => {
    const cleanup = subscribeToRiderOrders(loadDashboard);
    return cleanup;
  }, [loadDashboard]);

  useEffect(() => {
    const pendingIds = new Set(pendingOrders.map((order) => String(order?.orderId || "")));
    updateDeclinedOrderIds((previous) => {
      const filtered = previous.filter((orderId) => pendingIds.has(orderId));
      return filtered.length === previous.length ? previous : filtered;
    });
  }, [pendingOrders, updateDeclinedOrderIds]);

  useNewOrders({
    enabled: true,
    onIncoming: () => {
      loadDashboard();
    },
  });

  const timerPercent = useMemo(() => Math.max(0, (secondsLeft / 30) * 100), [secondsLeft]);

  async function handleAcceptOrder(orderId) {
    if (!orderId) {
      return;
    }

    updateDeclinedOrderIds((previous) => previous.filter((value) => value !== String(orderId)));
    await acceptRiderOrder(orderId);
    navigate("/rider/active");
  }

  async function handleAccept() {
    if (!incomingOrder) {
      return;
    }
    await handleAcceptOrder(incomingOrder.orderId);
  }

  async function handleDecline() {
    if (!incomingOrder) {
      return;
    }
    await handleDeclineOrder(incomingOrder.orderId);
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <RiderPageLoader />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <img className={styles.brandLogo} src={HIRAYA_LOGO_URL} alt="Likhang Hiraya" />
          <h1 className={styles.brandName}>Likhang Hiraya</h1>
        </div>
        <div className={styles.onlineStatus} aria-live="polite">
          <span className={`${styles.onlineDot} ${dashboard?.online ? styles.onlineDotActive : ""}`.trim()} aria-hidden="true" />
          {onlineLabel}
        </div>
      </header>

      <main className={styles.main}>
        <section>
          <h2 className={styles.welcomeTitle}>Hello, {riderFirstName}!</h2>
          <p className={styles.welcomeSub}>You're currently on {shiftLabel} shift. Stay ready for incoming deliveries.</p>
        </section>

        <button type="button" className={styles.earningsCard} onClick={() => navigate("/rider/earnings")}>
          <div className={styles.earningsLabelRow}>
            <p className={styles.earningsLabel}>Today's Earnings</p>
            <span>{dashboard?.history?.length || 0} records</span>
          </div>
          <p className={styles.earningsValue}>{toPeso(dashboard?.earnings?.today)}</p>
          <p className={styles.earningsSub}>Tap this card to open earnings and delivery history.</p>
          <div className={styles.earningsMeta}>
            <div className={styles.earningsMetaBadge} aria-hidden="true">
              +
            </div>
            <div>
              <p className={styles.earningsMetaValue}>{dashboard?.earnings?.dailyDeliveries || 0}</p>
              <p className={styles.earningsMetaLabel}>Daily Deliveries</p>
            </div>
          </div>
        </button>

        <section className={styles.cardGrid}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Incoming Delivery</h2>
              <p className={styles.sectionSub}>Newly assigned order requiring your response.</p>
            </div>
          </div>

          {incomingOrder ? (
            <article className={styles.orderCard}>
              <div className={styles.orderCardBody}>
                <div className={styles.orderTop}>
                  <div>
                    <p className={styles.orderCustomer}>{formatName(incomingOrder.customerName, "Customer")}</p>
                    <p className={styles.orderTitle}>Order {getOrderLabel(incomingOrder.orderId)}</p>
                  </div>
                  <p className={styles.orderAmount}>{toPeso(incomingOrder.total)}</p>
                </div>

                <p className={styles.orderMeta}>{getOrderSummary(incomingOrder)}</p>

                <div className={styles.cardGrid}>
                  {(incomingOrder.items || []).map((rawItem, index) => {
                    const item = normalizeRiderItem(rawItem);
                    return (
                      <div key={`${incomingOrder.orderId}-${item.key}-${index}`} className={styles.orderMeta}>
                        {item.quantity}x {item.name} • {toPeso(item.subtotal)}
                      </div>
                    );
                  })}
                </div>

                <div className={styles.orderActions}>
                  <button type="button" className={styles.orderActionDecline} onClick={handleDecline}>
                    Decline
                  </button>
                  <button type="button" className={styles.orderActionAccept} onClick={handleAccept}>
                    Accept Order
                  </button>
                </div>
              </div>

              <div className={styles.timerSection}>
                <div className={styles.timerBase}>
                  <div className={styles.timerFill} style={{ width: `${timerPercent}%` }} />
                </div>
                <p className={styles.timerLabel}>Auto-decline in {secondsLeft}s</p>
              </div>
            </article>
          ) : (
            <div className={styles.emptyCard}>No incoming order right now. Keep your app open to receive new assignments in realtime.</div>
          )}
        </section>

        <section className={styles.pendingSection}>
          <h3>Pending Queue</h3>
          <p>Orders you declined or timed out can still be accepted from this list.</p>

          {pendingQueueOrders.length > 0 ? (
            <div className={styles.cardGrid}>
              {pendingQueueOrders.map((pendingOrder) => (
                <article key={`pending-${pendingOrder.orderId}`} className={styles.orderCard}>
                  <div className={styles.orderCardBody}>
                    <div className={styles.orderTop}>
                      <div>
                        <p className={styles.orderCustomer}>{formatName(pendingOrder.customerName, "Customer")}</p>
                        <p className={styles.orderTitle}>Order {getOrderLabel(pendingOrder.orderId)}</p>
                      </div>
                      <p className={styles.orderAmount}>{toPeso(pendingOrder.total)}</p>
                    </div>

                    <p className={styles.orderMeta}>{getOrderSummary(pendingOrder)}</p>
                    <p className={styles.orderMeta}>Status: {formatName(String(pendingOrder.status || "PENDING").replaceAll("_", " "), "PENDING")}</p>

                    <div className={styles.cardGrid}>
                      {(pendingOrder.items || []).map((rawItem, index) => {
                        const item = normalizeRiderItem(rawItem);
                        return (
                          <div key={`${pendingOrder.orderId}-${item.key}-${index}`} className={styles.orderMeta}>
                            {item.quantity}x {item.name} • {toPeso(item.subtotal)}
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      className={styles.orderActionPending}
                      onClick={() => handleAcceptOrder(pendingOrder.orderId)}
                    >
                      Accept Pending Order
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyCard}>No pending queue at the moment.</div>
          )}
        </section>
      </main>

      <RiderBottomNav />
    </div>
  );
}
