import { orderApi } from "./api";
import { subscribeLocalData } from "./localData";

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

function rememberActiveOrderId(orderId) {
  const current = safeJsonParse(localStorage.getItem(ACTIVE_ORDER_IDS_KEY) || "[]", []);
  const deduped = [orderId, ...current.filter((value) => value !== orderId)].slice(0, 25);
  localStorage.setItem(ACTIVE_ORDER_IDS_KEY, JSON.stringify(deduped));
}

export async function createActiveOrder({ profile, items, paymentMethod, subtotal, total }) {
  const payload = {
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
      unitPrice: Number(item.pricePhp),
    })),
  };

  const response = await orderApi.placeOrder(payload);
  rememberActiveOrderId(response.orderId);
  return response;
}

function normalizeOrderFromApi(order) {
  const details = parseOrderNotes(order.specialNotes);
  return {
    id: order.orderId,
    status: order.status,
    subtotal: order.subtotal,
    delivery_fee: order.deliveryFee,
    total: order.total,
    delivery_address: order.deliveryAddress,
    created_at: order.createdAt,
    accepted_at: order.acceptedAt,
    picked_up_at: order.pickedUpAt,
    arrived_at: order.arrivedAt,
    delivered_at: order.deliveredAt,
    ...details,
    items: order.items.map((item) => ({
      id: item.productId,
      name: item.productName,
      quantity: item.quantity,
      subtotal: item.subtotal,
      unitPrice: item.unitPrice,
    })),
  };
}

export async function getActiveOrders() {
  const response = await orderApi.listMine("active");
  return {
    orderIds: response.map((order) => order.orderId),
    orders: response.map(normalizeOrderFromApi),
  };
}

export async function clearActiveOrders() {
  await orderApi.clearMineActive();
}

export function subscribeToActiveOrders(_orderIds, onRefresh) {
  return subscribeLocalData(onRefresh);
}
