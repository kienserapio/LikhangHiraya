import { create } from "zustand";

export const useFavoriteStore = create((set, get) => ({
  favoriteIds: [],

  isFavorite: (productId) => get().favoriteIds.includes(String(productId)),

  toggleFavorite: (productId) => {
    const id = String(productId);
    const exists = get().favoriteIds.includes(id);
    set({
      favoriteIds: exists
        ? get().favoriteIds.filter((item) => item !== id)
        : [...get().favoriteIds, id],
    });
  },
}));
