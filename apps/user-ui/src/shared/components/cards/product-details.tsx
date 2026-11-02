'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import useStartChat from '@/hooks/useStartChat'
import useUser from '@/hooks/useUser'
import useLocationTracking from '@/hooks/useLocationTracking'
import useDeviceTracking from '@/hooks/useDeviceTracking'
import { useStore } from '@/store'
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

type ProductImage = string | {
  url?: string
  file_url?: string
}

interface ProductShop {
  id?: string
  sellerId?: string
  name?: string
  avatar?: string | ProductImage
  avatars?: ProductImage[]
  ratings?: number
  address?: string
  location?: string
}

interface ProductDetailsData {
  id?: string
  title?: string
  slug?: string
  images?: ProductImage[]
  sale_price?: number
  regular_price?: number
  stock?: number
  ratings?: number
  short_description?: string
  description?: string
  detailed_description?: string
  colors?: string[]
  sizes?: string[]
  category?: string
  subCategory?: string
  brand?: string
  tags?: string | string[]
  custom_specifications?: unknown
  custom_properties?: unknown
  starting_date?: string | Date | null
  ending_date?: string | Date | null
  video_url?: string | null
  warranty?: string | null
  cashOnDelivery?: string | null
  cash_on_delivery?: string | null
  Shop?: ProductShop
}

const formatDetailValue = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.map(formatDetailValue).filter(Boolean).join(', ')
  }
  return JSON.stringify(value)
}

const getDetailEntries = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return []
      const entry = item as Record<string, unknown>
      const label = entry.name ?? entry.label ?? entry.key ?? `Detail ${index + 1}`
      const detail = entry.value ?? entry.values ?? entry.description
      const formattedValue = formatDetailValue(detail)
      return formattedValue ? [{ label: String(label), value: formattedValue }] : []
    })
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([label, detail]) => {
      const formattedValue = formatDetailValue(detail)
      return formattedValue ? [{ label, value: formattedValue }] : []
    })
  }
  return []
}

const formatDate = (value?: string | Date | null) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date)
}

export const formatINR = (value?: number) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(value)
    : ''

export interface ProductDetailsProps {
  /** Product object (title, images, prices, colors, sizes, stock, Shop, ...) */
  data: ProductDetailsData
  /** Optional. If provided, a close button is shown and Escape also calls it. */
  onClose?: () => void
  /** Optional. Called when "Chat to Seller" is clicked. */
  onChatWithSeller?: (shop?: ProductShop) => void
  /** Optional. Called when "Add to cart" is clicked. */
  onAddToCart?: (payload: {
    product: ProductDetailsData
    quantity: number
    color: string | null
    size: string | null
  }) => void
  /** Optional. Hide the "View full details" link (useful when already on the product page). */
  hideFullDetailsLink?: boolean
  className?: string
}

export const ProductDetails = ({
  data,
  onClose,
  onChatWithSeller,
  onAddToCart,
  hideFullDetailsLink = false,
  className = '',
}: ProductDetailsProps) => {
  const { startChat, isStarting, error: chatError } = useStartChat()
  const { user } = useUser()
  const location = useLocationTracking()
  const deviceInfo = useDeviceTracking()
  const addToCart = useStore((state) => state.addToCart)
  const addToWishlist = useStore((state) => state.addToWishlist)
  const removeFromWishlist = useStore((state) => state.removeFromWishlist)
  const isWishlisted = useStore((state) =>
    state.wishlist.some((product) => product.id === data?.id),
  )
  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedColor, setSelectedColor] = useState<string | null>(
    data?.colors?.[0] ?? null
  )
  const [selectedSize, setSelectedSize] = useState<string | null>(
    data?.sizes?.[0] ?? null
  )
  const [addedToCart, setAddedToCart] = useState(false)

  // Close on Escape (only when an onClose handler is provided)
  useEffect(() => {
    if (!onClose) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    setAddedToCart(false)
  }, [data?.id])

  const productImages =
    data?.images
      ?.map((image) =>
        typeof image === 'string' ? image : image.url ?? image.file_url
      )
      .filter((url): url is string => Boolean(url))
      .map((url) => ({ url })) ?? []
  const images = productImages.length
    ? productImages
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
  const avatar = shop?.avatars?.[0] ?? shop?.avatar
  const shopAvatar =
    typeof avatar === 'string' ? avatar : avatar?.url ?? avatar?.file_url
  const shopRating = Number(shop?.ratings ?? 0)
  const shopLocation: string | undefined = shop?.address || shop?.location
  const specifications = getDetailEntries(data?.custom_specifications)
  const properties = getDetailEntries(data?.custom_properties)
  const tags =
    typeof data?.tags === 'string'
      ? data.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : data?.tags ?? []
  const startingDate = formatDate(data?.starting_date)
  const endingDate = formatDate(data?.ending_date)
  const cashOnDelivery = data?.cashOnDelivery ?? data?.cash_on_delivery

  const handleChatWithSeller = () => {
    if (onChatWithSeller) {
      onChatWithSeller(shop)
      return
    }
    void startChat(shop?.sellerId ?? shop?.id)
  }

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart({
        product: data,
        quantity,
        color: selectedColor,
        size: selectedSize,
      })
      return
    }
    if (!data?.id) return
    addToCart(
      {
        id: data.id,
        title: data.title ?? 'Product',
        price: salePrice ?? regularPrice ?? 0,
        image: images[0]?.url ?? '/placeholder.png',
        quantity,
        shopId: shop?.id ?? '',
      },
      user,
      location,
      deviceInfo,
    )
    setAddedToCart(true)
  }

  const handleWishlist = () => {
    if (!data?.id) return
    const product = {
      id: data.id,
      title: data.title ?? 'Product',
      price: salePrice ?? regularPrice ?? 0,
      image: images[0]?.url ?? '/placeholder.png',
      quantity: 1,
      shopId: shop?.id ?? '',
    }
    if (isWishlisted) {
      removeFromWishlist(data.id, user, location, deviceInfo)
    } else {
      addToWishlist(product, user, location, deviceInfo)
    }
  }

  return (
    <main className="min-h-screen bg-[#f1f3f6] px-3 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500 sm:text-sm">
          <Link href="/" className="hover:text-blue-700 hover:underline">Home</Link>
          <span className="mx-2">›</span>
          {data?.category && (
            <>
              <Link href="/products" className="hover:text-blue-700 hover:underline">
                {data.category}
              </Link>
              <span className="mx-2">›</span>
            </>
          )}
          <span className="line-clamp-1 text-slate-700">{data?.title}</span>
        </nav>

        <section
          aria-label={data?.title}
          className={`relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8 ${className}`}
        >
          {onClose && (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-full bg-gray-100 p-2 hover:bg-gray-200"
            >
              <X size={18} />
            </button>
          )}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
            {/* Gallery */}
            <div className="lg:sticky lg:top-6 lg:self-start">
              <div className="flex min-h-[340px] items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white sm:min-h-[480px]">
                <img
                  src={images[activeImage]?.url}
                  alt={data?.title || 'Product image'}
                  className="h-full max-h-[620px] w-full object-contain p-4 transition-transform duration-300 hover:scale-[1.04] sm:p-8"
                />
              </div>
              {images.length > 1 && (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setActiveImage(index)}
                      aria-label={`View product image ${index + 1}`}
                      aria-pressed={index === activeImage}
                      className={`h-[68px] w-[68px] shrink-0 overflow-hidden rounded-lg border-2 bg-white p-1 transition sm:h-20 sm:w-20 ${
                        index === activeImage
                          ? 'border-blue-600 shadow-sm'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <img
                        src={img.url}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600 sm:text-sm">
                <span className="rounded-full bg-blue-50 px-3 py-1.5">Genuine product</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1.5">Secure checkout</span>
                <span className="rounded-full bg-amber-50 px-3 py-1.5">Easy support</span>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-5">
          <h1 className={`text-xl font-semibold leading-snug text-slate-900 sm:text-2xl ${onClose ? 'pr-10' : ''}`}>
            {data?.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
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
            {data?.brand && <span className="text-slate-300">|</span>}
            {data?.brand && <span>{data.brand}</span>}
          </div>

          {/* Price */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
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
          <p className="mt-1 text-xs text-slate-500">Inclusive of applicable taxes</p>
          {hasDiscount && (
            <p className="mt-3 inline-flex rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
              Special price · You save {formatINR((regularPrice ?? 0) - (salePrice ?? 0))}
            </p>
          )}
          </div>

          <p className="text-sm leading-6 text-slate-600">
            {data?.short_description || data?.description}
          </p>

          {/* Colors */}
          {data?.colors && data.colors.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-800">Color</p>
              <div className="flex flex-wrap gap-2">
                {data.colors.map((color: string) => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    aria-label={`Select color ${color}`}
                    aria-pressed={selectedColor === color}
                    onClick={() => setSelectedColor(color)}
                    style={{ backgroundColor: color }}
                    className={`h-9 w-9 rounded-full border-2 ${
                      selectedColor === color
                        ? 'border-blue-600 ring-2 ring-offset-2 ring-blue-600'
                        : 'border-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {data?.sizes && data.sizes.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-800">Size</p>
              <div className="flex flex-wrap gap-2">
                {data.sizes.map((size: string) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-md border px-3 py-1 text-sm ${
                      selectedSize === size
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 text-gray-700 hover:border-blue-500'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock */}
          {/* Buy box */}
          <div className="rounded-xl border border-slate-200 p-4 sm:p-5">
          <p
            className={`text-sm font-semibold ${
              outOfStock ? 'text-red-600' : 'text-emerald-700'
            }`}
          >
            {outOfStock
              ? 'Currently unavailable'
              : stock !== undefined
              ? `In stock · ${stock} available`
              : 'In stock'}
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <Truck size={16} className="text-blue-600" />
            Delivery options and estimated dates at checkout
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border border-gray-300">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-2.5 hover:bg-gray-100"
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
                className="p-2.5 hover:bg-gray-100"
              >
                <Plus size={16} />
              </button>
            </div>

            <button
              type="button"
              disabled={outOfStock}
              onClick={handleAddToCart}
              className="flex min-w-[155px] flex-1 items-center justify-center gap-2 rounded-full bg-[#fb641b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e85b17] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <ShoppingCart size={16} />
              {addedToCart ? 'Added to cart' : 'Add to cart'}
            </button>

            <button
              type="button"
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-pressed={isWishlisted}
              onClick={handleWishlist}
              className="rounded-full border border-gray-300 p-3 hover:bg-gray-100"
            >
              <Heart
                size={18}
                className={
                  isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'
                }
              />
            </button>
          </div>
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
            Safe and secure payments · Easy returns · Customer support
          </p>
          </div>

          {/* Seller details */}
          {shop && (
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sold by
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-gray-500">
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
                disabled={isStarting}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-blue-600 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60"
              >
                <MessageCircle size={16} />
                {isStarting ? 'Opening chat…' : 'Chat with Seller'}
              </button>
              {chatError && (
                <p role="alert" className="mt-2 text-xs text-red-600">
                  {chatError}
                </p>
              )}
            </div>
          )}

          {/* Perks */}
          <div className="space-y-2 border-t pt-4 text-sm text-gray-600">
            <p className="flex items-center gap-2">
              <Truck size={16} /> Fast delivery available
            </p>
            <p className="flex items-center gap-2">
              <ShieldCheck size={16} />
              {data?.warranty ? `Warranty: ${data.warranty}` : 'Secure payments'}
            </p>
          </div>

          {!hideFullDetailsLink && data?.slug && (
            <Link
              href={`/product/${data.slug}`}
              className="inline-block text-sm font-medium text-blue-600 hover:underline"
            >
              View full details →
            </Link>
          )}
            </div>
      </div>

      {(data?.category || data?.subCategory || data?.brand || tags.length > 0) && (
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-5 text-sm text-gray-600">
          {data?.category && (
            <span>
              <span className="font-medium text-gray-800">Category:</span>{' '}
              {data.category}
              {data.subCategory ? ` / ${data.subCategory}` : ''}
            </span>
          )}
          {!data?.category && data?.subCategory && (
            <span>
              <span className="font-medium text-gray-800">Subcategory:</span>{' '}
              {data.subCategory}
            </span>
          )}
          {data?.brand && (
            <span>
              <span className="font-medium text-gray-800">Brand:</span> {data.brand}
            </span>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag: string) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {(specifications.length > 0 || properties.length > 0) && (
        <section className="mt-6 border-t pt-5">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            Specifications & product features
          </h3>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            {[...specifications, ...properties].map(({ label, value }) => (
              <div
                key={`${label}-${value}`}
                className="flex justify-between gap-4 border-b py-2 text-sm"
              >
                <dt className="font-medium text-gray-700">{label}</dt>
                <dd className="text-right text-gray-600">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {(startingDate || endingDate || cashOnDelivery || data?.video_url) && (
        <div className="mt-6 grid gap-3 border-t pt-5 text-sm text-gray-600 sm:grid-cols-2">
          {(startingDate || endingDate) && (
            <p>
              <span className="font-medium text-gray-800">Offer period:</span>{' '}
              {startingDate || '—'}{endingDate ? ` – ${endingDate}` : ''}
            </p>
          )}
          {cashOnDelivery && (
            <p>
              <span className="font-medium text-gray-800">Cash on delivery:</span>{' '}
              {cashOnDelivery.toLowerCase() === 'yes'
                ? 'Available'
                : cashOnDelivery.toLowerCase() === 'no'
                  ? 'Not available'
                  : cashOnDelivery}
            </p>
          )}
          {data?.video_url && (
            <a
              href={data.video_url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-blue-600 hover:underline"
            >
              Watch product video
            </a>
          )}
        </div>
      )}

      {/* Detailed description (HTML from the rich-text editor) */}
      {data?.detailed_description && (
        <div className="mt-8 border-t pt-6">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            Product details
          </h3>
          <div
            className="max-w-none break-words text-sm leading-relaxed text-gray-700"
            dangerouslySetInnerHTML={{ __html: data.detailed_description }}
          />
        </div>
      )}
        </section>
      </div>
    </main>
  )
}

export default ProductDetails