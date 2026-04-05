import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import RiderBottomNav from "../../components/rider/RiderBottomNav";
import RiderPageLoader from "../../components/rider/RiderPageLoader";
import { fetchRiderDashboard, subscribeToRiderOrders } from "../../services/riderApi";
import styles from "./RiderEarningsHistory.module.css";

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
}

function toDate(value) {
  if (!value) {
    return null;
  }
  const next = new Date(value);
  return Number.isNaN(next.getTime()) ? null : next;
}

function formatDeliveryTime(value) {
  const date = toDate(value);
  if (!date) {
    return "Unknown time";
  }

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();

  if (sameDay) {
    return new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" }).format(date);
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function isDeliveredToday(value) {
  const date = toDate(value);
  if (!date) {
    return false;
  }

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
  );
}

function deliveryOrderLabel(orderId) {
  const trimmed = String(orderId || "").trim();
  if (!trimmed) {
    return "Order #LH-0000";
  }
  return `Order #LH-${trimmed.slice(0, 4).toUpperCase()}`;
}

function HistoryIcon({ older }) {
  if (older) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4.5 5.4v2.9h2.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 8.4v3.9l2.8 1.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5.5 8h13v8.8a1.7 1.7 0 0 1-1.7 1.7H7.2a1.7 1.7 0 0 1-1.7-1.7z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.2 8V6.4a2.8 2.8 0 1 1 5.6 0V8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function RiderEarningsHistoryPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const refresh = useCallback(async () => {
    const data = await fetchRiderDashboard();
    setDashboard(data || null);
  }, []);

  useEffect(() => {
    let mounted = true;

    refresh()
      .catch(() => {
        if (mounted) {
          setDashboard(null);
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
  }, [refresh]);

  useEffect(() => {
    const cleanup = subscribeToRiderOrders(() => {
      void refresh();
    });
    return cleanup;
  }, [refresh]);

  const history = useMemo(() => {
    const list = Array.isArray(dashboard?.history) ? [...dashboard.history] : [];
    return list.sort((left, right) => {
      const leftValue = toDate(left?.deliveredAt || left?.createdAt)?.getTime() || 0;
      const rightValue = toDate(right?.deliveredAt || right?.createdAt)?.getTime() || 0;
      return rightValue - leftValue;
    });
  }, [dashboard?.history]);

  const visibleHistory = useMemo(() => (showAll ? history : history.slice(0, 5)), [history, showAll]);

  const dailyEarnings = Number(dashboard?.earnings?.today || 0);
  const weeklyEarnings = Number(dashboard?.earnings?.week || 0);
  const weeklyDeliveries = Number(dashboard?.earnings?.weeklyDeliveries || 0);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <header className={styles.topBar}>
          <button type="button" className={styles.backButton} onClick={() => navigate("/rider/dashboard")} aria-label="Go back to dashboard">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M14.8 6.5 9.3 12l5.5 5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className={styles.topTitle}>Earnings</h1>
        </header>
        <RiderPageLoader topOffset={64} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button type="button" className={styles.backButton} onClick={() => navigate("/rider/dashboard")} aria-label="Go back to dashboard">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14.8 6.5 9.3 12l5.5 5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className={styles.topTitle}>Earnings</h1>
      </header>

      <main className={styles.main}>
        <section className={styles.statsGrid}>
          <article className={styles.statCard}>
            <div className={styles.statHead}>
              <span>Daily Earnings</span>
              <span className={styles.statIconMuted}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="5.2" y="6.4" width="13.6" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M8.2 4.8v3.1M15.8 4.8v3.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </span>
            </div>
            <h2 className={styles.statValue}>{toPeso(dailyEarnings)}</h2>
            <p className={styles.statSub}>Today's Revenue</p>
          </article>

          <article className={`${styles.statCard} ${styles.statCardPrimary}`}>
            <div className={styles.statHead}>
              <span>Weekly Earnings</span>
              <span className={styles.statIconPrimary}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7 5.2v13.6M12 5.2v13.6M17 5.2v13.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  <rect x="4.5" y="5.2" width="15" height="13.6" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
                </svg>
              </span>
            </div>
            <h2 className={styles.statValue}>{toPeso(weeklyEarnings)}</h2>
            <p className={styles.statSub}>Last 7 Days</p>
          </article>

          <article className={styles.statCard}>
            <div className={styles.statHead}>
              <span>Weekly Deliveries</span>
              <span className={styles.statIconMuted}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M3.5 7.2h10.8V16H3.5z" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M14.3 9.6h3.9l2.3 2.6V16h-6.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
            <h2 className={styles.statValue}>{weeklyDeliveries}</h2>
            <p className={styles.statSub}>Completed Trips</p>
          </article>
        </section>

        <section className={styles.historySection}>
          <div className={styles.historyHead}>
            <h3>Recent Deliveries</h3>
            {history.length > 5 ? (
              <button type="button" className={styles.viewAllButton} onClick={() => setShowAll((previous) => !previous)}>
                {showAll ? "Show Less" : "View All"}
              </button>
            ) : null}
          </div>

          <div className={styles.historyList}>
            {visibleHistory.length === 0 ? (
              <div className={styles.emptyState}>No completed deliveries yet.</div>
            ) : (
              visibleHistory.map((entry) => {
                const deliveredAt = entry.deliveredAt || entry.createdAt;
                const deliveredToday = isDeliveredToday(deliveredAt);

                return (
                  <article key={entry.orderId} className={styles.historyRow}>
                    <div className={styles.historyLeft}>
                      <span className={styles.historyIconWrap}>
                        <HistoryIcon older={!deliveredToday} />
                      </span>
                      <div>
                        <p className={styles.orderLabel}>{deliveryOrderLabel(entry.orderId)}</p>
                        <p className={styles.orderMeta}>{formatDeliveryTime(deliveredAt)}</p>
                      </div>
                    </div>

                    <div className={styles.historyRight}>
                      <p className={styles.payoutValue}>{toPeso(entry.riderPayout)}</p>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className={styles.insightBanner}>
          <div className={styles.insightContent}>
            <h4>You're doing great this week!</h4>
            <p>
              Keep your completion streak going to boost your weekly earnings and unlock more incentive opportunities.
            </p>
            <button type="button" className={styles.insightButton} onClick={() => navigate("/rider/dashboard")}>
              View Active Orders
            </button>
          </div>
          <span className={styles.insightDecor} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4.5 18.8h15M6.8 16.4 10 12.2l3 2.6 4.4-6.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </section>
      </main>

      <RiderBottomNav />
    </div>
  );
}
