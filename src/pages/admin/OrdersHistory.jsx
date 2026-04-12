import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAdminOrdersHistory } from "../../services/adminApi";
import { supabase } from "../../services/supabaseClient";
import adminStyles from "./Admin.module.css";
import styles from "./OrdersHistory.module.css";

const GROUP_BY_OPTIONS = [
  { value: "DATE", label: "Date" },
  { value: "DAY", label: "Day" },
  { value: "MONTH", label: "Month" },
];

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function toDateOrNull(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

function getGroupMeta(order, groupBy) {
  const createdAt = toDateOrNull(order.createdAt);
  if (!createdAt) {
    return {
      key: "unknown",
      label: "Unknown Date",
      sortValue: -1,
    };
  }

  if (groupBy === "DAY") {
    const dayIndex = createdAt.getDay();
    return {
      key: `day-${dayIndex}`,
      label: DAY_LABELS[dayIndex],
      sortValue: dayIndex,
    };
  }

  if (groupBy === "MONTH") {
    const monthStart = new Date(createdAt.getFullYear(), createdAt.getMonth(), 1);
    return {
      key: `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric" }).format(createdAt),
      sortValue: monthStart.getTime(),
    };
  }

  const dateOnly = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
  return {
    key: `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}-${String(createdAt.getDate()).padStart(2, "0")}`,
    label: new Intl.DateTimeFormat("en-PH", { month: "long", day: "2-digit", year: "numeric" }).format(createdAt),
    sortValue: dateOnly.getTime(),
  };
}

export default function OrdersHistory() {
  const [orders, setOrders] = useState([]);
  const [groupBy, setGroupBy] = useState("DATE");
  const [sortDirection, setSortDirection] = useState("DESC");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async (background = false) => {
    if (!background) {
      setIsLoading(true);
    }

    try {
      const next = await fetchAdminOrdersHistory();
      setOrders(Array.isArray(next) ? next : []);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Unable to load order history.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders(false);
  }, [loadOrders]);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-orders-history-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadOrders(true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        loadOrders(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  const groupedOrders = useMemo(() => {
    const groupMap = new Map();

    for (const order of orders) {
      const meta = getGroupMeta(order, groupBy);
      const existing = groupMap.get(meta.key);
      if (existing) {
        existing.orders.push(order);
        existing.totalRevenue += Number(order.total || 0);
        continue;
      }

      groupMap.set(meta.key, {
        key: meta.key,
        label: meta.label,
        sortValue: meta.sortValue,
        totalRevenue: Number(order.total || 0),
        orders: [order],
      });
    }

    const grouped = Array.from(groupMap.values());

    grouped.sort((left, right) => {
      if (sortDirection === "ASC") {
        return left.sortValue - right.sortValue;
      }
      return right.sortValue - left.sortValue;
    });

    for (const group of grouped) {
      group.orders.sort((left, right) => {
        const leftTime = toDateOrNull(left.createdAt)?.getTime() || 0;
        const rightTime = toDateOrNull(right.createdAt)?.getTime() || 0;
        return rightTime - leftTime;
      });
    }

    return grouped;
  }, [groupBy, orders, sortDirection]);

  const totalRevenue = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [orders]
  );

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Orders History</h2>
          <p className={styles.subtitle}>View all orders and sort them by day, date, or month.</p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={adminStyles.buttonSecondary} onClick={() => loadOrders(false)}>
            Refresh
          </button>
        </div>
      </header>

      {error ? <p className={adminStyles.error}>{error}</p> : null}

      <div className={styles.metricsRow}>
        <article className={styles.metricCard}>
          <p>Total Orders</p>
          <strong>{orders.length}</strong>
        </article>
        <article className={styles.metricCard}>
          <p>Total Revenue</p>
          <strong>{toPeso(totalRevenue)}</strong>
        </article>
      </div>

      <section className={styles.controlsPanel}>
        <div className={styles.controlField}>
          <label htmlFor="orders-history-group-by">Sort Group</label>
          <select
            id="orders-history-group-by"
            value={groupBy}
            onChange={(event) => setGroupBy(event.target.value)}
          >
            {GROUP_BY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.controlField}>
          <label htmlFor="orders-history-direction">Direction</label>
          <select
            id="orders-history-direction"
            value={sortDirection}
            onChange={(event) => setSortDirection(event.target.value)}
          >
            <option value="DESC">Descending</option>
            <option value="ASC">Ascending</option>
          </select>
        </div>
      </section>

      <section className={styles.groupList}>
        {groupedOrders.length === 0 ? (
          <p className={styles.emptyState}>{isLoading ? "Loading order history..." : "No orders found."}</p>
        ) : (
          groupedOrders.map((group) => (
            <article key={group.key} className={styles.groupCard}>
              <div className={styles.groupHeader}>
                <div>
                  <h3>{group.label}</h3>
                  <p>{group.orders.length} order{group.orders.length === 1 ? "" : "s"}</p>
                </div>
                <strong>{toPeso(group.totalRevenue)}</strong>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Customer</th>
                      <th>Rider</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th className={styles.alignRight}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.orders.map((order) => (
                      <tr key={order.id}>
                        <td>#{order.id.slice(0, 8)}</td>
                        <td>{order.customerName}</td>
                        <td>{order.riderName || "Unassigned"}</td>
                        <td>
                          <span className={statusClass(order.status)}>{order.status}</span>
                        </td>
                        <td>{formatDateTime(order.createdAt)}</td>
                        <td className={styles.alignRight}>{toPeso(order.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))
        )}
      </section>
    </section>
  );
}
