import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchAdminOrdersHistory } from "../../services/adminApi";
import { orderApi } from "../../services/api";
import { supabase } from "../../services/supabaseClient";
import adminStyles from "./Admin.module.css";
import styles from "./OrdersMissionBoard.module.css";

const ACTIVE_ORDER_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "PICKED_UP", "IN_TRANSIT"];
const RECENT_ORDER_STATUSES = ["DELIVERED", "ARRIVED", "CANCELLED"];

const MODE_CONFIG = {
  active: {
    title: "Active Orders",
    subtitle: "Live logistics missions with handover controls.",
    statuses: ACTIVE_ORDER_STATUSES,
    emptyState: "No active missions at the moment.",
    showHandover: true,
  },
  recent: {
    title: "Recent Orders",
    subtitle: "Completed and closed order history.",
    statuses: RECENT_ORDER_STATUSES,
    emptyState: "No recent orders found.",
    showHandover: false,
  },
};

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function toStatusLabel(status) {
  return String(status || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toDateOrNull(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value) {
  const parsed = toDateOrNull(value);
  if (!parsed) {
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

function normalizeStatusFilter(value, supportedStatuses) {
  const normalized = String(value || "ALL").trim().toUpperCase();
  if (normalized === "ALL") {
    return "ALL";
  }
  return supportedStatuses.includes(normalized) ? normalized : "ALL";
}

function orderLabel(orderId) {
  const raw = String(orderId || "").trim();
  if (!raw) {
    return "Unknown";
  }
  return `#${raw.slice(0, 8).toUpperCase()}`;
}

function lineItemLabel(item) {
  const quantity = Number(item?.quantity || 0);
  const name = String(item?.name || "Unknown Product").trim() || "Unknown Product";
  const subtotal = Number(item?.subtotal || 0);
  return `${quantity}x ${name} • ${toPeso(subtotal)}`;
}

function isHandoverEligible(order) {
  const status = String(order?.status || "").toUpperCase();
  return (status === "PREPARING" || status === "RIDER_ASSIGNED") && Boolean(order?.riderId);
}

function handoverHint(order) {
  const status = String(order?.status || "").toUpperCase();

  if (status === "PREPARING" && !order?.riderId) {
    return "Assign a rider before handover.";
  }

  if (status === "PENDING" || status === "CONFIRMED") {
    return "Order is still being prepared.";
  }

  if (status === "PICKED_UP" || status === "IN_TRANSIT") {
    return "Order already handed over.";
  }

  return "Awaiting handover readiness.";
}

export default function OrdersMissionBoard({ mode = "active" }) {
  const config = MODE_CONFIG[mode] || MODE_CONFIG.active;
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState(normalizeStatusFilter(searchParams.get("status"), config.statuses));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [handoverOrder, setHandoverOrder] = useState(null);
  const [isConfirmingHandover, setIsConfirmingHandover] = useState(false);

  useEffect(() => {
    setStatusFilter(normalizeStatusFilter(searchParams.get("status"), config.statuses));
  }, [config.statuses, searchParams]);

  const loadOrders = useCallback(async (background = false) => {
    if (!background) {
      setIsLoading(true);
    }

    try {
      const next = await fetchAdminOrdersHistory();
      setOrders(Array.isArray(next) ? next : []);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Unable to load orders.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders(false);
  }, [loadOrders]);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-orders-mission-${mode}-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadOrders(true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        loadOrders(true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        loadOrders(true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        loadOrders(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders, mode]);

  const statusOptions = useMemo(
    () => [
      { value: "ALL", label: "All Statuses" },
      ...config.statuses.map((status) => ({ value: status, label: toStatusLabel(status) })),
    ],
    [config.statuses]
  );

  const missionOrders = useMemo(
    () => orders.filter((order) => config.statuses.includes(String(order?.status || "").toUpperCase())),
    [config.statuses, orders]
  );

  const filteredOrders = useMemo(() => {
    if (statusFilter === "ALL") {
      return missionOrders;
    }

    return missionOrders.filter((order) => String(order?.status || "").toUpperCase() === statusFilter);
  }, [missionOrders, statusFilter]);

  const totalRevenue = useMemo(
    () => filteredOrders.reduce((sum, order) => sum + Number(order?.total || 0), 0),
    [filteredOrders]
  );

  function handleStatusChange(value) {
    const normalized = normalizeStatusFilter(value, config.statuses);
    setStatusFilter(normalized);

    const nextSearchParams = new URLSearchParams(searchParams);
    if (normalized === "ALL") {
      nextSearchParams.delete("status");
    } else {
      nextSearchParams.set("status", normalized);
    }
    setSearchParams(nextSearchParams, { replace: true });
  }

  async function handleConfirmHandover() {
    if (!handoverOrder?.id) {
      return;
    }

    setIsConfirmingHandover(true);
    setError("");

    try {
      await orderApi.updateStatus(handoverOrder.id, "PICKED_UP");
      await loadOrders(true);
      setHandoverOrder(null);
    } catch (submitError) {
      setError(submitError.message || "Unable to confirm handover.");
    } finally {
      setIsConfirmingHandover(false);
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{config.title}</h2>
          <p className={styles.subtitle}>{config.subtitle}</p>
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
          <strong>{filteredOrders.length}</strong>
        </article>
        <article className={styles.metricCard}>
          <p>Total Revenue</p>
          <strong>{toPeso(totalRevenue)}</strong>
        </article>
      </div>

      <section className={styles.controlsPanel}>
        <div className={styles.controlField}>
          <label htmlFor={`orders-${mode}-status-filter`}>Status Filter</label>
          <select
            id={`orders-${mode}-status-filter`}
            value={statusFilter}
            onChange={(event) => handleStatusChange(event.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.ordersGrid}>
        {filteredOrders.length === 0 ? (
          <p className={styles.emptyState}>{isLoading ? "Loading orders..." : config.emptyState}</p>
        ) : (
          filteredOrders.map((order) => (
            <article key={order.id} className={styles.orderCard}>
              <div className={styles.orderTop}>
                <div>
                  <p className={styles.orderCustomer}>{order.customerName || "Unknown Customer"}</p>
                  <p className={styles.orderId}>Order {orderLabel(order.id)}</p>
                </div>
                <span className={statusClass(order.status)}>{toStatusLabel(order.status)}</span>
              </div>

              <p className={styles.orderTotal}>{toPeso(order.total)}</p>

              <div className={styles.detailGrid}>
                <div className={styles.detailBlock}>
                  <p className={styles.detailLabel}>Location</p>
                  <p className={styles.detailValue}>{order.deliveryAddress || "Address not provided"}</p>
                </div>
                <div className={styles.detailBlock}>
                  <p className={styles.detailLabel}>Rider</p>
                  <p className={styles.detailValue}>{order.riderName || "Unassigned"}</p>
                </div>
                <div className={styles.detailBlock}>
                  <p className={styles.detailLabel}>Created</p>
                  <p className={styles.detailValue}>{formatDateTime(order.createdAt)}</p>
                </div>
              </div>

              <div className={styles.itemsPanel}>
                <p className={styles.itemsTitle}>Products Ordered</p>
                {Array.isArray(order.items) && order.items.length > 0 ? (
                  order.items.map((item, index) => (
                    <p key={`${order.id}-${item.productId}-${index}`} className={styles.itemRow}>
                      {lineItemLabel(item)}
                    </p>
                  ))
                ) : (
                  <p className={styles.itemRow}>No line items available.</p>
                )}
              </div>

              <div className={styles.priceRow}>
                <p>
                  Subtotal
                  <span>{toPeso(order.subtotal)}</span>
                </p>
                <p>
                  Delivery Fee
                  <span>{toPeso(order.deliveryFee)}</span>
                </p>
                <p className={styles.priceTotalLine}>
                  Total
                  <span>{toPeso(order.total)}</span>
                </p>
              </div>

              {config.showHandover ? (
                <div className={styles.actionRow}>
                  {isHandoverEligible(order) ? (
                    <button
                      type="button"
                      className={styles.handoverButton}
                      onClick={() => setHandoverOrder(order)}
                    >
                      Confirm Handover
                    </button>
                  ) : (
                    <p className={styles.actionHint}>{handoverHint(order)}</p>
                  )}
                </div>
              ) : null}
            </article>
          ))
        )}
      </section>

      {handoverOrder ? (
        <div className={adminStyles.modalBackdrop}>
          <div className={adminStyles.modalCard}>
            <h4 className={adminStyles.modalTitle}>Confirm Handover</h4>
            <p className={styles.modalCopy}>
              Confirm that rider <strong>{handoverOrder.riderName || "Unassigned"}</strong> has picked up this order.
            </p>
            <p className={styles.modalMeta}>Order {orderLabel(handoverOrder.id)}</p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.handoverButton}
                disabled={isConfirmingHandover}
                onClick={handleConfirmHandover}
              >
                {isConfirmingHandover ? "Confirming..." : "Yes, Confirm"}
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
    </section>
  );
}
