import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  acceptRiderOrder,
  declineRiderOrder,
  fetchRiderDashboard,
  subscribeToRiderOrders,
} from "../../services/riderApi";
import { useNewOrders } from "../../hooks/useNewOrders";
import { useAuthStore } from "../../store/authStore";
import styles from "./RiderPages.module.css";

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

export default function RiderDashboardPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const incomingOrder = dashboard?.incomingOrder || null;

  const loadDashboard = useCallback(async () => {
    const next = await fetchRiderDashboard();
    setDashboard({ ...next, online: true });
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchRiderDashboard()
      .then((next) => {
        if (mounted) {
          setDashboard({ ...next, online: true });
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
    if (!incomingOrder) {
      setSecondsLeft(30);
      return;
    }

    setSecondsLeft(30);
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          declineRiderOrder(incomingOrder.orderId).finally(loadDashboard);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [incomingOrder?.orderId]);

  useEffect(() => {
    const cleanup = subscribeToRiderOrders(loadDashboard);
    return cleanup;
  }, [loadDashboard]);

  useNewOrders({
    enabled: true,
    onIncoming: () => {
      loadDashboard();
    },
  });

  const timerPercent = useMemo(() => Math.max(0, (secondsLeft / 30) * 100), [secondsLeft]);

  async function handleAccept() {
    if (!incomingOrder) {
      return;
    }
    await acceptRiderOrder(incomingOrder.orderId);
    navigate("/rider/active");
  }

  if (loading) {
    return <div className={styles.page}><div className={styles.shell}>Loading rider dashboard...</div></div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.headerBrand}>
            <img className={styles.brandLogo} src="/assets/hiraya.png" alt="Likhang Hiraya" />
            <div>
              <h1>Rider Dashboard</h1>
              <p className={styles.subtitle}>
                Waiting for orders...
              </p>
            </div>
          </div>
        </header>

        <section className={styles.earningsCard}>
          <h2>{toPeso(dashboard?.earnings?.today)}</h2>
          <p>Daily Deliveries: {dashboard?.earnings?.dailyDeliveries || 0}</p>
        </section>

        <section className={styles.card}>
          <strong>Shift: {dashboard?.workingShift || "MORNING"}</strong>
          <p className={styles.subtitle} style={{ marginTop: 8 }}>
            Rider: {dashboard?.riderName || "Unknown"}
          </p>
          <div className={styles.actions}>
            <button className={styles.outline} onClick={() => navigate("/rider/history")}>Earnings and History</button>
            <button className={styles.outline} onClick={() => navigate("/rider/active")}>Open Active Delivery</button>
            <button
              className={styles.outline}
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Logout
            </button>
          </div>
        </section>

        {incomingOrder ? (
          <section className={styles.card}>
            <h2 style={{ margin: 0 }}>Incoming Order</h2>
            <div className={styles.grid}>
              <div>
                <p className={styles.label}>Customer</p>
                <p className={styles.value}>{incomingOrder.customerName}</p>
              </div>
              <div>
                <p className={styles.label}>Total Amount</p>
                <p className={styles.value}>{toPeso(incomingOrder.total)}</p>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <p className={styles.label}>Address</p>
                <p className={styles.value}>{incomingOrder.customerAddress}</p>
              </div>
            </div>

            <div className={styles.items}>
              {(incomingOrder.items || []).map((rawItem, index) => {
                const item = normalizeRiderItem(rawItem);
                return (
                  <div className={styles.item} key={`${incomingOrder.orderId}-${item.key}-${index}`}>
                    <span>{item.quantity}x {item.name}</span>
                    <span>{toPeso(item.subtotal)}</span>
                  </div>
                );
              })}
            </div>

            <div className={styles.timerWrap}>
              <div className={styles.timerBar}>
                <div className={styles.timerFill} style={{ width: `${timerPercent}%` }} />
              </div>
              <div className={styles.timerText}>Auto-decline in {secondsLeft}s</div>
            </div>

            <div className={styles.actions}>
              <button className={styles.primary} onClick={handleAccept}>Accept</button>
              <button className={styles.outline} onClick={() => declineRiderOrder(incomingOrder.orderId).then(loadDashboard)}>Decline</button>
            </div>
          </section>
        ) : (
          <section className={styles.card}>
            <p className={styles.subtitle} style={{ margin: 0 }}>
              No incoming order right now. Keep your app open for realtime assignments.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
