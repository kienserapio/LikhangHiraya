import { useCallback, useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchAdminDashboardSnapshot } from "../../services/adminApi";
import { supabase } from "../../services/supabaseClient";
import adminStyles from "./Admin.module.css";
import styles from "./Dashboard.module.css";

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function statusClass(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "DELIVERED") {
    return `${adminStyles.statusBadge} ${adminStyles.statusDelivered}`;
  }
  if (normalized === "PENDING") {
    return `${adminStyles.statusBadge} ${adminStyles.statusPending}`;
  }
  if (normalized === "IN_TRANSIT" || normalized === "ARRIVED" || normalized === "PICKED_UP") {
    return `${adminStyles.statusBadge} ${adminStyles.statusTransit}`;
  }
  return adminStyles.statusBadge;
}

const INITIAL_DASHBOARD = {
  range: "WEEK",
  kpis: {
    todaysOrders: 0,
    todaysRevenue: 0,
    activeRiders: 0,
    pendingOrders: 0,
  },
  recentOrders: [],
  revenueTrend: [],
};

const DASHBOARD_RANGE_OPTIONS = [
  { value: "WEEK", label: "Weekly" },
  { value: "MONTH", label: "Monthly" },
  { value: "YEAR", label: "Yearly" },
];

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(INITIAL_DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeRange, setTimeRange] = useState("WEEK");

  const loadDashboard = useCallback(async (background = false) => {
    if (!background) {
      setIsLoading(true);
    }

    try {
      const next = await fetchAdminDashboardSnapshot(timeRange);
      setDashboard(next);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Unable to load dashboard metrics.");
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadDashboard(false);
  }, [loadDashboard]);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-dashboard-orders-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => {
        loadDashboard(true);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => {
        loadDashboard(true);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, () => {
        loadDashboard(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboard]);

  const todayLabel = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date());

  return (
    <section className={styles.dashboardPage}>
      <div className={styles.overviewHeader}>
        <div className={styles.overviewText}>
          <h2 className={styles.overviewTitle}>Dashboard Overview</h2>
          <p className={styles.overviewSub}>Welcome back. Here is what is happening with Likhang Hiraya today.</p>
        </div>

        <div className={styles.overviewActions}>
          <div className={styles.dateChip}>
            <span className={styles.dateIcon} aria-hidden="true">🗓</span>
            <span>{todayLabel}</span>
          </div>
          <button type="button" className={adminStyles.buttonSecondary} onClick={() => loadDashboard(false)}>
            Refresh
          </button>
        </div>
      </div>

      {error ? <p className={adminStyles.error}>{error}</p> : null}

      <div className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <div className={styles.kpiIconBubble} aria-hidden="true">🛒</div>
          <p className={styles.kpiLabel}>Today's Orders</p>
          <p className={styles.kpiValue}>{dashboard.kpis.todaysOrders}</p>
        </article>

        <article className={styles.kpiCard}>
          <div className={styles.kpiIconBubble} aria-hidden="true">₱</div>
          <p className={styles.kpiLabel}>Today's Revenue</p>
          <p className={styles.kpiValue}>{toPeso(dashboard.kpis.todaysRevenue)}</p>
        </article>

        <article className={styles.kpiCard}>
          <div className={styles.kpiIconBubble} aria-hidden="true">🛵</div>
          <p className={styles.kpiLabel}>Active Riders</p>
          <p className={styles.kpiValue}>{dashboard.kpis.activeRiders}</p>
        </article>

        <article className={styles.kpiCard}>
          <div className={styles.kpiIconBubble} aria-hidden="true">⏳</div>
          <p className={styles.kpiLabel}>Pending Orders</p>
          <p className={styles.kpiValue}>{dashboard.kpis.pendingOrders}</p>
        </article>
      </div>

      <div className={styles.mainStack}>
        <section className={styles.chartPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Revenue Trends</h3>
              <p className={styles.panelSub}>Performance overview from Likhang Hiraya order history.</p>
            </div>

            <div className={styles.segmentedControl} role="tablist" aria-label="Revenue trend range">
              {DASHBOARD_RANGE_OPTIONS.map((option) => {
                const isActive = option.value === timeRange;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.segmentButton} ${isActive ? styles.segmentButtonActive : ""}`.trim()}
                    onClick={() => setTimeRange(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboard.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(value) => `P${Number(value).toLocaleString()}`} />
                <Tooltip formatter={(value) => toPeso(value)} />
                <Line type="monotone" dataKey="revenue" stroke="#6f4e37" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={styles.tablePanel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Recent Orders</h3>
              <p className={styles.panelSub}>Latest customer activity from Likhang Hiraya orders.</p>
            </div>
            <button type="button" className={styles.viewAllButton} onClick={() => loadDashboard(false)}>
              Refresh List
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.recentOrdersTable}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th className={styles.alignRight}>Total</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <p className={styles.emptyState}>{isLoading ? "Loading recent orders..." : "No orders found."}</p>
                    </td>
                  </tr>
                ) : (
                  dashboard.recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>#{order.id.slice(0, 8)}</td>
                      <td>{order.customerName}</td>
                      <td>
                        <span className={statusClass(order.status)}>{order.status}</span>
                      </td>
                      <td className={styles.alignRight}>{toPeso(order.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className={styles.systemStatus}>
        <p className={styles.systemStatusLabel}>System Status</p>
        <div className={styles.systemStatusRow}>
          <span className={`${styles.systemDot} ${error ? styles.systemDotWarn : ""}`} aria-hidden="true" />
          <span>{error ? "Realtime sync issue detected" : "All systems operational"}</span>
        </div>
      </div>
    </section>
  );
}
