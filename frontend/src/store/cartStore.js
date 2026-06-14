import { create } from 'zustand';
import * as api from '../services/api';

const useCartStore = create((set, get) => ({
  items: [],
  loading: false,
  synced: false,

  // Fetch cart from server
  fetchCart: async () => {
    try {
      set({ loading: true });
      const { data } = await api.getCart();
      set({ items: data.items || [], synced: true, loading: false });
    } catch (error) {
      console.error('Error fetching cart:', error);
      set({ loading: false });
    }
  },

  // Add item to cart
  addItem: async (product, quantity = 1) => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        const { data } = await api.addToCart({
          productId: product._id,
          quantity,
        });
        set({ items: data.items || [] });
      } catch (error) {
        console.error('Error adding to cart:', error);
        throw error;
      }
    } else {
      // Guest cart (local only)
      const currentItems = get().items;
      const existing = currentItems.find(
        (item) => (item.productId?._id || item.productId) === product._id
      );

      if (existing) {
        set({
          items: currentItems.map((item) =>
            (item.productId?._id || item.productId) === product._id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          ),
        });
      } else {
        set({
          items: [
            ...currentItems,
            {
              productId: {
                _id: product._id,
                name: product.name,
                price: product.price,
                mrp: product.mrp,
                discount: product.discount,
                unit: product.unit,
                images: product.images,
                stock: product.stock,
              },
              name: product.name,
              image: product.images?.[0] || '',
              price: product.price,
              quantity,
            },
          ],
        });
      }
    }
  },

  // Update item quantity
  updateQuantity: async (productId, quantity) => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        const { data } = await api.updateCartItem({ productId, quantity });
        set({ items: data.items || [] });
      } catch (error) {
        console.error('Error updating cart:', error);
      }
    } else {
      if (quantity <= 0) {
        set({
          items: get().items.filter(
            (item) => (item.productId?._id || item.productId) !== productId
          ),
        });
      } else {
        set({
          items: get().items.map((item) =>
            (item.productId?._id || item.productId) === productId
              ? { ...item, quantity }
              : item
          ),
        });
      }
    }
  },

  // Remove item
  removeItem: async (productId) => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        const { data } = await api.removeFromCart(productId);
        set({ items: data.items || [] });
      } catch (error) {
        console.error('Error removing from cart:', error);
      }
    } else {
      set({
        items: get().items.filter(
          (item) => (item.productId?._id || item.productId) !== productId
        ),
      });
    }
  },

  // Clear cart
  clearItems: async () => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        await api.clearCart();
      } catch (error) {
        console.error('Error clearing cart:', error);
      }
    }
    set({ items: [] });
  },

  // Get total count
  getCount: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0);
  },

  // Get subtotal
  getSubtotal: () => {
    return get().items.reduce((total, item) => {
      const price = item.productId?.price || item.price;
      return total + price * item.quantity;
    }, 0);
  },
}));

export default useCartStore;
