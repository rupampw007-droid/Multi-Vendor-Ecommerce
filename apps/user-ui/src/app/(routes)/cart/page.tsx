'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  MapPin,
  Minus,
  Plus,
  ShoppingCart,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { useStore } from '@/store'
import useUser from '@/hooks/useUser'
import useLocationTracking from '@/hooks/useLocationTracking'
import useDeviceTracking from '@/hooks/useDeviceTracking'
import axiosInstance from '@/utils/axiosInstance'
import toast from 'react-hot-toast'

interface ShippingAddress {
  id: string
  label: string
  name: string
  street: string
  city: string
  state?: string | null
  zip: string
  country: string
  phone?: string | null
  isDefault: boolean
}

interface ShippingAddressesResponse {
  addresses: ShippingAddress[]
}

const formatINR = (value?: number) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(value)
    : ''

// Coupon amounts are checked again by the order service before payment.
const DEMO_COUPONS: Record<string, { type: 'percent' | 'flat'; value: number }> = {
  SAVE10: { type: 'percent', value: 10 },
  FLAT100: { type: 'flat', value: 100 },
}

const SectionTitle = ({
  step,
  children,
}: {
  step: number
  children: React.ReactNode
}) => (
  <div className="mb-2.5 flex items-center gap-2">
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[11px] font-semibold text-white">
      {step}
    </span>
    <h3 className="text-sm font-semibold text-gray-900">{children}</h3>
  </div>
)

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
  const [isStartingCheckout, setIsStartingCheckout] = useState(false)

  const {
    data: addresses = [],
    isLoading: addressesLoading,
    isError: addressesError,
    refetch: refetchAddresses,
  } = useQuery({
    queryKey: ['user-addresses'],
    queryFn: async () => {
      const response = await axiosInstance.get<ShippingAddressesResponse>(
        '/api/user-addresses'
      )
      return response.data.addresses
    },
  })

  useEffect(() => {
    if (!addresses.some((address) => address.id === addressId)) {
      setAddressId(addresses.find((address) => address.isDefault)?.id ?? '')
    }
  }, [addresses, addressId])

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === addressId),
    [addresses, addressId]
  )

  const subtotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * (i.quantity ?? 1), 0),
    [cart]
  )

  const itemCount = useMemo(
    () => cart.reduce((sum, i) => sum + (i.quantity ?? 1), 0),
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

  const handleCheckout = async () => {
    if (!cart.length || !addressId || isStartingCheckout) return
    setIsStartingCheckout(true)
    try {
      const response = await axiosInstance.post<{
        sessionId: string
      }>('/order/api/create-payment-session', {
        cart: cart.map(({ id, quantity }) => ({
          id,
          quantity: quantity ?? 1,
        })),
        selectedAddressId: addressId,
        coupon: appliedCoupon,
      })
      router.push(`/checkout?sessionId=${encodeURIComponent(response.data.sessionId)}`)
    } catch (error) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof error.response === 'object' &&
        error.response !== null &&
        'data' in error.response &&
        typeof error.response.data === 'object' &&
        error.response.data !== null &&
        'message' in error.response.data &&
        typeof error.response.data.message === 'string'
          ? error.response.data.message
          : 'We couldn’t start checkout. Please try again.'
      toast.error(message)
      setIsStartingCheckout(false)
    }
  }

  const selectDisabled =
    addressesLoading || addressesError || addresses.length === 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
        <header className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              <ShoppingCart size={26} />
              Shopping Cart
            </h1>
            {cart.length > 0 && (
              <p className="mt-1 text-sm text-gray-500">
                {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
              </p>
            )}
          </div>
          {cart.length > 0 && (
            <Link
              href="/"
              className="hidden text-sm font-medium text-gray-600 underline-offset-4 hover:text-gray-900 hover:underline sm:block"
            >
              Continue shopping
            </Link>
          )}
        </header>

        {cart.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <ShoppingCart size={28} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Your cart is empty
            </h2>
            <p className="mb-6 mt-1 text-sm text-gray-500">
              Looks like you haven&apos;t added anything yet.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-700"
            >
              Continue shopping
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
            {/* Cart items */}
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="hidden grid-cols-[1fr_130px_110px_44px] gap-4 border-b border-gray-100 bg-gray-50/70 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:grid">
                <span>Product</span>
                <span className="text-center">Quantity</span>
                <span className="text-right">Total</span>
                <span />
              </div>

              <ul className="divide-y divide-gray-100">
                {cart.map((item) => {
                  const qty = item.quantity ?? 1
                  return (
                    <li
                      key={item.id}
                      className="grid grid-cols-[72px_1fr] items-center gap-x-4 gap-y-3 px-4 py-4 sm:grid-cols-[1fr_130px_110px_44px] sm:px-5"
                    >
                      {/* Product */}
                      <div className="contents sm:flex sm:items-center sm:gap-4">
                        <img
                          src={item.image || '/placeholder.png'}
                          alt={item.title}
                          className="h-[72px] w-[72px] rounded-xl bg-gray-100 object-cover ring-1 ring-gray-200 sm:h-20 sm:w-20"
                          loading="lazy"
                        />
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-medium text-gray-900 sm:text-[15px]">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-sm text-gray-500">
                            {formatINR(item.price)}
                          </p>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-2 flex items-center justify-between sm:col-span-1 sm:justify-center">
                        <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            disabled={qty <= 1}
                            onClick={() => updateCartQuantity(item.id, qty - 1)}
                            className="rounded-l-xl p-2 text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="min-w-[2.25rem] text-center text-sm font-semibold tabular-nums">
                            {qty}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => updateCartQuantity(item.id, qty + 1)}
                            className="rounded-r-xl p-2 text-gray-700 transition hover:bg-gray-100"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {/* Mobile-only total + remove */}
                        <div className="flex items-center gap-3 sm:hidden">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatINR(item.price * qty)}
                          </span>
                          <button
                            type="button"
                            aria-label="Remove from cart"
                            onClick={() =>
                              removeFromCart(item.id, user, location, deviceInfo)
                            }
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Desktop total */}
                      <div className="hidden text-right text-sm font-semibold text-gray-900 sm:block">
                        {formatINR(item.price * qty)}
                      </div>

                      {/* Desktop remove */}
                      <div className="hidden justify-end sm:flex">
                        <button
                          type="button"
                          aria-label="Remove from cart"
                          onClick={() =>
                            removeFromCart(item.id, user, location, deviceInfo)
                          }
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>

            {/* Summary */}
            <aside className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
              <h2 className="text-lg font-semibold text-gray-900">Order summary</h2>

              {/* Shipping address */}
              <div>
                <SectionTitle step={1}>Shipping address</SectionTitle>
                <div className="relative">
                  <MapPin
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <select
                    id="address"
                    value={addressId}
                    onChange={(e) => setAddressId(e.target.value)}
                    disabled={selectDisabled}
                    className="w-full cursor-pointer appearance-none truncate rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-10 text-sm text-gray-900 shadow-sm outline-none transition hover:border-gray-400 focus:border-gray-900 focus:ring-4 focus:ring-gray-900/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">
                      {addressesLoading
                        ? 'Loading saved addresses...'
                        : addressesError
                          ? 'Unable to load addresses'
                          : addresses.length > 0
                            ? 'Choose an address'
                            : 'No saved addresses'}
                    </option>
                    {addresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {[address.label, address.city, address.zip]
                          .filter(Boolean)
                          .join(' · ')}
                        {address.isDefault ? ' (Default)' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={18}
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                </div>

                {/* Selected address preview */}
                {selectedAddress && (
                  <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-sm">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {selectedAddress.name}
                      </span>
                      <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                        {selectedAddress.label}
                      </span>
                      {selectedAddress.isDefault && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-green-700">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="leading-relaxed text-gray-600">
                      {[
                        selectedAddress.street,
                        selectedAddress.city,
                        selectedAddress.state,
                        selectedAddress.zip,
                        selectedAddress.country,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    {selectedAddress.phone && (
                      <p className="mt-1 text-gray-500">{selectedAddress.phone}</p>
                    )}
                  </div>
                )}

                {addressesError ? (
                  <div className="mt-2 text-sm text-red-600">
                    <p role="alert">We couldn&apos;t load your shipping addresses.</p>
                    <button
                      type="button"
                      onClick={() => void refetchAddresses()}
                      className="mt-1 font-medium underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : !addressesLoading && addresses.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">
                    No saved addresses.{' '}
                    <Link
                      href="/profile"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      Add one
                    </Link>
                  </p>
                ) : null}
              </div>

              {/* Payment method */}
              <div>
                <SectionTitle step={2}>Payment method</SectionTitle>
                <div className="flex items-center gap-3 rounded-xl border border-gray-900 bg-gray-50 px-3.5 py-3 text-sm ring-1 ring-gray-900">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white">
                    <CreditCard size={18} />
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium text-gray-900">
                      Online payment
                    </span>
                    <span className="block text-xs text-gray-500">
                      Secure payment with card and supported wallets
                    </span>
                  </span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-900 bg-gray-900 text-white">
                    <Check size={12} strokeWidth={3} />
                  </span>
                </div>
              </div>

              {/* Coupon */}
              <div>
                <SectionTitle step={3}>Coupon</SectionTitle>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-800">
                    <span className="flex items-center gap-2">
                      <Tag size={15} />
                      <span>
                        <span className="font-semibold">{appliedCoupon}</span>{' '}
                        applied (-{formatINR(discount)})
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      aria-label="Remove coupon"
                      className="rounded-md p-1 text-green-700 transition hover:bg-green-100"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag
                        size={15}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                        placeholder="Enter coupon code"
                        className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm uppercase placeholder:normal-case outline-none transition hover:border-gray-400 focus:border-gray-900 focus:ring-4 focus:ring-gray-900/10"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={applyCoupon}
                      className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700"
                    >
                      Apply
                    </button>
                  </div>
                )}
                {couponError && (
                  <p className="mt-1.5 text-xs text-red-600">{couponError}</p>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-2 border-t border-gray-200 pt-4 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">
                    {formatINR(subtotal)}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount</span>
                    <span className="font-medium">-{formatINR(discount)}</span>
                  </div>
                )}
                <div className="flex items-baseline justify-between border-t border-dashed border-gray-200 pt-3 text-base font-semibold text-gray-900">
                  <span>Total</span>
                  <span className="text-xl">{formatINR(total)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={!addressId || isStartingCheckout}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
              >
                {isStartingCheckout ? (
                  'Preparing secure checkout...'
                ) : addressId ? (
                  <>
                    Proceed to checkout
                    <ArrowRight size={16} />
                  </>
                ) : (
                  'Select an address to continue'
                )}
              </button>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

export default CartPage