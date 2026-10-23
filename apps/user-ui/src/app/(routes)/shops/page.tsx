'use client'

import axiosInstance from '@/utils/axiosInstance'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  Star,
  Store,
  Tag,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const PAGE_SIZE = 12

interface ShopImage {
  url?: string
  file_url?: string
}

interface Shop {
  id: string
  name: string
  category: string
  bio?: string | null
  address?: string | null
  website?: string | null
  ratings: number
  avatars?: ShopImage[]
}

interface ShopsResponse {
  shops: Shop[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

interface TopShopsResponse {
  success: boolean
  topShops: Shop[]
}

const getShopImage = (shop: Shop) => {
  const avatar = shop.avatars?.[0]
  return avatar?.url ?? avatar?.file_url
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
  shop: Shop
  featured?: boolean
}) => {
  const image = getShopImage(shop)
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
          <Store
            size={42}
            aria-hidden="true"
            className="text-blue-300"
          />
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
              className={rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
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

        <div className="mt-auto flex items-center gap-4 pt-5">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            Browse products
            <ArrowRight size={15} />
          </Link>
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
      </div>
    </article>
  )
}

const ShopSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
    <div className="h-36 animate-pulse bg-gray-200" />
    <div className="space-y-3 p-5">
      <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200" />
      <div className="h-5 w-1/3 animate-pulse rounded-full bg-gray-200" />
      <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
      <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
    </div>
  </div>
)

const ShopGridSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }, (_, index) => (
      <ShopSkeleton key={index} />
    ))}
  </div>
)

const ShopsPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const {
    data: topShops = [],
    isLoading: topShopsLoading,
    isError: topShopsError,
    refetch: refetchTopShops,
  } = useQuery({
    queryKey: ['top-shops'],
    queryFn: async () => {
      const response = await axiosInstance.get<TopShopsResponse>(
        '/product/api/get-top-shops'
      )
      return response.data.topShops
    },
    staleTime: 1000 * 60 * 5,
  })

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['shops', selectedCategory, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      })
      if (selectedCategory) params.set('categories', selectedCategory)

      const response = await axiosInstance.get<ShopsResponse>(
        `/product/api/get-filtered-shops?${params.toString()}`
      )
      return response.data
    },
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 2,
  })

  const {
    data: categories = [],
    isError: categoriesError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ['shop-categories'],
    queryFn: async () => {
      const response = await axiosInstance.get('/product/api/get-categories')
      const values = response.data.categories
      return Array.isArray(values)
        ? values.filter(
            (value: unknown): value is string => typeof value === 'string'
          )
        : []
    },
    staleTime: 1000 * 60 * 10,
  })

  const shops = data?.shops ?? []
  const filteredShops = shops.filter((shop) =>
    `${shop.name} ${shop.category} ${shop.bio ?? ''}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  )
  const pagination = data?.pagination
  const totalPages = pagination?.totalPages ?? 0

  const selectCategory = (category: string) => {
    setSelectedCategory(category)
    setPage(1)
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa]">
      <section className="overflow-hidden bg-gradient-to-br from-[#101a36] via-[#193a72] to-[#326de0] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-blue-100">
              <Store size={16} />
              The people behind the products
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-5xl">
              Meet our marketplace shops
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
              Discover independent sellers, explore their specialties, and find
              your next favorite shop.
            </p>
          </div>
          <a
            href="#all-shops"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-50"
          >
            Explore shops
            <ArrowDown size={17} />
          </a>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <section aria-labelledby="featured-shops-heading">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-700">
              Loved by shoppers
            </p>
            <h2
              id="featured-shops-heading"
              className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
            >
              Top-rated shops
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              A few of the highest-rated sellers in our marketplace.
            </p>
          </div>

          {topShopsLoading ? (
            <ShopGridSkeleton />
          ) : topShopsError ? (
            <div className="rounded-2xl border border-red-100 bg-white px-6 py-10 text-center">
              <p className="font-semibold text-gray-900">
                Featured shops could not be loaded
              </p>
              <button
                type="button"
                onClick={() => void refetchTopShops()}
                className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Try again
              </button>
            </div>
          ) : topShops.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {topShops.slice(0, 3).map((shop) => (
                <ShopCard key={shop.id} shop={shop} featured />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-600">
              There are no featured shops yet. Check out the full directory
              below.
            </div>
          )}
        </section>

        <section id="all-shops" aria-labelledby="all-shops-heading">
          <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">
                Find your seller
              </p>
              <h2
                id="all-shops-heading"
                className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
              >
                All shops
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Browse shops by category or search this page of results.
              </p>
            </div>

            <label className="relative block w-full md:max-w-sm">
              <span className="sr-only">Search shops on this page</span>
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search shops on this page"
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => selectCategory('')}
              aria-pressed={!selectedCategory}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                !selectedCategory
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:border-gray-500'
              }`}
            >
              All categories
            </button>
            {categoriesError ? (
              <button
                type="button"
                onClick={() => void refetchCategories()}
                className="text-sm font-medium text-blue-700 hover:underline"
              >
                Could not load categories. Try again
              </button>
            ) : (
              categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  onClick={() => selectCategory(category)}
                  aria-pressed={selectedCategory === category}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    selectedCategory === category
                      ? 'bg-blue-700 text-white'
                      : 'border border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-700'
                  }`}
                >
                  {category}
                </button>
              ))
            )}
          </div>

          <div className="mb-4 flex min-h-6 flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-600" aria-live="polite">
              {pagination
                ? `${pagination.total} ${
                    pagination.total === 1 ? 'shop' : 'shops'
                  } found`
                : 'Browse marketplace shops'}
              {search.trim() && ` · ${filteredShops.length} on this page match`}
            </p>
            {isFetching && !isLoading && (
              <span className="text-xs text-gray-500">Updating shops…</span>
            )}
          </div>

          {isLoading ? (
            <ShopGridSkeleton count={PAGE_SIZE} />
          ) : isError ? (
            <div className="rounded-2xl border border-red-100 bg-white px-6 py-14 text-center">
              <h3 className="font-semibold text-gray-900">
                Shops could not be loaded
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Please check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="mt-5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Try again
              </button>
            </div>
          ) : filteredShops.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredShops.map((shop) => (
                  <ShopCard key={shop.id} shop={shop} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav
                  aria-label="Shop pages"
                  className="mt-8 flex items-center justify-center gap-4"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {pagination?.page ?? page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                    disabled={page >= totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </nav>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
              <Store size={30} className="mx-auto text-gray-400" />
              <h3 className="mt-4 font-semibold text-gray-900">
                {search.trim()
                  ? 'No shops match your search on this page'
                  : 'No shops found'}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {search.trim()
                  ? 'Try another name or browse the next page of shops.'
                  : 'Try another category or check back later.'}
              </p>
              {search.trim() && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="mt-5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default ShopsPage
