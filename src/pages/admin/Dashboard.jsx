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
import styles from "./Admin.module.css";

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
    return `${styles.statusBadge} ${styles.statusDelivered}`;
  }
  if (normalized === "PENDING") {
    return `${styles.statusBadge} ${styles.statusPending}`;
  }
  if (normalized === "IN_TRANSIT" || normalized === "ARRIVED" || normalized === "PICKED_UP") {
    return `${styles.statusBadge} ${styles.statusTransit}`;
  }
  return styles.statusBadge;
}

const INITIAL_DASHBOARD = {
  kpis: {
    todaysOrders: 0,
    todaysRevenue: 0,
    activeRiders: 0,
    pendingOrders: 0,
  },
  recentOrders: [],
  revenueTrend: [],
};

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(INITIAL_DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (background = false) => {
    if (!background) {
      setIsLoading(true);
    }

    try {
      const next = await fetchAdminDashboardSnapshot();
      setDashboard(next);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Unable to load dashboard metrics.");
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  return (
    <section className={styles.pageSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Admin Dashboard</h2>
          <p className={styles.sectionSub}>Live operations overview of orders, riders, and revenue.</p>
        </div>
        <button type="button" className={styles.buttonSecondary} onClick={() => loadDashboard(false)}>
          Refresh
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Today's Orders</p>
          <p className={styles.kpiValue}>{dashboard.kpis.todaysOrders}</p>
        </article>
        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Today's Revenue</p>
          <p className={styles.kpiValue}>{toPeso(dashboard.kpis.todaysRevenue)}</p>
        </article>
        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Active Riders</p>
          <p className={styles.kpiValue}>{dashboard.kpis.activeRiders}</p>
        </article>
        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Pending Orders</p>
          <p className={styles.kpiValue}>{dashboard.kpis.pendingOrders}</p>
        </article>
      </div>

      <div className={styles.gridTwo}>
        <section className={styles.panel}>
          <h3>Revenue Trend (Last 7 Days)</h3>
          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboard.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" />
                <YAxis tickFormatter={(value) => `P${Number(value).toLocaleString()}`} />
                <Tooltip formatter={(value) => toPeso(value)} />
                <Line type="monotone" dataKey="revenue" stroke="#7c4f34" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={styles.panel}>
          <h3>Recent Orders</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
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
                      <td>{order.id.slice(0, 8)}...</td>
                      <td>{order.customerName}</td>
                      <td>
                        <span className={statusClass(order.status)}>{order.status}</span>
                      </td>
                      <td>{toPeso(order.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}
