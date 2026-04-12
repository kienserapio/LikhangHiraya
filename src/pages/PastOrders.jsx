import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import UniversalBottomNav from "../components/UniversalBottomNav";
import { orderApi } from "../services/api";
import { supabase } from "../services/supabaseClient";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import "./PastOrders.css";

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
}

function formatHistoryDate(value) {
  if (!value) {
    return "Unknown date";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function normalizeSize(value) {
  const normalized = String(value || "SMALL").trim().toUpperCase();
  if (normalized === "MEDIUM") {
    return "Medium";
  }
  if (normalized === "LARGE") {
    return "Large";
  }
  return "Small";
}

function summarizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "No item details available for this order.";
  }

  return items
    .map((item) => {
      const name = item.productName || item.product_name || item.name || "Unnamed Product";
      const quantity = Number(item.quantity || 0);
      return `${name} x${Math.max(0, quantity)}`;
    })
    .join(", ");
}

function statusLabel(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "DELIVERED") {
    return "Delivered";
  }
  if (normalized === "CANCELLED") {
    return "Cancelled";
  }
  return normalized || "Unknown";
}

export default function PastOrders() {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);
  const clearCart = useCartStore((state) => state.clear);
  const addItem = useCartStore((state) => state.addItem);

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadHistoryFromSupabase() {
    const username = String(user?.username || profile?.username || "").trim();
    const fullName = String(profile?.fullName || "").trim();

    if (!username && !fullName) {
      return [];
    }

    let userRow = null;

    if (username) {
      const byUsernameRes = await supabase
        .from("users")
        .select("id, username, full_name")
        .ilike("username", username)
        .limit(1)
        .maybeSingle();

      if (byUsernameRes.error) {
        throw new Error(`Unable to locate account by username: ${byUsernameRes.error.message}`);
      }

      userRow = byUsernameRes.data || null;
    }

    if (!userRow && fullName) {
      const byFullNameRes = await supabase
        .from("users")
        .select("id, username, full_name")
        .ilike("full_name", fullName)
        .limit(1)
        .maybeSingle();

      if (byFullNameRes.error) {
        throw new Error(`Unable to locate account by full name: ${byFullNameRes.error.message}`);
      }

      userRow = byFullNameRes.data || null;
    }

    if (!userRow?.id) {
      return [];
    }

    const ordersRes = await supabase
      .from("orders")
      .select("id, user_id, status, total, created_at")
      .eq("user_id", userRow.id)
      .in("status", ["DELIVERED", "CANCELLED"])
      .order("created_at", { ascending: false });

    if (ordersRes.error) {
      throw new Error(`Unable to load order history from Supabase: ${ordersRes.error.message}`);
    }

    const orderRows = Array.isArray(ordersRes.data) ? ordersRes.data : [];
    if (orderRows.length === 0) {
      return [];
    }

    const orderIds = orderRows.map((order) => String(order.id));

    const orderItemsRes = await supabase
      .from("order_items")
      .select("order_id, product_id, quantity, size, unit_price, subtotal")
      .in("order_id", orderIds)
      .order("order_id", { ascending: false });

    if (orderItemsRes.error) {
      throw new Error(`Unable to load order items from Supabase: ${orderItemsRes.error.message}`);
    }

    const itemRows = Array.isArray(orderItemsRes.data) ? orderItemsRes.data : [];
    const productIds = Array.from(new Set(itemRows.map((item) => String(item.product_id || "")).filter(Boolean)));

    let productNameById = new Map();
    if (productIds.length > 0) {
      const productsRes = await supabase
        .from("products")
        .select("id, name")
        .in("id", productIds);

      if (productsRes.error) {
        throw new Error(`Unable to load product names for history: ${productsRes.error.message}`);
      }

      productNameById = new Map(
        (productsRes.data || []).map((product) => [String(product.id), product.name || "Unnamed Product"])
      );
    }

    const itemsByOrderId = new Map();
    for (const row of itemRows) {
      const orderId = String(row.order_id || "");
      if (!orderId) {
        continue;
      }

      const mappedItem = {
        productId: String(row.product_id || ""),
        productName: productNameById.get(String(row.product_id || "")) || "Unnamed Product",
        quantity: Number(row.quantity || 0),
        size: String(row.size || "SMALL").toUpperCase(),
        unitPrice: Number(row.unit_price || 0),
        subtotal: Number(row.subtotal || 0),
      };

      if (!itemsByOrderId.has(orderId)) {
        itemsByOrderId.set(orderId, []);
      }
      itemsByOrderId.get(orderId).push(mappedItem);
    }

    return orderRows.map((row) => ({
      orderId: String(row.id),
      id: String(row.id),
      status: String(row.status || "").toUpperCase(),
      total: Number(row.total || 0),
      createdAt: row.created_at,
      created_at: row.created_at,
      items: itemsByOrderId.get(String(row.id)) || [],
    }));
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        let response = [];

        try {
          // Prefer Spring API response when available.
          response = await orderApi.listHistory();
        } catch {
          // Fall back to direct Supabase history query, aligned with admin dashboard data source.
          response = await loadHistoryFromSupabase();
        }

        if (!mounted) {
          return;
        }

        setOrders(Array.isArray(response) ? response : []);
        setError("");
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        setOrders([]);
        setError(loadError.message || "Unable to load your past orders.");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [profile?.fullName, profile?.username, user?.username]);

  const cards = useMemo(() => {
    return (Array.isArray(orders) ? orders : []).map((order) => {
      const orderId = String(order.orderId || order.id || "");
      const createdAt = order.createdAt || order.created_at || "";
      const items = Array.isArray(order.items) ? order.items : [];
      const status = String(order.status || "").toUpperCase();
      return {
        id: orderId,
        shortId: orderId ? orderId.slice(0, 8).toUpperCase() : "-",
        createdAt,
        items,
        total: Number(order.total || 0),
        status,
      };
    });
  }, [orders]);

  function handleReorder(order) {
    if (!order || !Array.isArray(order.items) || order.items.length === 0) {
      return;
    }

    clearCart();

    order.items.forEach((item, index) => {
      const quantity = Number(item.quantity || 0);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return;
      }

      const subtotal = Number(item.subtotal || 0);
      const rawUnitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
      const unitPrice = Number.isFinite(rawUnitPrice) && rawUnitPrice > 0
        ? rawUnitPrice
        : subtotal > 0
          ? subtotal / quantity
          : 0;

      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return;
      }

      const productId = String(item.productId || item.product_id || item.id || `${order.id}-${index}`);
      const baseName = item.productName || item.product_name || item.name || "Unnamed Product";
      const selectedSize = normalizeSize(item.size);

      addItem(
        {
          id: productId,
          name: `${baseName} (${selectedSize})`,
          pricePhp: unitPrice,
          imageUrl: "",
          selectedSize,
          toppings: {},
          toppingTotal: 0,
        },
        quantity
      );
    });

    navigate("/cart");
  }

  const showEmpty = !isLoading && !error && cards.length === 0;

  return (
    <div className="past-orders-page">
      <main className="past-orders-main">
        <header className="past-orders-header">
          <button type="button" className="past-orders-back" aria-label="Back to cart" onClick={() => navigate("/cart")}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
            </svg>
          </button>
          <div>
            <h1>Order History</h1>
            <p>Review your delivered and cancelled coffee orders.</p>
          </div>
        </header>

        {error ? <p className="past-orders-error">{error}</p> : null}
        {isLoading ? <p className="past-orders-loading">Loading past orders...</p> : null}

        {showEmpty ? (
          <section className="past-orders-empty">
            <h2>No past orders yet</h2>
            <p>Start your first coffee run and your order history will appear here.</p>
            <button type="button" onClick={() => navigate("/home")}>Start Ordering</button>
          </section>
        ) : null}

        {!isLoading && !error && cards.length > 0 ? (
          <section className="past-orders-list">
            {cards.map((order) => (
              <article className="past-order-card" key={order.id}>
                <div className="past-order-top">
                  <div>
                    <p className="past-order-id">Order #{order.shortId}</p>
                    <p className="past-order-date">{formatHistoryDate(order.createdAt)}</p>
                  </div>
                  <span className={`past-order-status ${order.status === "DELIVERED" ? "delivered" : "cancelled"}`}>
                    {statusLabel(order.status)}
                  </span>
                </div>

                <p className="past-order-items">{summarizeItems(order.items)}</p>

                <div className="past-order-bottom">
                  <strong>{toPeso(order.total)}</strong>
                  <button
                    type="button"
                    className="past-order-reorder"
                    onClick={() => handleReorder(order)}
                    disabled={order.items.length === 0}
                  >
                    Re-order
                  </button>
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </main>

      <UniversalBottomNav active="cart" />
    </div>
  );
}
