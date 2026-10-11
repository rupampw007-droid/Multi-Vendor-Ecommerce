'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { useStore } from '@/store'
import useUser from '@/hooks/useUser'
import useLocationTracking from '@/hooks/useLocationTracking'
import useDeviceTracking from '@/hooks/useDeviceTracking'

const formatINR = (value?: number) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(value)
    : ''

const WishlistPage = () => {
  const { user } = useUser()
  const location = useLocationTracking()
  const deviceInfo = useDeviceTracking()

  const wishlist = useStore((s) => s.wishlist)
  const cart = useStore((s) => s.cart)
  const addToCart = useStore((s) => s.addToCart)
  const removeFromWishlist = useStore((s) => s.removeFromWishlist)
  const updateWishlistQuantity = useStore((s) => s.updateWishlistQuantity)

  // The store is persisted in localStorage, so wait for the client
  // to avoid a server/client hydration mismatch.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  const handleAddToCart = (item: (typeof wishlist)[number]) => {
    addToCart(
      { ...item, quantity: item.quantity ?? 1 },
      user,
      location,
      deviceInfo
    )
  }

  const handleRemove = (id: string) => {
    removeFromWishlist(id, user, location, deviceInfo)
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-gray-900">
        <Heart className="fill-red-500 text-red-500" size={24} />
        My Wishlist
        <span className="text-base font-normal text-gray-500">
          ({wishlist.length})
        </span>
      </h1>

      {wishlist.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="mb-4 text-gray-600">Your wishlist is empty.</p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Quantity</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {wishlist.map((item) => {
                const inCartQty =
                  cart.find((c) => c.id === item.id)?.quantity ?? 0
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image || '/placeholder.png'}
                          alt={item.title}
                          className="h-16 w-16 rounded-md bg-gray-100 object-cover"
                          loading="lazy"
                        />
                        <span className="line-clamp-2 font-medium text-gray-900">
                          {item.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {formatINR(item.price)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex items-center rounded-lg border border-gray-200">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            disabled={(item.quantity ?? 1) <= 1}
                            onClick={() =>
                              updateWishlistQuantity(
                                item.id,
                                (item.quantity ?? 1) - 1
                              )
                            }
                            className="p-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="min-w-[2rem] text-center font-medium">
                            {item.quantity ?? 1}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() =>
                              updateWishlistQuantity(
                                item.id,
                                (item.quantity ?? 1) + 1
                              )
                            }
                            className="p-2 hover:bg-gray-100"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        {inCartQty > 0 && (
                          <span className="text-xs text-green-600">
                            ({inCartQty} in cart)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddToCart(item)}
                          className="flex items-center gap-1 rounded-lg bg-black px-3 py-2 text-xs font-medium text-white hover:bg-gray-800"
                        >
                          <ShoppingCart size={14} />
                          Add to cart
                        </button>
                        <button
                          type="button"
                          aria-label="Remove from wishlist"
                          onClick={() => handleRemove(item.id)}
                          className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default WishlistPage