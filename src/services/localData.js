import { mockProducts } from "../pages/mockProducts";

const USERS_KEY = "lh_local_users";
const ORDERS_KEY = "lh_local_orders";
const RIDER_STATE_KEY = "lh_local_rider_state";
const AUTH_USER_KEY = "lh_auth_user";
const PROFILE_KEY = "lh_profile";

const activeStatuses = ["PENDING", "CONFIRMED", "PREPARING", "RIDER_ASSIGNED", "PICKED_UP", "IN_TRANSIT", "ARRIVED"];

const subscribers = new Set();

function emitChange() {
  subscribers.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore subscriber failures to keep updates flowing.
    }
  });
}

export function subscribeLocalData(listener) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

const autoCustomers = [
  { name: "Lara Mendoza", phone: "09172345670", address: "Legarda St, Sampaloc, Manila" },
  { name: "Paolo Diaz", phone: "09172345671", address: "Quirino Ave, Malate, Manila" },
  { name: "Mika Tan", phone: "09172345672", address: "Binondo, Manila" },
  { name: "Rina Lopez", phone: "09172345673", address: "UN Avenue, Ermita, Manila" },
];

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadUsers() {
  return readJson(USERS_KEY, []);
}

function saveUsers(users) {
  writeJson(USERS_KEY, users);
}

function loadOrders() {
  return readJson(ORDERS_KEY, []);
}

function saveOrders(orders) {
  writeJson(ORDERS_KEY, orders);
}

function loadRiderState() {
  return readJson(RIDER_STATE_KEY, {
    onlineByUsername: {},
    shiftByUsername: {},
  });
}

function saveRiderState(state) {
  writeJson(RIDER_STATE_KEY, state);
}

function loadAuthUser() {
  return readJson(AUTH_USER_KEY, null);
}

function loadProfile() {
  return readJson(PROFILE_KEY, {
    fullName: "Guest User",
    username: "guest",
    email: "",
    phone: "",
    address: "Manila, Globe St. ABC 123",
    notificationsEnabled: true,
  });
}

function parseSpecialNotes(specialNotes) {
  if (!specialNotes) {
    return { paymentMethod: "CASH_ON_DELIVERY", items: [], contactNumber: "", notificationsEnabled: true };
  }

  try {
    const parsed = JSON.parse(specialNotes);
    return {
      paymentMethod: parsed.paymentMethod || "CASH_ON_DELIVERY",
      items: Array.isArray(parsed.items) ? parsed.items : [],
      contactNumber: parsed.contactNumber || "",
      notificationsEnabled: parsed.notificationsEnabled ?? true,
    };
  } catch {
    return { paymentMethod: "CASH_ON_DELIVERY", items: [], contactNumber: "", notificationsEnabled: true };
  }
}

function currentUserSnapshot() {
  const authUser = loadAuthUser();
  const profile = loadProfile();
  return {
    username: authUser?.username || profile.username || "guest",
    role: authUser?.role || "CUSTOMER",
    profile,
  };
}

function ensureSeedUsers() {
  const users = loadUsers();
  const seeded = [
    {
      id: makeId("usr"),
      fullName: "Sample Customer",
      email: "customer@likhanghiraya.local",
      phone: "09171234567",
      username: "customer",
      password: "Customer1!",
      address: "Manila, Globe St. ABC 123",
      role: "CUSTOMER",
      createdAt: nowIso(),
    },
    {
      id: makeId("usr"),
      fullName: "Sample Rider",
      email: "rider@likhanghiraya.local",
      phone: "09998887777",
      username: "rider",
      password: "Rider123!",
      address: "Manila, Rider Hub",
      role: "RIDER",
      vehicleType: "MOTORCYCLE",
      plateNumber: "ABC-1234",
      driversLicenseNumber: "N01-23-456789",
      emergencyContactName: "Rider Emergency",
      emergencyContactPhone: "09171112222",
      gcashNumber: "09998887777",
      workingShift: "MORNING",
      createdAt: nowIso(),
    },
    {
      id: makeId("usr"),
      fullName: "Sample Admin",
      email: "admin@likhanghiraya.local",
      phone: "09170000000",
      username: "admin",
      password: "Admin123!",
      address: "Likhang Hiraya HQ, Manila",
      role: "ADMIN",
      createdAt: nowIso(),
    },
  ];

  const nextUsers = [...users];
  let changed = false;

  for (const seedUser of seeded) {
    const existingIndex = nextUsers.findIndex((item) => {
      const sameUsername = String(item.username || "").toLowerCase() === String(seedUser.username || "").toLowerCase();
      const sameEmail = String(item.email || "").toLowerCase() === String(seedUser.email || "").toLowerCase();
      return sameUsername || sameEmail;
    });

    if (existingIndex === -1) {
      nextUsers.push(seedUser);
      changed = true;
      continue;
    }

    // Ensure seeded system accounts always have role and login credentials.
    const existing = nextUsers[existingIndex];
    const updates = {};
    const expectedRole = String(seedUser.role || "CUSTOMER").toUpperCase();
    const currentRole = String(existing.role || "CUSTOMER").toUpperCase();

    if (currentRole !== expectedRole) {
      updates.role = expectedRole;
    }

    const hasPassword = String(existing.password || existing.password_hash || "").trim().length > 0;
    if (!hasPassword) {
      updates.password = seedUser.password;
    }

    if (Object.keys(updates).length > 0) {
      nextUsers[existingIndex] = { ...existing, ...updates };
      changed = true;
    }
  }

  if (changed) {
    saveUsers(nextUsers);
  }
}

function ensureSeedOrders() {
  const orders = loadOrders();
  if (orders.length > 0) {
    return;
  }

  const now = Date.now();
  const espresso = mockProducts.find((item) => String(item.id) === "2") || mockProducts[0];
  const tuna = mockProducts.find((item) => String(item.id) === "5") || mockProducts[1];
  const cappuccino = mockProducts.find((item) => String(item.id) === "1") || mockProducts[2];
  const latte = mockProducts.find((item) => String(item.id) === "4") || mockProducts[3] || mockProducts[0];

  const seeded = [
    {
      orderId: makeId("ord"),
      customerUsername: "sample-customer-a",
      customerName: "Maria Santos",
      customerPhone: "09171230001",
      deliveryAddress: "España Blvd, Sampaloc, Manila",
      status: "PENDING",
      subtotal: espresso.pricePhp + tuna.pricePhp,
      deliveryFee: 0,
      total: espresso.pricePhp + tuna.pricePhp,
      riderPayout: espresso.pricePhp + tuna.pricePhp,
      specialNotes: JSON.stringify({
        paymentMethod: "CASH_ON_DELIVERY",
        contactNumber: "09171230001",
        notificationsEnabled: true,
        items: [
          {
            id: espresso.id,
            name: espresso.name,
            quantity: 1,
            unitPrice: espresso.pricePhp,
            subtotal: espresso.pricePhp,
          },
          {
            id: tuna.id,
            name: tuna.name,
            quantity: 1,
            unitPrice: tuna.pricePhp,
            subtotal: tuna.pricePhp,
          },
        ],
      }),
      items: [
        {
          productId: String(espresso.id),
          productName: espresso.name,
          quantity: 1,
          unitPrice: espresso.pricePhp,
          subtotal: espresso.pricePhp,
        },
        {
          productId: String(tuna.id),
          productName: tuna.name,
          quantity: 1,
          unitPrice: tuna.pricePhp,
          subtotal: tuna.pricePhp,
        },
      ],
      createdAt: new Date(now - 12 * 60 * 1000).toISOString(),
      acceptedAt: null,
      pickedUpAt: null,
      arrivedAt: null,
      deliveredAt: null,
      riderUsername: null,
    },
    {
      orderId: makeId("ord"),
      customerUsername: "sample-customer-b",
      customerName: "Jose Cruz",
      customerPhone: "09171230002",
      deliveryAddress: "Taft Ave, Malate, Manila",
      status: "PENDING",
      subtotal: cappuccino.pricePhp * 2,
      deliveryFee: 0,
      total: cappuccino.pricePhp * 2,
      riderPayout: cappuccino.pricePhp * 2,
      specialNotes: JSON.stringify({
        paymentMethod: "ONLINE_PAYMENT",
        contactNumber: "09171230002",
        notificationsEnabled: true,
        items: [
          {
            id: cappuccino.id,
            name: cappuccino.name,
            quantity: 2,
            unitPrice: cappuccino.pricePhp,
            subtotal: cappuccino.pricePhp * 2,
          },
        ],
      }),
      items: [
        {
          productId: String(cappuccino.id),
          productName: cappuccino.name,
          quantity: 2,
          unitPrice: cappuccino.pricePhp,
          subtotal: cappuccino.pricePhp * 2,
        },
      ],
      createdAt: new Date(now - 8 * 60 * 1000).toISOString(),
      acceptedAt: null,
      pickedUpAt: null,
      arrivedAt: null,
      deliveredAt: null,
      riderUsername: null,
    },
    {
      orderId: makeId("ord"),
      customerUsername: "sample-customer-c",
      customerName: "Ana Reyes",
      customerPhone: "09171230003",
      deliveryAddress: "Ermita, Manila",
      status: "DELIVERED",
      subtotal: latte.pricePhp + espresso.pricePhp,
      deliveryFee: 0,
      total: latte.pricePhp + espresso.pricePhp,
      riderPayout: latte.pricePhp + espresso.pricePhp,
      specialNotes: JSON.stringify({
        paymentMethod: "CASH_ON_DELIVERY",
        contactNumber: "09171230003",
        notificationsEnabled: true,
        items: [
          {
            id: latte.id,
            name: latte.name,
            quantity: 1,
            unitPrice: latte.pricePhp,
            subtotal: latte.pricePhp,
          },
          {
            id: espresso.id,
            name: espresso.name,
            quantity: 1,
            unitPrice: espresso.pricePhp,
            subtotal: espresso.pricePhp,
          },
        ],
      }),
      items: [
        {
          productId: String(latte.id),
          productName: latte.name,
          quantity: 1,
          unitPrice: latte.pricePhp,
          subtotal: latte.pricePhp,
        },
        {
          productId: String(espresso.id),
          productName: espresso.name,
          quantity: 1,
          unitPrice: espresso.pricePhp,
          subtotal: espresso.pricePhp,
        },
      ],
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      acceptedAt: new Date(now - 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 1000).toISOString(),
      pickedUpAt: new Date(now - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
      arrivedAt: new Date(now - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
      deliveredAt: new Date(now - 2 * 24 * 60 * 60 * 1000 + 36 * 60 * 1000).toISOString(),
      riderUsername: "rider",
    },
  ];

  saveOrders(seeded);
}

function createAutoPendingOrder() {
  const first = randomFrom(mockProducts);
  const second = randomFrom(mockProducts);
  const qtyFirst = 1;
  const qtySecond = first.id === second.id ? 0 : 1;
  const customer = randomFrom(autoCustomers);

  const items = [
    {
      productId: String(first.id),
      productName: first.name,
      quantity: qtyFirst,
      unitPrice: Number(first.pricePhp),
      subtotal: Number(first.pricePhp) * qtyFirst,
    },
    ...(qtySecond > 0
      ? [
          {
            productId: String(second.id),
            productName: second.name,
            quantity: qtySecond,
            unitPrice: Number(second.pricePhp),
            subtotal: Number(second.pricePhp) * qtySecond,
          },
        ]
      : []),
  ];

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    orderId: makeId("ord"),
    customerUsername: `walkin-${Math.random().toString(36).slice(2, 7)}`,
    customerName: customer.name,
    customerPhone: customer.phone,
    deliveryAddress: customer.address,
    status: "PENDING",
    subtotal,
    deliveryFee: 0,
    total: subtotal,
    riderPayout: subtotal,
    specialNotes: JSON.stringify({
      paymentMethod: "CASH_ON_DELIVERY",
      contactNumber: customer.phone,
      notificationsEnabled: true,
      items: items.map((item) => ({
        id: item.productId,
        name: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
    }),
    items,
    createdAt: nowIso(),
    acceptedAt: null,
    pickedUpAt: null,
    arrivedAt: null,
    deliveredAt: null,
    riderUsername: null,
  };
}

function ensurePendingIncomingOrders(minPending = 1) {
  const orders = loadOrders();
  const pendingCount = orders.filter((item) => !item.riderUsername && item.status === "PENDING").length;
  if (pendingCount >= minPending) {
    return;
  }

  const nextOrders = [...orders];
  let missing = minPending - pendingCount;
  while (missing > 0) {
    nextOrders.unshift(createAutoPendingOrder());
    missing -= 1;
  }
  saveOrders(nextOrders);
}

function normalizeStoredOrders() {
  const orders = loadOrders();
  if (orders.length === 0) {
    return;
  }

  const normalized = orders.map((order) => {
    const subtotal = (order.items || []).reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const nextDeliveryFee = 0;
    return {
      ...order,
      subtotal,
      deliveryFee: nextDeliveryFee,
      total: subtotal + nextDeliveryFee,
      riderPayout: subtotal,
    };
  });

  saveOrders(normalized);
}

function ensureLocalSeedData() {
  ensureSeedUsers();
  ensureSeedOrders();
  normalizeStoredOrders();
  ensurePendingIncomingOrders(1);
}

function toOrderApiModel(order) {
  return {
    orderId: order.orderId,
    status: order.status,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    deliveryAddress: order.deliveryAddress,
    specialNotes: order.specialNotes,
    createdAt: order.createdAt,
    acceptedAt: order.acceptedAt,
    pickedUpAt: order.pickedUpAt,
    arrivedAt: order.arrivedAt,
    deliveredAt: order.deliveredAt,
    items: order.items,
  };
}

function riderNameFromUsername(username) {
  if (!username) {
    return "";
  }
  const users = loadUsers();
  const rider = users.find((item) => item.username === username);
  return rider?.fullName || username;
}

export const localAuthApi = {
  async login(payload) {
    ensureLocalSeedData();

    const usernameOrEmail = (payload.usernameOrEmail || "guest").trim();
    const password = String(payload.password || "");
    const users = loadUsers();

    const user = users.find(
      (item) =>
        (String(item.username || "").toLowerCase() === usernameOrEmail.toLowerCase() ||
          String(item.email || "").toLowerCase() === usernameOrEmail.toLowerCase())
    );

    if (!user) {
      throw new Error("Account not found. Please sign up first.");
    }

    const storedPassword = String(user.password || user.password_hash || "");
    if (!storedPassword || storedPassword !== password) {
      throw new Error("Invalid username/email or password.");
    }

    return {
      token: `local-token-${user.username}-${Date.now()}`,
      username: user.username,
      role: String(user.role || "CUSTOMER").toUpperCase(),
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      address: user.address,
    };
  },

  async register(payload) {
    ensureLocalSeedData();
    const users = loadUsers();

    if (users.some((item) => item.email.toLowerCase() === payload.email.toLowerCase())) {
      throw new Error("Email is already in use");
    }

    if (users.some((item) => item.username.toLowerCase() === payload.username.toLowerCase())) {
      throw new Error("Username is already in use");
    }

    const next = {
      id: makeId("usr"),
      ...payload,
      role: "CUSTOMER",
      createdAt: nowIso(),
    };
    saveUsers([...users, next]);

    return {
      id: next.id,
      username: next.username,
      email: next.email,
      role: next.role,
    };
  },

  async registerRider(payload) {
    ensureLocalSeedData();
    const users = loadUsers();

    if (users.some((item) => item.email.toLowerCase() === payload.email.toLowerCase())) {
      throw new Error("Email is already in use");
    }

    if (users.some((item) => item.username.toLowerCase() === payload.username.toLowerCase())) {
      throw new Error("Username is already in use");
    }

    const next = {
      id: makeId("usr"),
      ...payload,
      role: "RIDER",
      createdAt: nowIso(),
    };
    saveUsers([...users, next]);

    return {
      id: next.id,
      username: next.username,
      email: next.email,
      role: next.role,
    };
  },
};

export const localProductApi = {
  async list() {
    ensureLocalSeedData();
    return mockProducts;
  },
};

export const localOrderApi = {
  async placeOrder(payload) {
    ensureLocalSeedData();
    const { username, profile } = currentUserSnapshot();
    const parsedNotes = parseSpecialNotes(payload.specialNotes);
    const productsById = new Map(mockProducts.map((item) => [String(item.id), item]));
    const notedItemsById = new Map(
      (parsedNotes.items || []).map((item) => [String(item.id), item])
    );

    const items = (payload.items || []).map((item) => {
      const product = productsById.get(String(item.productId));
      const notedItem = notedItemsById.get(String(item.productId));
      const unitPrice = Number(item.unitPrice ?? notedItem?.unitPrice ?? product?.pricePhp ?? 0);
      const quantity = Number(item.quantity || 0);
      return {
        productId: String(item.productId),
        productName: notedItem?.name || product?.name || "Unknown Product",
        quantity,
        unitPrice,
        subtotal: unitPrice * quantity,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const deliveryFee = 0;
    const nextOrder = {
      orderId: makeId("ord"),
      customerUsername: username,
      customerName: profile.fullName || username,
      customerPhone: profile.phone || "",
      deliveryAddress: payload.deliveryAddress || profile.address || "Manila, Globe St. ABC 123",
      status: "PENDING",
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      riderPayout: subtotal,
      specialNotes: payload.specialNotes || "",
      items,
      createdAt: nowIso(),
      acceptedAt: null,
      pickedUpAt: null,
      arrivedAt: null,
      deliveredAt: null,
      riderUsername: null,
    };

    const nextOrders = [nextOrder, ...loadOrders()];
    saveOrders(nextOrders);
    emitChange();

    return {
      orderId: nextOrder.orderId,
      status: nextOrder.status,
    };
  },

  async listMine(scope = "active") {
    ensureLocalSeedData();
    const { username } = currentUserSnapshot();
    const orders = loadOrders().filter((item) => item.customerUsername === username);

    const filtered = scope === "active"
      ? orders.filter((item) => activeStatuses.includes(item.status))
      : orders;

    return filtered.map(toOrderApiModel);
  },

  async clearMineActive() {
    ensureLocalSeedData();
    const { username } = currentUserSnapshot();
    const nextOrders = loadOrders().filter(
      (item) => !(item.customerUsername === username && activeStatuses.includes(item.status))
    );
    saveOrders(nextOrders);
    emitChange();
    return { cleared: true };
  },
};

function buildRiderDashboardFor(username) {
  ensureLocalSeedData();

  const users = loadUsers();
  const rider = users.find((item) => item.username === username);
  const riderState = loadRiderState();
  const orders = loadOrders();

  const incomingOrderRaw = orders.find((item) => !item.riderUsername && item.status === "PENDING") || null;
  const activeOrderRaw = orders.find(
    (item) =>
      item.riderUsername === username &&
      ["RIDER_ASSIGNED", "PICKED_UP", "IN_TRANSIT", "ARRIVED"].includes(item.status)
  ) || null;

  const history = orders
    .filter((item) => item.riderUsername === username && item.status === "DELIVERED")
    .sort((a, b) => new Date(b.deliveredAt || b.createdAt) - new Date(a.deliveredAt || a.createdAt));

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const daily = history
    .filter((item) => new Date(item.deliveredAt || item.createdAt).getTime() >= oneDayAgo)
    .reduce((sum, item) => sum + Number(item.riderPayout || 0), 0);

  const weekly = history
    .filter((item) => new Date(item.deliveredAt || item.createdAt).getTime() >= weekAgo)
    .reduce((sum, item) => sum + Number(item.riderPayout || 0), 0);

  const incomingOrder = incomingOrderRaw
    ? {
        orderId: incomingOrderRaw.orderId,
        customerName: incomingOrderRaw.customerName,
        customerAddress: incomingOrderRaw.deliveryAddress,
        total: incomingOrderRaw.total,
        items: incomingOrderRaw.items,
      }
    : null;

  const activeOrder = activeOrderRaw
    ? {
        orderId: activeOrderRaw.orderId,
        status: activeOrderRaw.status,
        customerName: activeOrderRaw.customerName,
        customerPhone: activeOrderRaw.customerPhone,
        customerAddress: activeOrderRaw.deliveryAddress,
        total: activeOrderRaw.total,
        pickedUpAt: activeOrderRaw.pickedUpAt,
        items: activeOrderRaw.items,
      }
    : null;

  return {
    online: Boolean(riderState.onlineByUsername?.[username]),
    workingShift: riderState.shiftByUsername?.[username] || rider?.workingShift || "MORNING",
    riderName: rider?.fullName || username,
    incomingOrder,
    activeOrder,
    earnings: {
      today: daily,
      dailyDeliveries: history.filter((item) => new Date(item.deliveredAt || item.createdAt).getTime() >= oneDayAgo).length,
      week: weekly,
      weeklyDeliveries: history.filter((item) => new Date(item.deliveredAt || item.createdAt).getTime() >= weekAgo).length,
    },
    history: history.map((item) => ({
      orderId: item.orderId,
      status: item.status,
      riderPayout: item.riderPayout,
      total: item.total,
      deliveredAt: item.deliveredAt,
      createdAt: item.createdAt,
    })),
  };
}

function updateOrder(orderId, updater) {
  const orders = loadOrders();
  const nextOrders = orders.map((item) => (item.orderId === orderId ? updater(item) : item));
  saveOrders(nextOrders);
  emitChange();
}

export const localRiderApi = {
  async dashboard() {
    ensureLocalSeedData();
    const { username } = currentUserSnapshot();
    return buildRiderDashboardFor(username);
  },

  async setAvailability({ online, workingShift }) {
    ensureLocalSeedData();
    const { username } = currentUserSnapshot();
    const riderState = loadRiderState();
    riderState.onlineByUsername[username] = Boolean(online);
    riderState.shiftByUsername[username] = workingShift || riderState.shiftByUsername[username] || "MORNING";
    saveRiderState(riderState);
    emitChange();
    return buildRiderDashboardFor(username);
  },

  async acceptOrder(orderId) {
    const { username } = currentUserSnapshot();
    updateOrder(orderId, (item) => ({
      ...item,
      riderUsername: username,
      status: "RIDER_ASSIGNED",
      acceptedAt: nowIso(),
    }));
    return buildRiderDashboardFor(username);
  },

  async declineOrder(orderId) {
    // In this local mode we mark declined for the current rider queue simulation.
    updateOrder(orderId, (item) => ({
      ...item,
      status: "DECLINED",
    }));
    const { username } = currentUserSnapshot();
    return buildRiderDashboardFor(username);
  },

  async confirmPickup(orderId) {
    const { username } = currentUserSnapshot();
    updateOrder(orderId, (item) => ({
      ...item,
      status: "PICKED_UP",
      pickedUpAt: nowIso(),
      riderUsername: item.riderUsername || username,
    }));
    return buildRiderDashboardFor(username);
  },

  async startTransit(orderId) {
    const { username } = currentUserSnapshot();
    updateOrder(orderId, (item) => ({
      ...item,
      status: "IN_TRANSIT",
      riderUsername: item.riderUsername || username,
    }));
    return buildRiderDashboardFor(username);
  },

  async confirmArrival(orderId) {
    const { username } = currentUserSnapshot();
    updateOrder(orderId, (item) => ({
      ...item,
      status: "ARRIVED",
      arrivedAt: nowIso(),
      riderUsername: item.riderUsername || username,
    }));
    return buildRiderDashboardFor(username);
  },

  async completeDelivery(orderId) {
    const { username } = currentUserSnapshot();
    updateOrder(orderId, (item) => ({
      ...item,
      status: "DELIVERED",
      deliveredAt: nowIso(),
      riderUsername: item.riderUsername || username,
      riderPayout: Number(item.total || item.subtotal || 0),
    }));
    return buildRiderDashboardFor(username);
  },
};

export async function findLatestOrderForCurrentUser() {
  ensureLocalSeedData();
  const { username } = currentUserSnapshot();
  const order = loadOrders()
    .filter((item) => item.customerUsername === username)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  if (!order) {
    return null;
  }

  return {
    ...toOrderApiModel(order),
    riderName: riderNameFromUsername(order.riderUsername),
    customerName: order.customerName,
    customerPhone: order.customerPhone,
  };
}

export async function findOrderById(orderId) {
  ensureLocalSeedData();
  const order = loadOrders().find((item) => item.orderId === orderId);
  if (!order) {
    return null;
  }

  return {
    ...toOrderApiModel(order),
    riderName: riderNameFromUsername(order.riderUsername),
    customerName: order.customerName,
    customerPhone: order.customerPhone,
  };
}

ensureLocalSeedData();
