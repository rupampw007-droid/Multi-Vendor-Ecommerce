'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, ShoppingCart, Eye, Star, Timer } from 'lucide-react'

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
  const [wishlisted, setWishlisted] = useState(false)

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
  const outOfStock = typeof product?.stock === 'number' && product.stock <= 0
  const rating = Number(product?.ratings ?? 0)

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

      {/* Hover actions */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-2 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          aria-label="Add to wishlist"
          onClick={() => setWishlisted((prev) => !prev)}
          className="rounded-full bg-white p-2 shadow hover:bg-gray-100"
        >
          <Heart
            size={16}
            className={wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'}
          />
        </button>
        <Link
          href={`/product/${product?.slug}`}
          aria-label="Quick view"
          className="rounded-full bg-white p-2 shadow hover:bg-gray-100"
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
            {formatINR(salePrice ?? regularPrice)}
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
        {isEvent && typeof product?.stock === 'number' && !outOfStock && (
          <p className="text-xs text-gray-500">{product.stock} left in stock</p>
        )}

        <button
          type="button"
          disabled={outOfStock}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-black py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <ShoppingCart size={16} />
          {outOfStock ? 'Unavailable' : 'Add to cart'}
        </button>
      </div>
    </div>
  )
}

export default ProductCard