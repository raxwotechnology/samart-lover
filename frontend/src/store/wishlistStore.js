import { create } from 'zustand';
import * as api from '../services/api';

const useWishlistStore = create((set, get) => ({
  products: [],
  loading: false,

  fetchWishlist: async () => {
    try {
      set({ loading: true });
      const { data } = await api.getWishlist();
      set({ products: data.products || [], loading: false });
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      set({ loading: false });
    }
  },

  addProduct: async (productId) => {
    try {
      const { data } = await api.addToWishlist(productId);
      set({ products: data.products || [] });
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      throw error;
    }
  },

  removeProduct: async (productId) => {
    try {
      const { data } = await api.removeFromWishlist(productId);
      set({ products: data.products || [] });
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  },

  isInWishlist: (productId) => {
    return get().products.some((p) => (p._id || p) === productId);
  },
}));

export default useWishlistStore;
