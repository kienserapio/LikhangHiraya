const ONLINE_PAYMENT_DRAFT_KEY = "lh_online_payment_draft";

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeToppings(toppings) {
  if (!toppings || typeof toppings !== "object") {
    return {};
  }

  return Object.entries(toppings)
    .filter(([, quantity]) => toNumber(quantity, 0) > 0)
    .reduce((accumulator, [name, quantity]) => {
      accumulator[name] = toNumber(quantity, 0);
      return accumulator;
    }, {});
}

function normalizeDraftItem(item) {
  return {
    cartKey: String(item?.cartKey || ""),
    id: String(item?.id || ""),
    name: String(item?.name || "Unnamed Item"),
    pricePhp: toNumber(item?.pricePhp, 0),
    imageUrl: String(item?.imageUrl || ""),
    selectedSize: String(item?.selectedSize || "Small"),
    toppings: normalizeToppings(item?.toppings),
    toppingTotal: toNumber(item?.toppingTotal, 0),
    quantity: Math.max(1, Math.trunc(toNumber(item?.quantity, 1))),
    notes: String(item?.notes || ""),
  };
}

function normalizeProfile(profile) {
  return {
    fullName: String(profile?.fullName || ""),
    email: String(profile?.email || ""),
    phone: String(profile?.phone || ""),
    username: String(profile?.username || ""),
    address: String(profile?.address || ""),
    vehicleDetails: String(profile?.vehicleDetails || ""),
  };
}

export function formatPeso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value, 0));
}

export function formatDateTime(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function summarizeOrderItems(items) {
  const normalizedItems = Array.isArray(items) ? items : [];
  if (normalizedItems.length === 0) {
    return "No items";
  }

  const firstName = String(normalizedItems[0]?.name || "Item").trim();
  if (normalizedItems.length === 1) {
    return firstName || "Item";
  }

  const remaining = normalizedItems.length - 1;
  const plural = remaining > 1 ? "items" : "item";
  return `${firstName || "Item"} + ${remaining} more ${plural}`;
}

export function countOrderQuantity(items) {
  const normalizedItems = Array.isArray(items) ? items : [];
  return normalizedItems.reduce((total, item) => total + Math.max(0, Math.trunc(toNumber(item?.quantity, 0))), 0);
}

export function createOnlinePaymentDraft({ profile, items, subtotal, total, paymentMethod }) {
  return {
    id: `opd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    paymentMethod: String(paymentMethod || "ONLINE_PAYMENT"),
    profile: normalizeProfile(profile),
    items: (Array.isArray(items) ? items : []).map(normalizeDraftItem),
    subtotal: toNumber(subtotal, 0),
    total: toNumber(total, 0),
    serviceFee: 0,
    merchantName: "Likhang Hiraya",
  };
}

export function loadOnlinePaymentDraft() {
  try {
    const raw = sessionStorage.getItem(ONLINE_PAYMENT_DRAFT_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return {
      ...parsed,
      profile: normalizeProfile(parsed.profile),
      items: (Array.isArray(parsed.items) ? parsed.items : []).map(normalizeDraftItem),
      subtotal: toNumber(parsed.subtotal, 0),
      total: toNumber(parsed.total, 0),
      serviceFee: toNumber(parsed.serviceFee, 0),
      merchantName: String(parsed.merchantName || "Likhang Hiraya"),
    };
  } catch {
    return null;
  }
}

export function saveOnlinePaymentDraft(draft) {
  sessionStorage.setItem(ONLINE_PAYMENT_DRAFT_KEY, JSON.stringify(draft));
  return draft;
}

export function updateOnlinePaymentDraft(patch) {
  const current = loadOnlinePaymentDraft();
  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...patch,
  };

  return saveOnlinePaymentDraft(next);
}

export function clearOnlinePaymentDraft() {
  sessionStorage.removeItem(ONLINE_PAYMENT_DRAFT_KEY);
}

export function normalizePhilippineMobile(rawValue) {
  const digits = String(rawValue || "").replace(/\D/g, "");

  if (digits.startsWith("63")) {
    return digits.slice(2);
  }

  if (digits.startsWith("0")) {
    return digits.slice(1);
  }

  return digits;
}

export function isValidPhilippineMobile(rawValue) {
  const normalized = normalizePhilippineMobile(rawValue);
  return /^9\d{9}$/.test(normalized);
}

export function maskPhilippineMobile(rawValue) {
  const normalized = normalizePhilippineMobile(rawValue);
  if (!normalized) {
    return "09XX XXXX XXX";
  }

  if (normalized.length < 10) {
    return `0${normalized}`;
  }

  return `0${normalized.slice(0, 3)} ${normalized.slice(3, 7)} ${normalized.slice(7, 10)}`;
}

export function generatePaymentReference() {
  const now = Date.now();
  const randomPart = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `REF-${now}-${randomPart}`;
}
