import { create } from "zustand";

const DELIVERY_FEE = 0;

function normalizeToppings(toppings) {
  if (!toppings || typeof toppings !== "object") {
    return {};
  }

  return Object.entries(toppings)
    .filter(([, quantity]) => Number(quantity || 0) > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((accumulator, [name, quantity]) => {
      accumulator[name] = Number(quantity || 0);
      return accumulator;
    }, {});
}

function buildCartKey(product, notes = "") {
  const productId = String(product?.id || "");
  const selectedSize = String(product?.selectedSize || "Small");
  const toppings = normalizeToppings(product?.toppings);
  const toppingsToken = Object.entries(toppings)
    .map(([name, quantity]) => `${name}:${quantity}`)
    .join("|");
  const notesToken = String(notes || "").trim();
  return `${productId}::${selectedSize}::${toppingsToken}::${notesToken}`;
}

export const useCartStore = create((set, get) => ({
  isDrawerOpen: false,
  items: [],

  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),

  addItem: (product, quantity = 1, notes = "") => {
    const cartKey = buildCartKey(product, notes);
    const existing = get().items.find((item) => (item.cartKey || item.id) === cartKey);

    if (existing) {
      set({
        items: get().items.map((item) =>
          (item.cartKey || item.id) === cartKey
            ? { ...item, quantity: item.quantity + quantity, notes: notes || item.notes }
            : item
        ),
      });
      return;
    }

    set({
      items: [
        ...get().items,
        {
          cartKey,
          id: product.id,
          name: product.name,
          pricePhp: Number(product.pricePhp),
          imageUrl: product.imageUrl,
          selectedSize: product.selectedSize || "Small",
          toppings: normalizeToppings(product.toppings),
          toppingTotal: Number(product.toppingTotal || 0),
          quantity,
          notes,
        },
      ],
    });
  },

  increment: (lineId) =>
    set({
      items: get().items.map((item) => ((item.cartKey || item.id) === lineId ? { ...item, quantity: item.quantity + 1 } : item)),
    }),

  decrement: (lineId) =>
    set({
      items: get()
        .items
        .map((item) => ((item.cartKey || item.id) === lineId ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0),
    }),

  removeItem: (lineId) => set({ items: get().items.filter((item) => (item.cartKey || item.id) !== lineId) }),

  clear: () => set({ items: [] }),

  subtotal: () => get().items.reduce((sum, item) => sum + item.pricePhp * item.quantity, 0),
  total: () => get().subtotal() + DELIVERY_FEE,
  deliveryFee: DELIVERY_FEE,
}));
