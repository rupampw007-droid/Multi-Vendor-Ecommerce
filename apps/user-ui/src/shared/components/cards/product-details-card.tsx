'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  X,
  Star,
  Minus,
  Plus,
  ShoppingCart,
  Heart,
  Store,
  ShieldCheck,
  Truck,
  MapPin,
  MessageCircle,
} from 'lucide-react'

const formatINR = (value?: number) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(value)
    : ''

const ProductDetailsCard = ({
  data,
  setOpen,
}: {
  data: any
  setOpen: (open: boolean) => void
}) => {
  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedColor, setSelectedColor] = useState<string | null>(
    data?.colors?.[0] ?? null
  )
  const [selectedSize, setSelectedSize] = useState<string | null>(
    data?.sizes?.[0] ?? null
  )
  const [wishlisted, setWishlisted] = useState(false)

  // Close on Escape + lock background scroll while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [setOpen])

  const images: { url: string }[] = data?.images?.length
    ? data.images
    : [{ url: '/placeholder.png' }]

  const salePrice = data?.sale_price
  const regularPrice = data?.regular_price
  const hasDiscount =
    typeof salePrice === 'number' &&
    typeof regularPrice === 'number' &&
    regularPrice > salePrice
  const discountPercent = hasDiscount
    ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
    : 0

  const stock = typeof data?.stock === 'number' ? data.stock : undefined
  const outOfStock = stock !== undefined && stock <= 0
  const maxQty = stock !== undefined ? Math.max(stock, 1) : 99
  const rating = Number(data?.ratings ?? 0)

  // Seller (shop) details
  const shop = data?.Shop
  const shopAvatar: string | undefined = shop?.avatar?.url ?? shop?.avatar
  const shopRating = Number(shop?.ratings ?? 0)
  const shopLocation: string | undefined = shop?.address || shop?.location

  const handleChatWithSeller = () => {
    // TODO: implement chat with seller
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={data?.title}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl md:p-6"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 z-10 rounded-full bg-gray-100 p-2 hover:bg-gray-200"
        >
          <X size={18} />
        </button>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Gallery */}
          <div>
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
              <img
                src={images[activeImage]?.url}
                alt={data?.title || 'Product image'}
                className="h-full w-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {images.map((img, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${
                      index === activeImage
                        ? 'border-black'
                        : 'border-transparent'
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={`Thumbnail ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <h2 className="pr-10 text-2xl font-semibold text-gray-900">
              {data?.title}
            </h2>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={
                      i < Math.round(rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }
                  />
                ))}
              </div>
              <span>{rating ? rating.toFixed(1) : 'No ratings yet'}</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-gray-900">
                {formatINR(salePrice ?? regularPrice)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-gray-400 line-through">
                    {formatINR(regularPrice)}
                  </span>
                  <span className="rounded bg-green-100 px-2 py-0.5 text-sm font-semibold text-green-700">
                    {discountPercent}% off
                  </span>
                </>
              )}
            </div>

            <p className="line-clamp-4 text-sm leading-relaxed text-gray-600">
              {data?.short_description || data?.description}
            </p>

            {/* Colors */}
            {data?.colors?.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-800">
                  Color
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.colors.map((color: string) => (
                    <button
                      key={color}
                      type="button"
                      title={color}
                      onClick={() => setSelectedColor(color)}
                      style={{ backgroundColor: color }}
                      className={`h-8 w-8 rounded-full border-2 ${
                        selectedColor === color
                          ? 'border-black ring-2 ring-offset-1 ring-black'
                          : 'border-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {data?.sizes?.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-800">Size</p>
                <div className="flex flex-wrap gap-2">
                  {data.sizes.map((size: string) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`rounded-md border px-3 py-1 text-sm ${
                        selectedSize === size
                          ? 'border-black bg-black text-white'
                          : 'border-gray-300 text-gray-700 hover:border-gray-500'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock */}
            <p
              className={`text-sm font-medium ${
                outOfStock ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {outOfStock
                ? 'Out of stock'
                : stock !== undefined
                ? `In stock (${stock} available)`
                : 'In stock'}
            </p>

            {/* Quantity + actions */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-lg border border-gray-300">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2 hover:bg-gray-100"
                >
                  <Minus size={16} />
                </button>
                <span className="w-10 text-center text-sm font-medium">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  className="p-2 hover:bg-gray-100"
                >
                  <Plus size={16} />
                </button>
              </div>

              <button
                type="button"
                disabled={outOfStock}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <ShoppingCart size={16} />
                Add to cart
              </button>

              <button
                type="button"
                aria-label="Add to wishlist"
                onClick={() => setWishlisted((prev) => !prev)}
                className="rounded-lg border border-gray-300 p-2.5 hover:bg-gray-100"
              >
                <Heart
                  size={18}
                  className={
                    wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'
                  }
                />
              </button>
            </div>

            {/* Seller details */}
            {shop && (
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Sold by
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-gray-500">
                    {shopAvatar ? (
                      <img
                        src={shopAvatar}
                        alt={shop.name || 'Seller'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Store size={20} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/shop/${shop.id}`}
                      className="block truncate text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline"
                    >
                      {shop.name}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Star
                          size={12}
                          className={
                            shopRating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }
                        />
                        {shopRating ? shopRating.toFixed(1) : 'No ratings yet'}
                      </span>
                      {shopLocation && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          <span className="truncate">{shopLocation}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleChatWithSeller}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-100"
                >
                  <MessageCircle size={16} />
                  Chat to Seller
                </button>
              </div>
            )}

            {/* Perks */}
            <div className="space-y-1 border-t pt-4 text-sm text-gray-600">
              <p className="flex items-center gap-2">
                <Truck size={16} /> Fast delivery available
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck size={16} />
                {data?.warranty
                  ? `Warranty: ${data.warranty}`
                  : 'Secure payments'}
              </p>
            </div>

            <Link
              href={`/product/${data?.slug}`}
              className="inline-block text-sm font-medium text-blue-600 hover:underline"
            >
              View full details →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetailsCard