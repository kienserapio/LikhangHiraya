import { orderApi } from "./api";
import { supabase } from "./supabaseClient";

const ACTIVE_ORDER_IDS_KEY = "lh_active_order_ids";

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function buildOrderNotes({ paymentMethod, items, contactNumber, notificationsEnabled }) {
  return JSON.stringify({
    source: "LikhangHirayaWeb",
    paymentMethod,
    contactNumber,
    notificationsEnabled,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: Number(item.quantity),
      unitPrice: Number(item.pricePhp),
      subtotal: Number(item.pricePhp) * Number(item.quantity),
    })),
  });
}

function parseOrderNotes(notes) {
  const parsed = typeof notes === "string" ? safeJsonParse(notes, {}) : notes;
  return {
    items: Array.isArray(parsed?.items) ? parsed.items : [],
    paymentMethod: parsed?.paymentMethod || "CASH_ON_DELIVERY",
    contactNumber: parsed?.contactNumber || "",
    notificationsEnabled: Boolean(parsed?.notificationsEnabled),
  };
}

function inferSizeFromCartItem(item) {
  if (item?.selectedSize) {
    return String(item.selectedSize);
  }

  const name = String(item?.name || "");
  const matched = name.match(/\((Small|Medium|Large)\)\s*$/i);
  return matched ? matched[1] : "Small";
}

async function assertSufficientStock(items) {
  const productIds = Array.from(new Set((items || []).map((item) => String(item.id)).filter(Boolean)));
  if (productIds.length === 0) {
    throw new Error("Checkout failed: no valid items in cart.");
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, name, stock")
    .in("id", productIds);

  if (error) {
    throw new Error(`Unable to validate stock before checkout: ${error.message}`);
  }

  const stockByProductId = new Map(
    (data || []).map((row) => [String(row.id), { name: row.name || "Unknown Product", stock: Number(row.stock || 0) }])
  );

  const stockIssues = [];
  for (const item of items || []) {
    const productId = String(item.id);
    const requestedQuantity = Number(item.quantity || 0);
    const stockRow = stockByProductId.get(productId);

    if (!stockRow) {
      stockIssues.push(`${item.name || "Selected product"} is no longer available.`);
      continue;
    }

    if (requestedQuantity > stockRow.stock) {
      stockIssues.push(`${stockRow.name} only has ${stockRow.stock} in stock.`);
    }
  }

  if (stockIssues.length > 0) {
    throw new Error(`Checkout failed: ${stockIssues[0]}`);
  }
}

function rememberActiveOrderId(orderId) {
  const current = safeJsonParse(localStorage.getItem(ACTIVE_ORDER_IDS_KEY) || "[]", []);
  const deduped = [orderId, ...current.filter((value) => value !== orderId)].slice(0, 25);
  localStorage.setItem(ACTIVE_ORDER_IDS_KEY, JSON.stringify(deduped));
}

export async function createActiveOrder({ profile, items, paymentMethod, subtotal, total }) {
  await assertSufficientStock(items);

  const authUser = safeJsonParse(localStorage.getItem("lh_auth_user") || "null", null);
  const customerUsername = profile?.username || authUser?.username || "guest";

  const payload = {
    customer: {
      username: customerUsername,
      fullName: profile.fullName || customerUsername,
      email: profile.email || `${customerUsername}@local.likhanghiraya`,
      phone: profile.phone || "",
      address: profile.address || "Manila, Globe St. ABC 123",
    },
    deliveryAddress: profile.address || "Manila, Globe St. ABC 123",
    specialNotes: buildOrderNotes({
      paymentMethod,
      items,
      contactNumber: profile.phone || "",
      notificationsEnabled: profile.notificationsEnabled ?? true,
    }),
    items: items.map((item) => ({
      productId: item.id,
      quantity: Number(item.quantity),
      size: inferSizeFromCartItem(item),
    })),
  };

  const response = await orderApi.placeOrder(payload);
  rememberActiveOrderId(response.orderId);
  return response;
}

function normalizeOrderFromApi(order) {
  const details = parseOrderNotes(order.specialNotes);
  const notedItemsById = new Map(
    (details.items || []).map((item) => [String(item.id), item])
  );

  return {
    id: order.orderId || order.id,
    status: order.status,
    subtotal: Number(order.subtotal || 0),
    delivery_fee: Number(order.deliveryFee || order.delivery_fee || 0),
    total: Number(order.total || 0),
    delivery_address: order.deliveryAddress || order.delivery_address,
    created_at: order.createdAt || order.created_at,
    accepted_at: order.acceptedAt || order.accepted_at,
    picked_up_at: order.pickedUpAt || order.picked_up_at,
    arrived_at: order.arrivedAt || order.arrived_at,
    delivered_at: order.deliveredAt || order.delivered_at,
    ...details,
    items: (order.items || []).map((item) => {
      const itemId = String(item.productId || item.product_id || item.id || "");
      const noted = notedItemsById.get(itemId);
      const quantity = Number(item.quantity || noted?.quantity || 0);
      const unitPrice = Number(item.unitPrice || item.unit_price || noted?.unitPrice || 0);
      const subtotal = Number(item.subtotal || noted?.subtotal || unitPrice * quantity);

      return {
        id: itemId,
        name: item.productName || item.product_name || item.name || noted?.name || "Unnamed Product",
        quantity,
        subtotal,
        unitPrice,
      };
    }),
  };
}

export async function getActiveOrders() {
  const response = await orderApi.listMine("active");
  return {
    orderIds: (response || []).map((order) => order.orderId || order.id),
    orders: (response || []).map(normalizeOrderFromApi),
  };
}

export async function clearActiveOrders() {
  await orderApi.clearMineActive();
}

export function subscribeToActiveOrders(orderIds, onRefresh, onOrderDelivered) {
  const channel = supabase
    .channel(`customer-active-orders-${Date.now()}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => {
      onRefresh();
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
      if (String(payload.new?.status || "") === "DELIVERED" && typeof onOrderDelivered === "function") {
        onOrderDelivered(String(payload.new?.id || ""));
      }
      onRefresh();
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, () => {
      onRefresh();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
