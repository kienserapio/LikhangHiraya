const CUSTOMER_SEEN_DELIVERY_SUCCESS_KEY = "lh_customer_seen_delivery_success_orders";
const RIDER_SEEN_DELIVERY_SUCCESS_KEY = "lh_rider_seen_delivery_success_orders";

function loadSeenIds(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((value) => String(value || "")).filter(Boolean);
  } catch {
    return [];
  }
}

function saveSeenIds(storageKey, ids) {
  const deduped = Array.from(new Set(ids.map((value) => String(value || "")).filter(Boolean)));
  localStorage.setItem(storageKey, JSON.stringify(deduped));
}

function hasSeen(storageKey, orderId) {
  const normalizedOrderId = String(orderId || "").trim();
  if (!normalizedOrderId) {
    return false;
  }
  return loadSeenIds(storageKey).includes(normalizedOrderId);
}

function markSeen(storageKey, orderId) {
  const normalizedOrderId = String(orderId || "").trim();
  if (!normalizedOrderId) {
    return;
  }
  const current = loadSeenIds(storageKey);
  if (current.includes(normalizedOrderId)) {
    return;
  }
  saveSeenIds(storageKey, [...current, normalizedOrderId]);
}

export function hasCustomerDeliverySuccessBeenSeen(orderId) {
  return hasSeen(CUSTOMER_SEEN_DELIVERY_SUCCESS_KEY, orderId);
}

export function markCustomerDeliverySuccessSeen(orderId) {
  markSeen(CUSTOMER_SEEN_DELIVERY_SUCCESS_KEY, orderId);
}

export function hasRiderDeliverySuccessBeenSeen(orderId) {
  return hasSeen(RIDER_SEEN_DELIVERY_SUCCESS_KEY, orderId);
}

export function markRiderDeliverySuccessSeen(orderId) {
  markSeen(RIDER_SEEN_DELIVERY_SUCCESS_KEY, orderId);
}
