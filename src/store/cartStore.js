import { create } from "zustand";

const DELIVERY_FEE = 50;

export const useCartStore = create((set, get) => ({
  isDrawerOpen: false,
  items: [],

  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),

  addItem: (product, quantity = 1, notes = "") => {
    const existing = get().items.find((item) => item.id === product.id);

    if (existing) {
      set({
        items: get().items.map((item) =>
          item.id === product.id
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
          id: product.id,
          name: product.name,
          pricePhp: Number(product.pricePhp),
          imageUrl: product.imageUrl,
          quantity,
          notes,
        },
      ],
    });
  },

  increment: (id) =>
    set({
      items: get().items.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item)),
    }),

  decrement: (id) =>
    set({
      items: get()
        .items
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0),
    }),

  removeItem: (id) => set({ items: get().items.filter((item) => item.id !== id) }),

  clear: () => set({ items: [] }),

  subtotal: () => get().items.reduce((sum, item) => sum + item.pricePhp * item.quantity, 0),
  total: () => get().subtotal() + DELIVERY_FEE,
  deliveryFee: DELIVERY_FEE,
}));
