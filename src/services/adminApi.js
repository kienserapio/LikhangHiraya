import { supabase } from "./supabaseClient";

const CONFIGURED_PRODUCT_BUCKET = String(import.meta.env.VITE_SUPABASE_PRODUCT_BUCKET || "").trim();
const DEFAULT_PRODUCT_BUCKET = "assets";
const PRODUCT_BUCKET_CANDIDATES = Array.from(
  new Set([
    CONFIGURED_PRODUCT_BUCKET,
    DEFAULT_PRODUCT_BUCKET,
    "product-images",
  ].filter(Boolean))
);

function toNumber(value) {
  return Number(value || 0);
}

function toDateKey(value) {
  if (!value) {
    return "";
  }
  return new Date(value).toISOString().slice(0, 10);
}

function toMonthKey(value) {
  if (!value) {
    return "";
  }
  return new Date(value).toISOString().slice(0, 7);
}

function toYearKey(value) {
  if (!value) {
    return "";
  }
  return String(new Date(value).getUTCFullYear());
}

function startOfTodayIso() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function buildLastSevenDays() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const current = new Date(today);
    current.setDate(today.getDate() - offset);
    days.push({
      key: current.toISOString().slice(0, 10),
      label: current.toLocaleDateString("en-PH", { weekday: "short" }),
    });
  }

  return days;
}

function normalizeDashboardRange(range) {
  const normalized = String(range || "").trim().toUpperCase();
  if (normalized === "MONTH" || normalized === "YEAR") {
    return normalized;
  }
  return "WEEK";
}

function buildRevenueBuckets(range) {
  const normalizedRange = normalizeDashboardRange(range);

  if (normalizedRange === "MONTH") {
    const now = new Date();
    const buckets = [];

    for (let offset = 11; offset >= 0; offset -= 1) {
      const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
      buckets.push({
        key: current.toISOString().slice(0, 7),
        label: current.toLocaleDateString("en-PH", { month: "short", year: "numeric" }),
      });
    }

    return {
      range: normalizedRange,
      sinceIso: `${buckets[0].key}-01T00:00:00.000Z`,
      buckets,
      keySelector: (createdAt) => toMonthKey(createdAt),
    };
  }

  if (normalizedRange === "YEAR") {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const buckets = [];

    for (let year = currentYear - 4; year <= currentYear; year += 1) {
      buckets.push({
        key: String(year),
        label: String(year),
      });
    }

    return {
      range: normalizedRange,
      sinceIso: `${buckets[0].key}-01-01T00:00:00.000Z`,
      buckets,
      keySelector: (createdAt) => toYearKey(createdAt),
    };
  }

  const days = buildLastSevenDays();
  return {
    range: "WEEK",
    sinceIso: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    buckets: days,
    keySelector: (createdAt) => toDateKey(createdAt),
  };
}

function mapProductRow(row) {
  const stockQuantity = toNumber(row.stock);
  return {
    id: String(row.id),
    name: row.name || "Unnamed Product",
    category: row.category || "UNCATEGORIZED",
    description: row.description || "",
    pricePhp: toNumber(row.price_php),
    imageUrl: row.image_url || "",
    stockQuantity,
    status: stockQuantity > 0 ? "Available" : "Hidden",
  };
}

function assertNoError(error, contextMessage) {
  if (!error) {
    return;
  }
  throw new Error(`${contextMessage}: ${error.message}`);
}

function isBucketNotFoundError(error) {
  return String(error?.message || "").toLowerCase().includes("bucket not found");
}

function isStorageRlsError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("row-level security") || message.includes("violates row-level security policy");
}

async function getProductById(productId, contextMessage) {
  const productRes = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
  assertNoError(productRes.error, contextMessage);

  if (!productRes.data) {
    throw new Error(`${contextMessage}: Product not found.`);
  }

  return mapProductRow(productRes.data);
}

export async function fetchAdminDashboardSnapshot(range = "WEEK") {
  const todayIso = startOfTodayIso();
  const revenueConfig = buildRevenueBuckets(range);

  const [todayOrdersCountRes, todayRevenueRes, activeRidersCountRes, pendingOrdersCountRes, recentOrdersRes, revenueOrdersRes] =
    await Promise.all([
      supabase.from("orders").select("id", { head: true, count: "exact" }).gte("created_at", todayIso),
      supabase.from("orders").select("total").gte("created_at", todayIso).eq("status", "DELIVERED"),
      supabase.from("users").select("id", { head: true, count: "exact" }).eq("role", "RIDER").eq("is_online", true),
      supabase.from("orders").select("id", { head: true, count: "exact" }).eq("status", "PENDING"),
      supabase.from("orders").select("id, user_id, rider_id, status, total, created_at").order("created_at", { ascending: false }).limit(20),
      supabase
        .from("orders")
        .select("created_at, total")
        .eq("status", "DELIVERED")
        .gte("created_at", revenueConfig.sinceIso),
    ]);

  assertNoError(todayOrdersCountRes.error, "Unable to load today's order count");
  assertNoError(todayRevenueRes.error, "Unable to load today's revenue");
  assertNoError(activeRidersCountRes.error, "Unable to load active riders");
  assertNoError(pendingOrdersCountRes.error, "Unable to load pending orders");
  assertNoError(recentOrdersRes.error, "Unable to load recent orders");
  assertNoError(revenueOrdersRes.error, "Unable to load revenue trend");

  const recentOrders = recentOrdersRes.data || [];
  const customerIds = Array.from(new Set(recentOrders.map((order) => order.user_id).filter(Boolean)));
  const riderIds = Array.from(new Set(recentOrders.map((order) => order.rider_id).filter(Boolean)));
  const relatedUserIds = Array.from(new Set([...customerIds, ...riderIds]));

  let usersMap = new Map();
  if (relatedUserIds.length > 0) {
    const usersRes = await supabase.from("users").select("id, full_name, username").in("id", relatedUserIds);
    assertNoError(usersRes.error, "Unable to load customer profiles");
    usersMap = new Map((usersRes.data || []).map((user) => [String(user.id), user]));
  }

  const revenueByBucket = new Map(revenueConfig.buckets.map((bucket) => [bucket.key, 0]));

  for (const order of revenueOrdersRes.data || []) {
    const key = revenueConfig.keySelector(order.created_at);
    if (!revenueByBucket.has(key)) {
      continue;
    }
    revenueByBucket.set(key, revenueByBucket.get(key) + toNumber(order.total));
  }

  return {
    range: revenueConfig.range,
    kpis: {
      todaysOrders: todayOrdersCountRes.count || 0,
      todaysRevenue: (todayRevenueRes.data || []).reduce((sum, row) => sum + toNumber(row.total), 0),
      activeRiders: activeRidersCountRes.count || 0,
      pendingOrders: pendingOrdersCountRes.count || 0,
    },
    recentOrders: recentOrders.map((order) => {
      const customer = usersMap.get(String(order.user_id));
      const rider = usersMap.get(String(order.rider_id));
      return {
        id: String(order.id),
        customerName: customer?.full_name || customer?.username || "Unknown Customer",
        riderId: order.rider_id ? String(order.rider_id) : "",
        riderName: rider?.full_name || rider?.username || "",
        status: order.status || "PENDING",
        createdAt: order.created_at || "",
        total: toNumber(order.total),
      };
    }),
    revenueTrend: revenueConfig.buckets.map((bucket) => ({
      label: bucket.label,
      revenue: Number((revenueByBucket.get(bucket.key) || 0).toFixed(2)),
    })),
  };
}

export async function fetchAdminOrdersHistory() {
  const ordersRes = await supabase
    .from("orders")
    .select("id, user_id, rider_id, status, subtotal, delivery_fee, total, created_at, accepted_at, picked_up_at, arrived_at, delivered_at")
    .order("created_at", { ascending: false });

  assertNoError(ordersRes.error, "Unable to load orders history");

  const orders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
  if (orders.length === 0) {
    return [];
  }

  const customerIds = Array.from(new Set(orders.map((order) => order.user_id).filter(Boolean)));
  const riderIds = Array.from(new Set(orders.map((order) => order.rider_id).filter(Boolean)));
  const relatedUserIds = Array.from(new Set([...customerIds, ...riderIds]));

  let usersMap = new Map();
  if (relatedUserIds.length > 0) {
    const usersRes = await supabase.from("users").select("id, full_name, username, role").in("id", relatedUserIds);
    assertNoError(usersRes.error, "Unable to load order-related users");
    usersMap = new Map((usersRes.data || []).map((user) => [String(user.id), user]));
  }

  return orders.map((order) => {
    const customer = usersMap.get(String(order.user_id));
    const rider = usersMap.get(String(order.rider_id));

    return {
      id: String(order.id),
      status: String(order.status || "PENDING").toUpperCase(),
      customerName: customer?.full_name || customer?.username || "Unknown Customer",
      riderName: rider?.full_name || rider?.username || "Unassigned",
      riderRole: String(rider?.role || "").toUpperCase(),
      subtotal: toNumber(order.subtotal),
      deliveryFee: toNumber(order.delivery_fee),
      total: toNumber(order.total),
      createdAt: order.created_at || "",
      acceptedAt: order.accepted_at || "",
      pickedUpAt: order.picked_up_at || "",
      arrivedAt: order.arrived_at || "",
      deliveredAt: order.delivered_at || "",
    };
  });
}

export async function fetchInventoryProducts() {
  const productsRes = await supabase.from("products").select("*").order("created_at", { ascending: false });
  assertNoError(productsRes.error, "Unable to load products");
  return (productsRes.data || []).map(mapProductRow);
}

export async function quickEditProduct(productId, { pricePhp, availability, currentStock }) {
  const nextPayload = {
    price_php: Number(pricePhp),
  };

  const normalizedAvailability = String(availability || "").trim().toUpperCase();
  const normalizedCurrentStock = Number(currentStock || 0);

  if (normalizedAvailability === "HIDE") {
    nextPayload.stock = 0;
  }

  if (normalizedAvailability === "SHOW" && normalizedCurrentStock <= 0) {
    throw new Error("Cannot set availability to Show while stock is 0. Use Restock to add stock first.");
  }

  const updateRes = await supabase.from("products").update(nextPayload).eq("id", productId).select("*").maybeSingle();
  assertNoError(updateRes.error, "Unable to update product");

  if (updateRes.data) {
    return mapProductRow(updateRes.data);
  }

  return getProductById(productId, "Unable to update product");
}

export async function restockProduct(productId, quantityToAdd) {
  const currentRes = await supabase.from("products").select("id, stock").eq("id", productId).maybeSingle();
  assertNoError(currentRes.error, "Unable to load current stock");

  if (!currentRes.data) {
    throw new Error("Unable to load current stock: Product not found.");
  }

  const currentStock = toNumber(currentRes.data?.stock);
  const nextStock = currentStock + Number(quantityToAdd || 0);

  const updateRes = await supabase
    .from("products")
    .update({ stock: nextStock })
    .eq("id", productId)
    .select("*")
    .maybeSingle();

  assertNoError(updateRes.error, "Unable to restock product");

  if (updateRes.data) {
    return mapProductRow(updateRes.data);
  }

  return getProductById(productId, "Unable to restock product");
}

export async function uploadProductImage(file) {
  if (!file) {
    return "";
  }

  const extension = String(file.name || "").split(".").pop() || "jpg";
  const safeExt = extension.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
  const filePath = `products/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;

  let lastUploadError = null;
  for (const bucketName of PRODUCT_BUCKET_CANDIDATES) {
    const uploadRes = await supabase.storage.from(bucketName).upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadRes.error) {
      lastUploadError = uploadRes.error;
      if (isBucketNotFoundError(uploadRes.error)) {
        continue;
      }

      if (isStorageRlsError(uploadRes.error)) {
        throw new Error(
          `Unable to upload image to bucket \"${bucketName}\": storage RLS blocked INSERT. Add an INSERT policy on storage.objects for this bucket (anon role for current app setup).`
        );
      }

      throw new Error(`Unable to upload image to bucket \"${bucketName}\": ${uploadRes.error.message}`);
    }

    const publicUrlRes = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return publicUrlRes.data?.publicUrl || "";
  }

  const primaryBucket = PRODUCT_BUCKET_CANDIDATES[0] || DEFAULT_PRODUCT_BUCKET;
  throw new Error(`Unable to upload image to bucket \"${primaryBucket}\": ${lastUploadError?.message || "Unknown storage error"}`);
}

export async function addInventoryProduct({ name, category, pricePhp, description, imageUrl }) {
  const insertPayload = {
    name: String(name || "").trim(),
    category: String(category || "").trim() || "COFFEE",
    price_php: Number(pricePhp || 0),
    description: String(description || "").trim(),
    image_url: imageUrl || null,
    stock: 0,
  };

  const insertRes = await supabase.from("products").insert(insertPayload).select("*").single();
  assertNoError(insertRes.error, "Unable to add product");
  return mapProductRow(insertRes.data);
}

export async function fetchAnalyticsSnapshot() {
  const deliveredOrdersRes = await supabase.from("orders").select("id, rider_id").eq("status", "DELIVERED");
  assertNoError(deliveredOrdersRes.error, "Unable to load delivered orders");

  const deliveredOrders = deliveredOrdersRes.data || [];
  const deliveredOrderIds = deliveredOrders.map((order) => String(order.id));

  let orderItems = [];
  if (deliveredOrderIds.length > 0) {
    const orderItemsRes = await supabase
      .from("order_items")
      .select("order_id, product_id, quantity, subtotal")
      .in("order_id", deliveredOrderIds);
    assertNoError(orderItemsRes.error, "Unable to load delivered order items");
    orderItems = orderItemsRes.data || [];
  }

  const productIds = Array.from(new Set(orderItems.map((item) => String(item.product_id)).filter(Boolean)));
  let productsMap = new Map();
  if (productIds.length > 0) {
    const productsRes = await supabase.from("products").select("id, name, category").in("id", productIds);
    assertNoError(productsRes.error, "Unable to load products for analytics");
    productsMap = new Map((productsRes.data || []).map((product) => [String(product.id), product]));
  }

  const categorySalesMap = new Map();
  const topSellersMap = new Map();

  for (const item of orderItems) {
    const product = productsMap.get(String(item.product_id));
    const category = product?.category || "UNCATEGORIZED";
    const productName = product?.name || "Unknown Product";

    categorySalesMap.set(category, (categorySalesMap.get(category) || 0) + toNumber(item.subtotal));

    const currentTop = topSellersMap.get(productName) || { name: productName, quantity: 0 };
    topSellersMap.set(productName, {
      name: productName,
      quantity: currentTop.quantity + toNumber(item.quantity),
    });
  }

  const riderCounts = new Map();
  for (const order of deliveredOrders) {
    if (!order.rider_id) {
      continue;
    }
    riderCounts.set(String(order.rider_id), (riderCounts.get(String(order.rider_id)) || 0) + 1);
  }

  const riderIds = Array.from(riderCounts.keys());
  let ridersMap = new Map();
  if (riderIds.length > 0) {
    const ridersRes = await supabase.from("users").select("id, full_name, username").in("id", riderIds);
    assertNoError(ridersRes.error, "Unable to load rider performance data");
    ridersMap = new Map((ridersRes.data || []).map((rider) => [String(rider.id), rider]));
  }

  return {
    categorySales: Array.from(categorySalesMap.entries())
      .map(([category, sales]) => ({ category, sales: Number(sales.toFixed(2)) }))
      .sort((a, b) => b.sales - a.sales),
    topSellers: Array.from(topSellersMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5),
    riderPerformance: riderIds
      .map((riderId) => {
        const rider = ridersMap.get(riderId);
        return {
          riderName: rider?.full_name || rider?.username || "Unknown Rider",
          completedDeliveries: riderCounts.get(riderId) || 0,
        };
      })
      .sort((a, b) => b.completedDeliveries - a.completedDeliveries),
  };
}

export async function fetchLowStockProducts(threshold = 5) {
  const lowStockRes = await supabase
    .from("products")
    .select("id, name, stock")
    .lte("stock", threshold)
    .order("stock", { ascending: true });

  assertNoError(lowStockRes.error, "Unable to load low-stock products");

  return (lowStockRes.data || []).map((item) => ({
    id: String(item.id),
    name: item.name || "Unnamed Product",
    stockQuantity: toNumber(item.stock),
  }));
}
