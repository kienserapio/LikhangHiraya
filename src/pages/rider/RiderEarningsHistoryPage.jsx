import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRiderDashboard, subscribeToRiderOrders } from "../../services/riderApi";
import styles from "./RiderPages.module.css";

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function RiderEarningsHistoryPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);

  async function refresh() {
    const data = await fetchRiderDashboard();
    setDashboard(data);
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const cleanup = subscribeToRiderOrders(refresh);
    return cleanup;
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1>Earnings and History</h1>
            <p className={styles.subtitle}>Track delivered orders and payout totals.</p>
          </div>
          <button className={styles.outline} onClick={() => navigate("/rider/dashboard")}>Dashboard</button>
        </header>

        <section className={styles.card}>
          <div className={styles.metricRow}>
            <div className={styles.metric}>
              <span className={styles.label}>Daily Earnings</span>
              <strong>{toPeso(dashboard?.earnings?.today)}</strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.label}>Weekly Earnings</span>
              <strong>{toPeso(dashboard?.earnings?.week)}</strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.label}>Weekly Deliveries</span>
              <strong>{dashboard?.earnings?.weeklyDeliveries || 0}</strong>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h2 style={{ marginTop: 0 }}>Delivery History</h2>
          {(dashboard?.history || []).length === 0 ? (
            <p className={styles.subtitle}>No completed deliveries yet.</p>
          ) : (
            dashboard.history.map((entry) => (
              <article key={entry.orderId} className={styles.historyRow}>
                <div>
                  <strong>Order #{entry.orderId.slice(0, 8)}</strong>
                  <p className={styles.subtitle} style={{ marginTop: 4 }}>
                    {formatDate(entry.deliveredAt || entry.createdAt)}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong>{toPeso(entry.riderPayout)}</strong>
                  <p className={styles.subtitle} style={{ marginTop: 4 }}>Order Total: {toPeso(entry.total)}</p>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
