import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { orderApi } from "../../services/api";
import { fetchAdminDashboardSnapshot, fetchLowStockProducts } from "../../services/adminApi";
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

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
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

const RevenueTrendLineChart = memo(function RevenueTrendLineChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" />
        <YAxis tickFormatter={(value) => `P${Number(value).toLocaleString()}`} />
        <Tooltip formatter={(value) => toPeso(value)} />
        <Line type="monotone" dataKey="revenue" stroke="#6f4e37" strokeWidth={3} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
});

export default function Dashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(INITIAL_DASHBOARD);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeRange, setTimeRange] = useState("WEEK");
  const [handoverOrder, setHandoverOrder] = useState(null);
  const [isConfirmingHandover, setIsConfirmingHandover] = useState(false);

  const loadDashboard = useCallback(async (background = false) => {
    if (!background) {
      setIsLoading(true);
    }

    try {
      const [next, lowStockProducts] = await Promise.all([
        fetchAdminDashboardSnapshot(timeRange),
        fetchLowStockProducts(5),
      ]);
      setDashboard(next);
      setLowStockCount(lowStockProducts.length);
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

  const activeOrders = useMemo(() => {
    return (dashboard.recentOrders || []).filter((order) => {
      const normalized = String(order?.status || "").toUpperCase();
      return normalized !== "DELIVERED" && normalized !== "CANCELLED";
    });
  }, [dashboard.recentOrders]);

  const recentOrders = useMemo(() => {
    return (dashboard.recentOrders || []).slice(0, 10);
  }, [dashboard.recentOrders]);

  function isHandoverEligibleStatus(order) {
    const normalized = String(order?.status || "").toUpperCase();
    return normalized === "PREPARING" || normalized === "RIDER_ASSIGNED";
  }

  function canConfirmHandover(order) {
    return isHandoverEligibleStatus(order) && Boolean(order?.riderId);
  }

  async function handleConfirmHandover() {
    if (!handoverOrder?.id) {
      return;
    }

    setIsConfirmingHandover(true);
    setError("");

    try {
      await orderApi.updateStatus(handoverOrder.id, "PICKED_UP");
      await loadDashboard(true);
      setHandoverOrder(null);
    } catch (submitError) {
      setError(submitError.message || "Unable to confirm handover.");
    } finally {
      setIsConfirmingHandover(false);
    }
  }

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
        <Link to="/admin/orders/active" className={`${styles.kpiCard} ${styles.kpiCardLink}`.trim()}>
          <div className={styles.kpiIconBubble} aria-hidden="true">🛒</div>
          <p className={styles.kpiLabel}>Today's Orders</p>
          <p className={styles.kpiValue}>{dashboard.kpis.todaysOrders}</p>
        </Link>

        <Link to="/admin/analytics" className={`${styles.kpiCard} ${styles.kpiCardLink}`.trim()}>
          <div className={styles.kpiIconBubble} aria-hidden="true">₱</div>
          <p className={styles.kpiLabel}>Today's Revenue</p>
          <p className={styles.kpiValue}>{toPeso(dashboard.kpis.todaysRevenue)}</p>
        </Link>

        <Link to="/admin/riders" className={`${styles.kpiCard} ${styles.kpiCardLink}`.trim()}>
          <div className={styles.kpiIconBubble} aria-hidden="true">🛵</div>
          <p className={styles.kpiLabel}>Active Riders</p>
          <p className={styles.kpiValue}>{dashboard.kpis.activeRiders}</p>
        </Link>

        <Link to="/admin/orders/active?status=PENDING" className={`${styles.kpiCard} ${styles.kpiCardLink}`.trim()}>
          <div className={styles.kpiIconBubble} aria-hidden="true">⏳</div>
          <p className={styles.kpiLabel}>Pending Orders</p>
          <p className={styles.kpiValue}>{dashboard.kpis.pendingOrders}</p>
        </Link>

        <button
          type="button"
          className={`${styles.kpiCard} ${styles.kpiCardButton} ${styles.kpiCardAlert}`}
          onClick={() => navigate("/admin/inventory?stock=low")}
          aria-label="Open low stock alerts in inventory"
        >
          <div className={styles.kpiIconBubble} aria-hidden="true">⚠</div>
          <p className={styles.kpiLabel}>Low Stock Alerts</p>
          <p className={styles.kpiValue}>{lowStockCount}</p>
          <p className={styles.kpiHint}>View low-stock items</p>
        </button>
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
            <RevenueTrendLineChart data={dashboard.revenueTrend} />
          </div>
        </section>

        <section className={styles.tablePanel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Active Orders</h3>
              <p className={styles.panelSub}>Track active orders and confirm rider handover from the shop.</p>
            </div>
            <div className={styles.panelActions}>
              <button type="button" className={styles.viewAllButton} onClick={() => loadDashboard(false)}>
                Refresh List
              </button>
              <button type="button" className={styles.viewAllButton} onClick={() => navigate("/admin/orders/active")}>View Active Missions</button>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.recentOrdersTable}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Rider</th>
                  <th>Status</th>
                  <th className={styles.alignRight}>Total</th>
                  <th className={styles.alignCenter}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <p className={styles.emptyState}>{isLoading ? "Loading active orders..." : "No active orders found."}</p>
                    </td>
                  </tr>
                ) : (
                  activeOrders.map((order) => (
                    <tr key={order.id}>
                      <td>#{order.id.slice(0, 8)}</td>
                      <td>{order.customerName}</td>
                      <td>{order.riderName || "Unassigned"}</td>
                      <td>
                        <span className={statusClass(order.status)}>{order.status}</span>
                      </td>
                      <td className={styles.alignRight}>{toPeso(order.total)}</td>
                      <td className={styles.alignCenter}>
                        {isHandoverEligibleStatus(order) ? (
                          <button
                            type="button"
                            className={styles.handoverButton}
                            disabled={!canConfirmHandover(order)}
                            onClick={() => {
                              if (canConfirmHandover(order)) {
                                setHandoverOrder(order);
                              }
                            }}
                          >
                            Confirm Handover
                          </button>
                        ) : (
                          <span className={styles.actionHint}>Await rider</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.tablePanel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Recent Orders</h3>
              <p className={styles.panelSub}>Latest order activity, including delivered and cancelled orders.</p>
            </div>
            <div className={styles.panelActions}>
              <button type="button" className={styles.viewAllButton} onClick={() => loadDashboard(false)}>Refresh</button>
              <button type="button" className={styles.viewAllButton} onClick={() => navigate("/admin/orders/recent")}>Open History</button>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.recentOrdersTable}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Rider</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th className={styles.alignRight}>Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <p className={styles.emptyState}>{isLoading ? "Loading recent orders..." : "No recent orders found."}</p>
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={`recent-${order.id}`}>
                      <td>#{order.id.slice(0, 8)}</td>
                      <td>{order.customerName}</td>
                      <td>{order.riderName || "Unassigned"}</td>
                      <td>
                        <span className={statusClass(order.status)}>{order.status}</span>
                      </td>
                      <td>{formatDateTime(order.createdAt)}</td>
                      <td className={styles.alignRight}>{toPeso(order.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {handoverOrder ? (
        <div className={adminStyles.modalBackdrop}>
          <div className={adminStyles.modalCard}>
            <h4 className={adminStyles.modalTitle}>Confirm Handover</h4>
            <p className={styles.modalCopy}>
              Is Rider <strong>{handoverOrder.riderName || "Unassigned"}</strong> ready to take this order?
            </p>
            <p className={styles.modalMeta}>Order #{handoverOrder.id.slice(0, 8)}</p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.handoverButton}
                disabled={isConfirmingHandover}
                onClick={handleConfirmHandover}
              >
                {isConfirmingHandover ? "Confirming..." : "Yes, Confirm Handover"}
              </button>
              <button
                type="button"
                className={adminStyles.buttonSecondary}
                disabled={isConfirmingHandover}
                onClick={() => setHandoverOrder(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
