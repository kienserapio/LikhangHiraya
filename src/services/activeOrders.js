import { orderApi } from "./api";
import { supabase } from "./supabaseClient";

const ACTIVE_ORDER_IDS_KEY = "lh_active_order_ids";
const SHOP_GCASH_NUMBER = "09998887777";

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function buildOrderNotes({ paymentMethod, items, contactNumber, notificationsEnabled, paymentReferenceNumber, gcashNumber }) {
  return JSON.stringify({
    source: "LikhangHirayaWeb",
    paymentMethod,
    contactNumber,
    notificationsEnabled,
    paymentReferenceNumber: paymentReferenceNumber || "",
    gcashNumber: gcashNumber || "",
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
    paymentReferenceNumber: parsed?.paymentReferenceNumber || "",
    gcashNumber: parsed?.gcashNumber || "",
  };
}

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
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

export async function createActiveOrder({ profile, items, paymentMethod, paymentReferenceNumber, subtotal, total }) {
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
      paymentReferenceNumber,
      gcashNumber: paymentMethod === "GCASH" || paymentMethod === "ONLINE_PAYMENT" ? SHOP_GCASH_NUMBER : "",
    }),
    items: items.map((item) => {
      const productId = String(item.id);
      const unitPrice = Number(item.pricePhp || 0);
      return {
        productId,
        product_id: productId,
        quantity: Number(item.quantity),
        size: inferSizeFromCartItem(item),
        unitPrice,
        unit_price: unitPrice,
      };
    }),
  };

  const response = await orderApi.placeOrder(payload);
  rememberActiveOrderId(response.orderId);
  return response;
}

function normalizeOrderFromApi(order) {
  const details = parseOrderNotes(order.specialNotes);
  const notedItems = Array.isArray(details.items) ? [...details.items] : [];

  const pickNotedItem = (productId) => {
    const productIdText = String(productId || "");
    const matchIndex = notedItems.findIndex((item) => String(item?.id || "") === productIdText);
    if (matchIndex < 0) {
      return null;
    }
    const [match] = notedItems.splice(matchIndex, 1);
    return match || null;
  };

  const rawItems = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : (details.items || []).map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      }));

  const items = rawItems.map((item) => {
    const itemId = String(item.productId || item.product_id || item.id || "");
    const noted = pickNotedItem(itemId);
    const quantity = toFiniteNumber(item.quantity ?? noted?.quantity, 0);
    const backendUnitPrice = toFiniteNumber(item.unitPrice ?? item.unit_price, 0);
    const notedUnitPrice = toFiniteNumber(noted?.unitPrice, 0);
    const unitPrice = Math.max(backendUnitPrice, notedUnitPrice);

    const computedSubtotal = unitPrice * quantity;
    const backendSubtotal = toFiniteNumber(item.subtotal, 0);
    const notedSubtotal = toFiniteNumber(noted?.subtotal, computedSubtotal);
    const subtotal = Math.max(backendSubtotal, notedSubtotal, computedSubtotal);

    return {
      id: itemId,
      name: item.productName || item.product_name || item.name || noted?.name || "Unnamed Product",
      quantity,
      subtotal,
      unitPrice,
    };
  });

  const deliveryFee = toFiniteNumber(order.deliveryFee ?? order.delivery_fee, 0);
  const derivedSubtotal = items.reduce((sum, item) => sum + toFiniteNumber(item.subtotal, 0), 0);
  const subtotal = Math.max(toFiniteNumber(order.subtotal, 0), derivedSubtotal);
  const total = Math.max(toFiniteNumber(order.total, 0), subtotal + deliveryFee);

  return {
    id: order.orderId || order.id,
    rider_id: order.riderId || order.rider_id || null,
    status: order.status,
    subtotal,
    delivery_fee: deliveryFee,
    total,
    delivery_address: order.deliveryAddress || order.delivery_address,
    created_at: order.createdAt || order.created_at,
    accepted_at: order.acceptedAt || order.accepted_at,
    picked_up_at: order.pickedUpAt || order.picked_up_at,
    arrived_at: order.arrivedAt || order.arrived_at,
    delivered_at: order.deliveredAt || order.delivered_at,
    rider_name: order.riderName || order.rider_name || "",
    rider_phone: order.riderPhone || order.rider_phone || "",
    ...details,
    items,
  };
}

async function hydrateMissingRiderDetails(orders) {
  const normalizedOrders = Array.isArray(orders) ? orders : [];
  if (normalizedOrders.length === 0) {
    return normalizedOrders;
  }

  const unresolvedOrderIds = normalizedOrders
    .filter((order) => !String(order?.rider_name || order?.riderName || "").trim())
    .map((order) => String(order?.id || "").trim())
    .filter(Boolean);

  if (unresolvedOrderIds.length === 0) {
    return normalizedOrders;
  }

  const { data: orderRows, error: orderRowsError } = await supabase
    .from("orders")
    .select("id, rider_id")
    .in("id", unresolvedOrderIds);

  if (orderRowsError || !Array.isArray(orderRows) || orderRows.length === 0) {
    return normalizedOrders;
  }

  const riderIdByOrderId = new Map(
    orderRows
      .map((row) => [String(row?.id || "").trim(), String(row?.rider_id || "").trim()])
      .filter(([orderId, riderId]) => orderId && riderId)
  );

  if (riderIdByOrderId.size === 0) {
    return normalizedOrders;
  }

  const riderIds = Array.from(new Set(Array.from(riderIdByOrderId.values())));
  const { data: riderRows, error: riderRowsError } = await supabase
    .from("users")
    .select("id, full_name, username, phone")
    .in("id", riderIds);

  if (riderRowsError || !Array.isArray(riderRows) || riderRows.length === 0) {
    return normalizedOrders;
  }

  const riderById = new Map(
    riderRows
      .map((row) => [String(row?.id || "").trim(), row])
      .filter(([id]) => id)
  );

  return normalizedOrders.map((order) => {
    const existingName = String(order?.rider_name || order?.riderName || "").trim();
    const existingPhone = String(order?.rider_phone || order?.riderPhone || "").trim();
    if (existingName && existingPhone) {
      return order;
    }

    const orderId = String(order?.id || "").trim();
    const riderId = riderIdByOrderId.get(orderId);
    if (!riderId) {
      return order;
    }

    const rider = riderById.get(riderId);
    if (!rider) {
      return order;
    }

    const resolvedName = existingName || String(rider.full_name || rider.username || "").trim();
    const resolvedPhone = existingPhone || String(rider.phone || "").trim();
    if (!resolvedName && !resolvedPhone) {
      return order;
    }

    return {
      ...order,
      rider_id: riderId,
      rider_name: resolvedName,
      rider_phone: resolvedPhone,
    };
  });
}

export async function getActiveOrders() {
  const response = await orderApi.listMine("active");
  const mappedOrders = (response || []).map(normalizeOrderFromApi);
  const hydratedOrders = await hydrateMissingRiderDetails(mappedOrders);

  return {
    orderIds: (response || []).map((order) => order.orderId || order.id),
    orders: hydratedOrders,
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
