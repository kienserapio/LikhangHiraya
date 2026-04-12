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
        const requestError = new Error(toErrorMessage(response, payload, responseText));
        requestError.status = response.status;
        requestError.path = path;
        throw requestError;
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

async function resolveIdentifierFromSupabase(identifier) {
  const normalizedIdentifier = String(identifier || "").trim();

  if (!normalizedIdentifier) {
    throw new Error("Identifier is required.");
  }

  if (normalizedIdentifier.includes("@")) {
    return { email: normalizedIdentifier.toLowerCase() };
  }

  const usersResult = await supabase
    .from("users")
    .select("email")
    .ilike("username", normalizedIdentifier)
    .limit(1)
    .maybeSingle();

  if (!usersResult.error && usersResult.data?.email) {
    return { email: String(usersResult.data.email).trim().toLowerCase() };
  }

  const profilesResult = await supabase
    .from("profiles")
    .select("email")
    .ilike("username", normalizedIdentifier)
    .limit(1)
    .maybeSingle();

  if (!profilesResult.error && profilesResult.data?.email) {
    return { email: String(profilesResult.data.email).trim().toLowerCase() };
  }

  if (usersResult.error && usersResult.error.code !== "PGRST116") {
    throw new Error(`Unable to resolve account: ${usersResult.error.message}`);
  }

  if (profilesResult.error && profilesResult.error.code !== "PGRST116") {
    throw new Error(`Unable to resolve account: ${profilesResult.error.message}`);
  }

  throw new Error("Account not found.");
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

function normalizeRole(value) {
  const role = String(value || "CUSTOMER").trim().toUpperCase();
  if (role === "ADMIN" || role === "RIDER") {
    return role;
  }
  return "CUSTOMER";
}

function normalizeAuthUserRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id || ""),
    username: String(row.username || ""),
    fullName: row.full_name || row.username || "User",
    email: row.email || "",
    phone: row.phone || "",
    address: row.address || "",
    role: normalizeRole(row.role),
    passwordHash: String(row.password_hash || ""),
  };
}

function toAuthResponse(user) {
  return {
    token: `supabase-db-token-${user.username}-${Date.now()}`,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    address: user.address,
    role: user.role,
  };
}

function isUniqueViolation(error) {
  return String(error?.code || "") === "23505";
}

function duplicateFieldMessage(error) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("users_email_key")) {
    return "Email is already registered.";
  }
  if (message.includes("users_username_key")) {
    return "Username is already taken.";
  }
  return "Account already exists.";
}

async function findUserByUsernameOrEmail(usernameOrEmail) {
  const identity = String(usernameOrEmail || "").trim();
  if (!identity) {
    return null;
  }

  const baseSelect = "id, full_name, email, phone, username, password_hash, address, role";

  const usernameRes = await supabase
    .from("users")
    .select(baseSelect)
    .ilike("username", identity)
    .limit(1);

  if (usernameRes.error) {
    throw new Error(`Unable to verify credentials: ${usernameRes.error.message}`);
  }

  if (Array.isArray(usernameRes.data) && usernameRes.data[0]) {
    return normalizeAuthUserRow(usernameRes.data[0]);
  }

  const emailRes = await supabase
    .from("users")
    .select(baseSelect)
    .ilike("email", identity)
    .limit(1);

  if (emailRes.error) {
    throw new Error(`Unable to verify credentials: ${emailRes.error.message}`);
  }

  if (Array.isArray(emailRes.data) && emailRes.data[0]) {
    return normalizeAuthUserRow(emailRes.data[0]);
  }

  return null;
}

async function createDatabaseAccount(payload, role) {
  const normalizedRole = normalizeRole(role);
  const fullName = String(payload.fullName || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const phone = String(payload.phone || "").trim();
  const username = String(payload.username || "").trim();
  const password = String(payload.password || "");
  const address = String(payload.address || "").trim();

  if (!fullName || !email || !phone || !username || !password || !address) {
    throw new Error("Please complete all required fields.");
  }

  const row = {
    full_name: fullName,
    email,
    phone,
    username,
    password_hash: password,
    address,
    role: normalizedRole,
    vehicle_type: normalizedRole === "RIDER" ? (payload.vehicleType || null) : null,
    plate_number: normalizedRole === "RIDER" ? (payload.plateNumber || null) : null,
    drivers_license_number: normalizedRole === "RIDER" ? (payload.driversLicenseNumber || null) : null,
    emergency_contact_name: normalizedRole === "RIDER" ? (payload.emergencyContactName || null) : null,
    emergency_contact_phone: normalizedRole === "RIDER" ? (payload.emergencyContactPhone || null) : null,
    gcash_number: normalizedRole === "RIDER" ? (payload.gcashNumber || null) : null,
    working_shift: normalizedRole === "RIDER" ? (payload.workingShift || null) : null,
    is_online: false,
  };

  const { data, error } = await supabase
    .from("users")
    .insert(row)
    .select("id, full_name, email, phone, username, password_hash, address, role")
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      throw new Error(duplicateFieldMessage(error));
    }
    throw new Error(`Unable to create account in database: ${error.message}`);
  }

  return normalizeAuthUserRow(data);
}

async function loginAgainstDatabase(payload) {
  const usernameOrEmail = String(payload?.usernameOrEmail || "").trim();
  const password = String(payload?.password || "");

  if (!usernameOrEmail || !password) {
    throw new Error("Username/email and password are required.");
  }

  const user = await findUserByUsernameOrEmail(usernameOrEmail);
  if (!user) {
    throw new Error("Account not found. Please sign up first.");
  }

  if (!user.passwordHash || user.passwordHash !== password) {
    throw new Error("Invalid username/email or password.");
  }

  return toAuthResponse(user);
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
  login: (payload) => loginAgainstDatabase(payload),
  register: async (payload) => {
    await createDatabaseAccount(payload, "CUSTOMER");
    return { success: true };
  },
  registerRider: async (payload) => {
    await createDatabaseAccount(payload, "RIDER");
    return { success: true };
  },
};

export const usersApi = {
  resolveIdentifier: async (identifier) => {
    const normalizedIdentifier = String(identifier || "").trim();
    const endpoint = `/api/users/resolve-identifier/${encodeURIComponent(normalizedIdentifier)}`;

    try {
      return await apiRequest(endpoint);
    } catch (error) {
      const message = String(error?.message || "").trim().toLowerCase();
      const status = Number(error?.status || 0);

      // If the deployed backend does not yet expose this endpoint, fall back to Supabase.
      const endpointMissing = status === 404 && message === "not found";
      const backendOffline = message.includes("could not connect to the server");

      if (!endpointMissing && !backendOffline) {
        throw error;
      }

      return resolveIdentifierFromSupabase(normalizedIdentifier);
    }
  },
};

export const productApi = {
  list: () => listProductsFromSupabase(),
};

export const orderApi = {
  placeOrder: (payload) => apiRequest("/api/orders", { method: "POST", body: payload }),
  listMine: (scope = "active") => apiRequest("/api/orders/mine", { query: { scope } }),
  listHistory: () => apiRequest("/api/orders/history"),
  clearMineActive: () => apiRequest("/api/orders/mine/active", { method: "DELETE" }),
  getById: (orderId) => apiRequest(`/api/orders/${encodeURIComponent(orderId)}`),
  decline: (orderId) =>
    apiRequest(`/api/orders/${encodeURIComponent(orderId)}/decline`, {
      method: "PATCH",
    }),
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
  declineOrder: (orderId) => orderApi.decline(orderId),
  confirmPickup: (orderId) => orderApi.updateStatus(orderId, "PICKED_UP"),
  startTransit: (orderId) => orderApi.updateStatus(orderId, "IN_TRANSIT"),
  confirmArrival: (orderId) => orderApi.updateStatus(orderId, "ARRIVED"),
  completeDelivery: (orderId) => orderApi.updateStatus(orderId, "DELIVERED"),
};
