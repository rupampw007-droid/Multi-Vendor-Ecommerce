import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Product = {
    id: string
    title: string
    price: number
    image: string
    quantity?: number
    shopId: string
}

type Store = {
    cart: Product[]
    wishlist: Product[]
    addToCart: (
        product: Product,
        user: any,
        location: string,
        deviceInfo: string
    ) => void
    removeFromCart: (
        id: string,
        user: any,
        location: string,
        deviceInfo: string
    ) => void
    addToWishlist: (
        product: Product,
        user: any,
        location: string,
        deviceInfo: string
    ) => void
    removeFromWishlist: (
        id: string,
        user: any,
        location: string,
        deviceInfo: string
    ) => void
    updateWishlistQuantity: (id: string, quantity: number) => void
    updateCartQuantity: (id: string, quantity: number) => void
}

export const useStore = create<Store>()(
    persist(
        (set, get) => ({
            cart: [],
            wishlist: [],

            addToCart: (product, user, location, deviceInfo) => {
                const qty = Math.max(1, product.quantity ?? 1)
                set((state) => {
                    const existing = state.cart.find((item) => item.id === product.id)
                    if (existing) {
                        return {
                            cart: state.cart.map((item) =>
                                item.id === product.id
                                    ? { ...item, quantity: (item.quantity ?? 1) + qty }
                                    : item
                            ),
                        }
                    }
                    return {
                        cart: [...state.cart, { ...product, quantity: qty }],
                    }
                })
            },

            removeFromCart: (id, user, location, deviceInfo) => {
                const removeProduct = get().cart.find((item) => item.id === id)
                // removeProduct is available here for tracking/logging later

                set((state) => ({
                    cart: state.cart.filter((item) => item.id !== id),
                }))
            },

            addToWishlist: (product, user, location, deviceInfo) => {
                set((state) => {
                    if (state.wishlist.find((item) => item.id === product.id)) return state
                    return { wishlist: [...state.wishlist, { ...product, quantity: product.quantity ?? 1 }] }
                })
            },

            removeFromWishlist: (id, user, location, deviceInfo) => {
                const removeProduct = get().wishlist.find((item) => item.id === id)

                set((state) => ({
                    wishlist: state.wishlist.filter((item) => item.id !== id),
                }))
            },

            updateWishlistQuantity: (id, quantity) => {
                const next = Math.max(1, quantity)
                set((state) => ({
                    wishlist: state.wishlist.map((item) =>
                        item.id === id ? { ...item, quantity: next } : item
                    ),
                }))
            },

            updateCartQuantity: (id, quantity) => {
                const next = Math.max(1, quantity)
                set((state) => ({
                    cart: state.cart.map((item) =>
                        item.id === id ? { ...item, quantity: next } : item
                    ),
                }))
            },
        }),
        { name: 'store-storage' }
    )
)