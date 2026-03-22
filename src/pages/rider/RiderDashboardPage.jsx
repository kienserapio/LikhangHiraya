import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  acceptRiderOrder,
  declineRiderOrder,
  fetchRiderDashboard,
  setRiderOnline,
  subscribeToRiderOrders,
} from "../../services/riderApi";
import { useAuthStore } from "../../store/authStore";
import styles from "./RiderPages.module.css";

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
}

export default function RiderDashboardPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const incomingOrder = dashboard?.incomingOrder || null;

  async function loadDashboard() {
    const next = await fetchRiderDashboard();
    setDashboard(next);
  }

  useEffect(() => {
    let mounted = true;
    fetchRiderDashboard()
      .then((next) => {
        if (mounted) {
          setDashboard(next);
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
  }, []);

  const timerPercent = useMemo(() => Math.max(0, (secondsLeft / 30) * 100), [secondsLeft]);

  async function handleToggleOnline() {
    if (!dashboard) {
      return;
    }
    const next = await setRiderOnline(!dashboard.online, dashboard.workingShift || "MORNING");
    setDashboard(next);
  }

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
                {dashboard?.online ? "Waiting for orders..." : "You are currently Offline."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleOnline}
            className={`${styles.toggle} ${dashboard?.online ? styles.toggleOnline : ""}`}
          >
            {dashboard?.online ? "Go Offline" : "Go Online"}
          </button>
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

        {dashboard?.online && incomingOrder ? (
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
              {incomingOrder.items.map((item) => (
                <div className={styles.item} key={`${incomingOrder.orderId}-${item.productId}`}>
                  <span>{item.quantity}x {item.productName}</span>
                  <span>{toPeso(item.subtotal)}</span>
                </div>
              ))}
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
              {dashboard?.online
                ? "No incoming order right now. Keep your app open for realtime assignments."
                : "Turn online when you are ready to receive delivery tasks."}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
