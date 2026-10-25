import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sendKafkaEvent } from '@/actions/track-user';

type Product = {
  id: string;
  title: string;
  price: number;
  image: string;
  quantity?: number;
  shopId: string;
};

type Store = {
  cart: Product[];
  wishlist: Product[];
  addToCart: (
    product: Product,
    user: any,
    location: any,
    deviceInfo: any,
  ) => void;
  removeFromCart: (
    id: string,
    user: any,
    location: any,
    deviceInfo: any,
  ) => void;
  addToWishlist: (
    product: Product,
    user: any,
    location: any,
    deviceInfo: any,
  ) => void;
  removeFromWishlist: (
    id: string,
    user: any,
    location: any,
    deviceInfo: any,
  ) => void;
  updateWishlistQuantity: (id: string, quantity: number) => void;
  updateCartQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      cart: [],
      wishlist: [],

      addToCart: (product, user, location, deviceInfo) => {
        const qty = Math.max(1, product.quantity ?? 1);
        set((state) => {
          const existing = state.cart.find((item) => item.id === product.id);
          if (existing) {
            return {
              cart: state.cart.map((item) =>
                item.id === product.id
                  ? { ...item, quantity: (item.quantity ?? 1) + qty }
                  : item,
              ),
            };
          }
          return {
            cart: [...state.cart, { ...product, quantity: qty }],
          };
        });

        if (user?.id && location && deviceInfo) {
          sendKafkaEvent({
            userId: user?.id,
            productId: product?.id,
            shopId: product?.shopId,
            action: 'add_to_cart',
            country: location?.country || 'Unknown',
            city: location?.city || 'Unknown',
            device: deviceInfo || 'Unknown Device',
          });
        }
      },

      removeFromCart: (id, user, location, deviceInfo) => {
        const removeProduct = get().cart.find((item) => item.id === id);
        // removeProduct is available here for tracking/logging later

        set((state) => ({
          cart: state.cart.filter((item) => item.id !== id),
        }));

        if (user?.id && location && deviceInfo && removeProduct) {
          sendKafkaEvent({
            userId: user?.id,
            productId: removeProduct?.id,
            shopId: removeProduct?.shopId,
            action: 'remove_from_cart',
            country: location?.country || 'Unknown',
            city: location?.city || 'Unknown',
            device: deviceInfo || 'Unknown Device',
          });
        }
      },

      addToWishlist: (product, user, location, deviceInfo) => {
        set((state) => {
          if (state.wishlist.find((item) => item.id === product.id))
            return state;
          return {
            wishlist: [
              ...state.wishlist,
              { ...product, quantity: product.quantity ?? 1 },
            ],
          };
        });

        if (user?.id && location && deviceInfo) {
          sendKafkaEvent({
            userId: user?.id,
            productId: product?.id,
            shopId: product?.shopId,
            action: 'add_to_wishlist',
            country: location?.country || 'Unknown',
            city: location?.city || "Unknown",
            device: deviceInfo || "Unknown Device"
          });
        }
      },

      removeFromWishlist: (id, user, location, deviceInfo) => {
        const removeProduct = get().wishlist.find((item) => item.id === id);

        set((state) => ({
          wishlist: state.wishlist.filter((item) => item.id !== id),
        }));

         if (user?.id && location && deviceInfo) {
          sendKafkaEvent({
            userId: user?.id,
            productId: removeProduct?.id,
            shopId: removeProduct?.shopId,
            action: 'remove_from_wishlist',
            country: location?.country || 'Unknown',
            city: location?.city || "Unknown",
            device: deviceInfo || "Unknown Device"
          });
      }
    },
      updateWishlistQuantity: (id, quantity) => {
        const next = Math.max(1, quantity);
        set((state) => ({
          wishlist: state.wishlist.map((item) =>
            item.id === id ? { ...item, quantity: next } : item,
          ),
        }));
      },

      updateCartQuantity: (id, quantity) => {
        const next = Math.max(1, quantity);
        set((state) => ({
          cart: state.cart.map((item) =>
            item.id === id ? { ...item, quantity: next } : item,
          ),
        }));
      },
      clearCart: () => set({ cart: [] }),
    }),
    { name: 'store-storage' },
  ),
);
