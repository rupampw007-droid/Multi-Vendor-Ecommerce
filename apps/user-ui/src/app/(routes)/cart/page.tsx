'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
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

// TODO: replace with a real API call (e.g. POST /api/coupons/validate).
// type 'percent' => value is % off, 'flat' => value is INR off.
const DEMO_COUPONS: Record<string, { type: 'percent' | 'flat'; value: number }> = {
  SAVE10: { type: 'percent', value: 10 },
  FLAT100: { type: 'flat', value: 100 },
}

type PaymentMethod = 'online' | 'cod'

const CartPage = () => {
  const router = useRouter()
  const { user } = useUser()
  const location = useLocationTracking()
  const deviceInfo = useDeviceTracking()

  const cart = useStore((s) => s.cart)
  const removeFromCart = useStore((s) => s.removeFromCart)
  const updateCartQuantity = useStore((s) => s.updateCartQuantity)

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [couponError, setCouponError] = useState('')
  const [addressId, setAddressId] = useState('')
  const [payment, setPayment] = useState<PaymentMethod>('online')

  // Assumes user.addresses = [{ id, name?, line1, city, state, pincode }]
  const addresses: any[] = (user as any)?.addresses ?? []

  const subtotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * (i.quantity ?? 1), 0),
    [cart]
  )

  const discount = useMemo(() => {
    if (!appliedCoupon) return 0
    const c = DEMO_COUPONS[appliedCoupon]
    if (!c) return 0
    const raw = c.type === 'percent' ? (subtotal * c.value) / 100 : c.value
    return Math.min(Math.round(raw), subtotal)
  }, [appliedCoupon, subtotal])

  const total = Math.max(subtotal - discount, 0)

  if (!mounted) return null

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    if (DEMO_COUPONS[code]) {
      setAppliedCoupon(code)
      setCouponError('')
    } else {
      setAppliedCoupon(null)
      setCouponError('Invalid coupon code')
    }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError('')
  }

  const handleCheckout = () => {
    if (!cart.length || !addressId) return
    // TODO: send this to your checkout/order API instead of just navigating.
    const payload = {
      items: cart,
      addressId,
      payment,
      coupon: appliedCoupon,
      subtotal,
      discount,
      total,
    }
    try {
      sessionStorage.setItem('checkout-payload', JSON.stringify(payload))
    } catch {}
    router.push('/checkout')
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-gray-900">
        <ShoppingCart size={24} />
        Shopping Cart
        <span className="text-base font-normal text-gray-500">({cart.length})</span>
      </h1>

      {cart.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="mb-4 text-gray-600">Your cart is empty.</p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Cart table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Quantity</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cart.map((item) => {
                  const qty = item.quantity ?? 1
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
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center rounded-lg border border-gray-200">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            disabled={qty <= 1}
                            onClick={() => updateCartQuantity(item.id, qty - 1)}
                            className="p-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="min-w-[2rem] text-center font-medium">
                            {qty}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => updateCartQuantity(item.id, qty + 1)}
                            className="p-2 hover:bg-gray-100"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          aria-label="Remove from cart"
                          onClick={() =>
                            removeFromCart(item.id, user, location, deviceInfo)
                          }
                          className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Summary box */}
          <aside className="h-fit space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold text-gray-900">{formatINR(subtotal)}</span>
            </div>

            {/* Coupon */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-900">
                Have a coupon?
              </label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                  <span>
                    {appliedCoupon} applied (-{formatINR(discount)})
                  </span>
                  <button type="button" onClick={removeCoupon} className="text-xs underline">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Enter coupon code"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    Apply
                  </button>
                </div>
              )}
              {couponError && <p className="mt-1 text-xs text-red-600">{couponError}</p>}
            </div>

            {/* Shipping address */}
            <div>
              <label
                htmlFor="address"
                className="mb-1 block text-sm font-medium text-gray-900"
              >
                Select shipping address
              </label>
              {addresses.length > 0 ? (
                <select
                  id="address"
                  value={addressId}
                  onChange={(e) => setAddressId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                >
                  <option value="">Choose an address</option>
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {[a.name, a.line1, a.city, a.state, a.pincode]
                        .filter(Boolean)
                        .join(', ')}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-500">
                  No saved addresses.{' '}
                  <Link href="/profile" className="text-blue-600 hover:underline">
                    Add one
                  </Link>
                </p>
              )}
            </div>

            {/* Payment method */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-900">
                Select payment method
              </p>
              <div className="space-y-2">
                {(
                  [
                    { value: 'online', label: 'Online payment' },
                    { value: 'cod', label: 'Cash on Delivery' },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                      payment === opt.value
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={opt.value}
                      checked={payment === opt.value}
                      onChange={() => setPayment(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="space-y-1 border-t border-gray-200 pt-4">
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-700">
                  <span>Discount</span>
                  <span>-{formatINR(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-gray-900">
                <span>Total</span>
                <span>{formatINR(total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={!addressId}
              className="w-full rounded-lg bg-black py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {addressId ? 'Proceed to checkout' : 'Select an address to continue'}
            </button>
          </aside>
        </div>
      )}
    </div>
  )
}

export default CartPage