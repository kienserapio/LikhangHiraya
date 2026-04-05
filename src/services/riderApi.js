import { riderApi } from "./api";
import { supabase } from "./supabaseClient";

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getRiderIdentity() {
  const authUser = safeJsonParse(localStorage.getItem("lh_auth_user") || "null", null);
  const profile = safeJsonParse(localStorage.getItem("lh_profile") || "{}", {});

  return {
    username: String(authUser?.username || profile?.username || "").trim(),
    email: String(profile?.email || "").trim(),
  };
}

function mapRiderProfileRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id || ""),
    fullName: row.full_name || row.username || "Rider",
    username: row.username || "",
    email: row.email || "",
    phone: row.phone || "",
    vehicleType: row.vehicle_type || "",
    createdAt: row.created_at || "",
  };
}

export async function fetchRiderDashboard() {
  return riderApi.dashboard();
}

export async function setRiderOnline(online, workingShift) {
  return riderApi.setAvailability({ online, workingShift });
}

export async function acceptRiderOrder(orderId) {
  return riderApi.acceptOrder(orderId);
}

export async function declineRiderOrder(orderId) {
  return riderApi.declineOrder(orderId);
}

export async function confirmPickup(orderId) {
  return riderApi.confirmPickup(orderId);
}

export async function startTransit(orderId) {
  return riderApi.startTransit(orderId);
}

export async function confirmArrival(orderId) {
  return riderApi.confirmArrival(orderId);
}

export async function completeRiderDelivery(orderId) {
  return riderApi.completeDelivery(orderId);
}

export async function fetchRiderProfile() {
  const identity = getRiderIdentity();
  if (!identity.username && !identity.email) {
    return null;
  }

  let query = supabase
    .from("users")
    .select("id, full_name, username, email, phone, role, vehicle_type, created_at");

  if (identity.username) {
    query = query.eq("username", identity.username);
  } else {
    query = query.eq("email", identity.email);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(`Unable to load rider profile: ${error.message}`);
  }

  return mapRiderProfileRow(data);
}

export async function updateRiderProfile(changes) {
  const identity = getRiderIdentity();
  if (!identity.username && !identity.email) {
    throw new Error("No logged-in rider identity found.");
  }

  const payload = {};
  if (Object.prototype.hasOwnProperty.call(changes, "fullName")) {
    payload.full_name = String(changes.fullName || "").trim();
  }
  if (Object.prototype.hasOwnProperty.call(changes, "phone")) {
    payload.phone = String(changes.phone || "").trim();
  }
  if (Object.prototype.hasOwnProperty.call(changes, "vehicleType")) {
    payload.vehicle_type = String(changes.vehicleType || "").trim();
  }

  if (Object.keys(payload).length === 0) {
    return fetchRiderProfile();
  }

  let query = supabase
    .from("users")
    .update(payload)
    .select("id, full_name, username, email, phone, role, vehicle_type, created_at");

  if (identity.username) {
    query = query.eq("username", identity.username);
  } else {
    query = query.eq("email", identity.email);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(`Unable to update rider profile: ${error.message}`);
  }

  return mapRiderProfileRow(data);
}

export function subscribeToRiderOrders(onRefresh) {
  const channel = supabase
    .channel(`rider-orders-${Date.now()}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => {
      onRefresh();
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => {
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
