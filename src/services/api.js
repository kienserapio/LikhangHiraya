import { localAuthApi } from "./localData";
import { supabase } from "./supabaseClient";

const configuredApiBaseUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
const API_BASE_URL_CANDIDATES = Array.from(
  new Set(
    [
      configuredApiBaseUrl,
      "http://localhost:8081",
      "http://127.0.0.1:8081",
      "http://localhost:8080",
      "http://127.0.0.1:8080",
    ].filter(Boolean)
  )
);

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getUserContextHeaders() {
  const authUser = safeJsonParse(localStorage.getItem("lh_auth_user") || "null", null);
  const profile = safeJsonParse(localStorage.getItem("lh_profile") || "{}", {});

  return {
    "X-Username": authUser?.username || profile?.username || "guest",
    "X-Role": authUser?.role || "CUSTOMER",
    "X-Full-Name": profile?.fullName || "",
    "X-Email": profile?.email || "",
    "X-Phone": profile?.phone || "",
    "X-Address": profile?.address || "",
  };
}

function buildUrl(path, query, apiBaseUrl) {
  const url = new URL(`${apiBaseUrl}${path}`);
  if (!query) {
    return url.toString();
  }

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

function toErrorMessage(response, payload, fallbackText) {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }
  if (payload && typeof payload === "object") {
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  }
  if (fallbackText?.trim()) {
    return fallbackText;
  }
  return `Request failed with status ${response.status}`;
}

export async function apiRequest(path, options = {}) {
  const { method = "GET", query, body, headers = {} } = options;

  const requestHeaders = {
    Accept: "application/json",
    ...getUserContextHeaders(),
    ...headers,
  };

  const requestInit = {
    method,
    headers: requestHeaders,
  };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
    requestInit.body = JSON.stringify(body);
  }

  let lastNetworkError = null;

  for (const apiBaseUrl of API_BASE_URL_CANDIDATES) {
    const url = buildUrl(path, query, apiBaseUrl);

    try {
      const response = await fetch(url, requestInit);
      const responseText = await response.text();
      const payload = responseText ? safeJsonParse(responseText, responseText) : null;

      if (!response.ok) {
        throw new Error(toErrorMessage(response, payload, responseText));
      }

      return payload === null ? {} : payload;
    } catch (error) {
      if (error instanceof TypeError) {
        lastNetworkError = error;
        continue;
      }
      throw error;
    }
  }

  if (lastNetworkError) {
    throw new Error("Could not connect to the server. Please start the backend on localhost:8081.");
  }

  throw new Error("Could not connect to the server.");
}

function mapProductRow(row) {
  return {
    id: String(row.id),
    name: row.name || "Unnamed Product",
    category: String(row.category || "UNCATEGORIZED").trim().toUpperCase(),
    description: row.description || "",
    pricePhp: Number(row.price_php || 0),
    imageUrl: row.image_url || "",
    stock: Number(row.stock || 0),
    rating: 4.8,
  };
}

async function listProductsFromSupabase() {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, category, description, price_php, image_url, stock")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load products from Supabase: ${error.message}`);
  }

  return (data || []).map(mapProductRow);
}

export const authApi = {
  login: (payload) => localAuthApi.login(payload),
  register: (payload) => localAuthApi.register(payload),
  registerRider: (payload) => localAuthApi.registerRider(payload),
};

export const productApi = {
  list: () => listProductsFromSupabase(),
};

export const orderApi = {
  placeOrder: (payload) => apiRequest("/api/orders", { method: "POST", body: payload }),
  listMine: (scope = "active") => apiRequest("/api/orders/mine", { query: { scope } }),
  clearMineActive: () => apiRequest("/api/orders/mine/active", { method: "DELETE" }),
  getById: (orderId) => apiRequest(`/api/orders/${encodeURIComponent(orderId)}`),
  updateStatus: (orderId, newStatus) =>
    apiRequest(`/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: "PATCH",
      body: { newStatus },
    }),
};

export const riderApi = {
  dashboard: () => apiRequest("/api/rider/dashboard"),
  setAvailability: (payload) => apiRequest("/api/rider/availability", { method: "PATCH", body: payload }),
  acceptOrder: (orderId) => orderApi.updateStatus(orderId, "CONFIRMED"),
  declineOrder: (orderId) => apiRequest(`/api/rider/orders/${encodeURIComponent(orderId)}/decline`, { method: "POST" }),
  confirmPickup: (orderId) => orderApi.updateStatus(orderId, "PICKED_UP"),
  startTransit: (orderId) => orderApi.updateStatus(orderId, "IN_TRANSIT"),
  confirmArrival: (orderId) => orderApi.updateStatus(orderId, "ARRIVED"),
  completeDelivery: (orderId) => orderApi.updateStatus(orderId, "DELIVERED"),
};
