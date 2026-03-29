import { supabase } from "./supabaseClient";

const DEFAULT_PRODUCT_BUCKET = import.meta.env.VITE_SUPABASE_PRODUCT_BUCKET || "product-images";

function toNumber(value) {
  return Number(value || 0);
}

function toDateKey(value) {
  if (!value) {
    return "";
  }
  return new Date(value).toISOString().slice(0, 10);
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

export async function fetchAdminDashboardSnapshot() {
  const todayIso = startOfTodayIso();

  const [todayOrdersCountRes, todayRevenueRes, activeRidersCountRes, pendingOrdersCountRes, recentOrdersRes, weekOrdersRes] =
    await Promise.all([
      supabase.from("orders").select("id", { head: true, count: "exact" }).gte("created_at", todayIso),
      supabase.from("orders").select("total").gte("created_at", todayIso).eq("status", "DELIVERED"),
      supabase.from("users").select("id", { head: true, count: "exact" }).eq("role", "RIDER").eq("is_online", true),
      supabase.from("orders").select("id", { head: true, count: "exact" }).eq("status", "PENDING"),
      supabase.from("orders").select("id, user_id, status, total, created_at").order("created_at", { ascending: false }).limit(10),
      supabase.from("orders").select("created_at, total").gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

  assertNoError(todayOrdersCountRes.error, "Unable to load today's order count");
  assertNoError(todayRevenueRes.error, "Unable to load today's revenue");
  assertNoError(activeRidersCountRes.error, "Unable to load active riders");
  assertNoError(pendingOrdersCountRes.error, "Unable to load pending orders");
  assertNoError(recentOrdersRes.error, "Unable to load recent orders");
  assertNoError(weekOrdersRes.error, "Unable to load weekly revenue trend");

  const recentOrders = recentOrdersRes.data || [];
  const customerIds = Array.from(new Set(recentOrders.map((order) => order.user_id).filter(Boolean)));

  let customerMap = new Map();
  if (customerIds.length > 0) {
    const usersRes = await supabase.from("users").select("id, full_name, username").in("id", customerIds);
    assertNoError(usersRes.error, "Unable to load customer profiles");
    customerMap = new Map((usersRes.data || []).map((user) => [String(user.id), user]));
  }

  const revenueDays = buildLastSevenDays();
  const revenueByDay = new Map(revenueDays.map((day) => [day.key, 0]));

  for (const order of weekOrdersRes.data || []) {
    const key = toDateKey(order.created_at);
    if (!revenueByDay.has(key)) {
      continue;
    }
    revenueByDay.set(key, revenueByDay.get(key) + toNumber(order.total));
  }

  return {
    kpis: {
      todaysOrders: todayOrdersCountRes.count || 0,
      todaysRevenue: (todayRevenueRes.data || []).reduce((sum, row) => sum + toNumber(row.total), 0),
      activeRiders: activeRidersCountRes.count || 0,
      pendingOrders: pendingOrdersCountRes.count || 0,
    },
    recentOrders: recentOrders.map((order) => {
      const customer = customerMap.get(String(order.user_id));
      return {
        id: String(order.id),
        customerName: customer?.full_name || customer?.username || "Unknown Customer",
        status: order.status || "PENDING",
        total: toNumber(order.total),
      };
    }),
    revenueTrend: revenueDays.map((day) => ({
      day: day.label,
      revenue: Number((revenueByDay.get(day.key) || 0).toFixed(2)),
    })),
  };
}

export async function fetchInventoryProducts() {
  const productsRes = await supabase.from("products").select("*").order("created_at", { ascending: false });
  assertNoError(productsRes.error, "Unable to load products");
  return (productsRes.data || []).map(mapProductRow);
}

export async function quickEditProduct(productId, { pricePhp, stockQuantity }) {
  const nextPayload = {
    price_php: Number(pricePhp),
    stock: Number(stockQuantity),
  };

  const updateRes = await supabase.from("products").update(nextPayload).eq("id", productId).select("*").single();
  assertNoError(updateRes.error, "Unable to update product");
  return mapProductRow(updateRes.data);
}

export async function restockProduct(productId, quantityToAdd) {
  const currentRes = await supabase.from("products").select("id, stock").eq("id", productId).single();
  assertNoError(currentRes.error, "Unable to load current stock");

  const currentStock = toNumber(currentRes.data?.stock);
  const nextStock = currentStock + Number(quantityToAdd || 0);

  const updateRes = await supabase
    .from("products")
    .update({ stock: nextStock })
    .eq("id", productId)
    .select("*")
    .single();

  assertNoError(updateRes.error, "Unable to restock product");
  return mapProductRow(updateRes.data);
}

export async function uploadProductImage(file) {
  if (!file) {
    return "";
  }

  const extension = String(file.name || "").split(".").pop() || "jpg";
  const safeExt = extension.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
  const filePath = `products/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;

  const uploadRes = await supabase.storage.from(DEFAULT_PRODUCT_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  assertNoError(uploadRes.error, `Unable to upload image to bucket \"${DEFAULT_PRODUCT_BUCKET}\"`);

  const publicUrlRes = supabase.storage.from(DEFAULT_PRODUCT_BUCKET).getPublicUrl(filePath);
  return publicUrlRes.data?.publicUrl || "";
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
