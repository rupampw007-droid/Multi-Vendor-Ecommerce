'use client'

import { ArrowRight, MapPin, MessageCircle, Star, Store, Tag } from 'lucide-react'
import Link from 'next/link'
import useStartChat from '@/hooks/useStartChat'

export interface ShopCardData {
  id: string
  sellerId?: string
  name: string
  category: string
  bio?: string | null
  address?: string | null
  website?: string | null
  ratings: number
  avatars?: Array<{
    url?: string
    file_url?: string
  }>
}

const getExternalWebsite = (website?: string | null) => {
  if (!website) return undefined

  try {
    const url = new URL(website)
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.href
      : undefined
  } catch {
    return undefined
  }
}

const ShopCard = ({
  shop,
  featured = false,
}: {
  shop: ShopCardData
  featured?: boolean
}) => {
  const { startChat, isStarting, error } = useStartChat()
  const image = shop.avatars?.[0]?.url ?? shop.avatars?.[0]?.file_url
  const rating =
    Number.isFinite(shop.ratings) && shop.ratings > 0
      ? shop.ratings.toFixed(1)
      : null
  const website = getExternalWebsite(shop.website)

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-100 via-indigo-50 to-violet-100">
        {image ? (
          <img
            src={image}
            alt={`${shop.name} shop`}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <Store size={42} aria-hidden="true" className="text-blue-300" />
        )}
        {featured && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-amber-700 shadow-sm">
            <Star size={13} className="fill-amber-400 text-amber-400" />
            Top rated
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 text-lg font-semibold text-gray-900">
            {shop.name}
          </h3>
          <div
            className="flex shrink-0 items-center gap-1 text-sm font-semibold text-gray-700"
            aria-label={rating ? `Rating ${rating} out of 5` : 'Not yet rated'}
          >
            <Star
              size={15}
              className={
                rating
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-gray-300'
              }
            />
            {rating ?? 'New'}
          </div>
        </div>

        <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
          <Tag size={12} />
          {shop.category}
        </span>

        {shop.bio && (
          <p className="mt-3 line-clamp-2 text-sm leading-5 text-gray-600">
            {shop.bio}
          </p>
        )}
        {shop.address && (
          <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-gray-500">
            <MapPin size={14} className="mt-0.5 shrink-0" />
            <span className="line-clamp-2">{shop.address}</span>
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-4 pt-5">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            Browse products
            <ArrowRight size={15} />
          </Link>
          <button
            type="button"
            onClick={() => void startChat(shop.sellerId ?? shop.id)}
            disabled={isStarting}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-60"
          >
            <MessageCircle size={15} />
            {isStarting ? 'Opening…' : 'Chat with Seller'}
          </button>
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              Website
            </a>
          )}
        </div>
        {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    </article>
  )
}

export default ShopCard