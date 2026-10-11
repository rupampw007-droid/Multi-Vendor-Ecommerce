'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, ShoppingCart, Eye, Star, Timer } from 'lucide-react'
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

const getTimeLeft = (endDate?: string | Date) => {
  if (!endDate) return null
  const diff = new Date(endDate).getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff / 3600000) % 24)
  const m = Math.floor((diff / 60000) % 60)
  return d > 0 ? `${d}d ${h}h left` : `${h}h ${m}m left`
}

const ProductCard = ({
  product,
  isEvent,
}: {
  product: any
  isEvent?: boolean
}) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null)
  const { user } = useUser()
  const location = useLocationTracking()
  const deviceInfo = useDeviceTracking()

  // Store actions (names must match the store exactly)
  const addToCart = useStore((s) => s.addToCart)
  const addToWishlist = useStore((s) => s.addToWishlist)
  const removeFromWishlist = useStore((s) => s.removeFromWishlist)

  // Derived state: subscribe to the item itself so the card re-renders on change
  const cartItem = useStore((s) => s.cart.find((i) => i.id === product?.id))
  const isWishlisted = useStore((s) =>
    s.wishlist.some((i) => i.id === product?.id)
  )
  const cartQty = cartItem?.quantity ?? 0
  const isInCart = !!cartItem

  useEffect(() => {
    if (!isEvent) return
    setTimeLeft(getTimeLeft(product?.ending_date))
    const timer = setInterval(
      () => setTimeLeft(getTimeLeft(product?.ending_date)),
      60000
    )
    return () => clearInterval(timer)
  }, [isEvent, product?.ending_date])

  const image = product?.images?.[0]?.url || '/placeholder.png'
  const salePrice = product?.sale_price
  const regularPrice = product?.regular_price
  const hasDiscount =
    typeof salePrice === 'number' &&
    typeof regularPrice === 'number' &&
    regularPrice > salePrice
  const discountPercent = hasDiscount
    ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
    : 0
  const currentPrice: number = salePrice ?? regularPrice ?? 0
  const stock = typeof product?.stock === 'number' ? product.stock : undefined
  const outOfStock = stock !== undefined && stock <= 0
  const maxedOut = stock !== undefined && cartQty >= stock
  const rating = Number(product?.ratings ?? 0)

  // Shape the API product into what the store expects
  const storeProduct = {
    id: product?.id as string,
    title: product?.title as string,
    price: currentPrice,
    image,
    quantity: 1,
    shopId: (product?.Shop?.id ?? product?.shopId ?? '') as string,
  }

  const handleWishlist = () => {
    if (isWishlisted) {
      removeFromWishlist(product.id, user, location, deviceInfo)
    } else {
      addToWishlist(storeProduct, user, location, deviceInfo)
    }
  }

  const handleAddToCart = () => {
    if (outOfStock || maxedOut) return
    addToCart(storeProduct, user, location, deviceInfo)
  }

  const buttonLabel = outOfStock
    ? 'Unavailable'
    : maxedOut
      ? `Max in cart (${cartQty})`
      : isInCart
        ? `In cart (${cartQty}) · Add more`
        : 'Add to cart'

  return (
    <div className="group relative w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-lg">
      {/* Badges */}
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-1">
        {isEvent && (
          <span className="rounded-md bg-red-600 px-2 py-1 text-[11px] font-semibold uppercase text-white">
            Offer
          </span>
        )}
        {hasDiscount && (
          <span className="rounded-md bg-green-600 px-2 py-1 text-[11px] font-semibold text-white">
            -{discountPercent}%
          </span>
        )}
        {outOfStock && (
          <span className="rounded-md bg-gray-800 px-2 py-1 text-[11px] font-semibold text-white">
            Out of stock
          </span>
        )}
      </div>

      {/* Actions: heart stays visible when wishlisted, rest on hover */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
        <button
          type="button"
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={isWishlisted}
          onClick={handleWishlist}
          className={`rounded-full bg-white p-2 shadow transition hover:bg-gray-100 ${
            isWishlisted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <Heart
            size={16}
            className={isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'}
          />
        </button>
        <Link
          href={`/product/${product?.slug}`}
          aria-label="Quick view"
          className="rounded-full bg-white p-2 opacity-0 shadow transition hover:bg-gray-100 group-hover:opacity-100"
        >
          <Eye size={16} className="text-gray-600" />
        </Link>
      </div>

      {/* Image */}
      <Link href={`/product/${product?.slug}`} className="block">
        <div className="aspect-square w-full overflow-hidden bg-gray-100">
          <img
            src={image}
            alt={product?.title || 'Product image'}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      </Link>

      {/* Details */}
      <div className="space-y-2 p-4">
        {product?.Shop?.name && (
          <Link
            href={`/shop/${product.Shop.id}`}
            className="block text-xs text-blue-600 hover:underline"
          >
            {product.Shop.name}
          </Link>
        )}

        <Link href={`/product/${product?.slug}`}>
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-gray-900">
            {product?.title}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Star size={14} className="fill-yellow-400 text-yellow-400" />
          <span>{rating ? rating.toFixed(1) : 'No ratings'}</span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold text-gray-900">
            {formatINR(currentPrice)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              {formatINR(regularPrice)}
            </span>
          )}
        </div>

        {/* Event countdown / stock */}
        {isEvent && timeLeft && (
          <div className="flex items-center gap-1 text-xs font-medium text-red-600">
            <Timer size={14} />
            {timeLeft}
          </div>
        )}
        {isEvent && stock !== undefined && !outOfStock && (
          <p className="text-xs text-gray-500">{stock} left in stock</p>
        )}

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={outOfStock || maxedOut}
          className={`mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-gray-300 ${
            isInCart ? 'bg-green-600 hover:bg-green-700' : 'bg-black hover:bg-gray-800'
          }`}
        >
          <ShoppingCart size={16} />
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}

export default ProductCard