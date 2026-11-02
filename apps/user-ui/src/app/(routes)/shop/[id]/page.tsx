'use client'

import ProductCard from '@/shared/components/cards/product-card'
import useDeviceTracking from '@/hooks/useDeviceTracking'
import useLocationTracking from '@/hooks/useLocationTracking'
import useUser from '@/hooks/useUser'
import { sendKafkaEvent } from '@/actions/track-user'
import axiosInstance from '@/utils/axiosInstance'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  ExternalLink,
  Heart,
  MapPin,
  MessageCircle,
  Package,
  Star,
  Store,
  Tag,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface ShopReview {
  id: string
  rating: number
  reviews: string | null
  createdAt: string
  user: {
    name: string
    avatars: Array<{ url: string }>
  }
}

interface ShopProduct {
  id: string
  title: string
  slug: string
  sale_price: number
  regular_price: number
  starting_date?: string | null
  ending_date?: string | null
  [key: string]: unknown
}

interface ShopDetails {
  id: string
  name: string
  bio: string | null
  category: string
  address: string
  opening_hours: string | null
  website: string | null
  converBanner: string | null
  ratings: number
  averageRating: number
  followerCount: number
  reviewCount: number
  createdAt: string
  avatars: Array<{ url: string }>
  socialLinks: unknown[]
  reviews: ShopReview[]
  products: ShopProduct[]
}

interface ShopResponse {
  shop: ShopDetails
}

interface FollowResponse {
  following: boolean
  followerCount: number
}

interface SocialProfile {
  platform: string
  url: string
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-IN', {
        month: 'long',
        year: 'numeric',
      }).format(date)
}

const getSafeExternalUrl = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return null
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.href
      : null
  } catch {
    return null
  }
}

const getSocialProfiles = (links: unknown[]): SocialProfile[] => {
  const profiles: SocialProfile[] = []
  for (const entry of links) {
    if (typeof entry === 'string') {
      const url = getSafeExternalUrl(entry)
      if (url) {
        const platform =
          new URL(url).hostname.split('.').find((part) =>
            ['facebook', 'instagram', 'youtube', 'twitter', 'x'].includes(
              part.toLowerCase(),
            ),
          ) ?? 'website'
        profiles.push({ platform, url })
      }
      continue
    }
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const values = entry as Record<string, unknown>
    const platformValue = values.platform ?? values.name ?? values.type
    const urlValue = values.url ?? values.href ?? values.link
    if (typeof platformValue === 'string') {
      const url = getSafeExternalUrl(urlValue)
      if (url) profiles.push({ platform: platformValue.toLowerCase(), url })
      continue
    }
    for (const [platform, value] of Object.entries(values)) {
      if (!['facebook', 'instagram', 'youtube', 'twitter', 'x'].includes(platform.toLowerCase())) {
        continue
      }
      const candidate =
        typeof value === 'string'
          ? value
          : value && typeof value === 'object' && 'url' in value
            ? value.url
            : null
      const url = getSafeExternalUrl(candidate)
      if (url) profiles.push({ platform: platform.toLowerCase(), url })
    }
  }
  return profiles
}

const formatRating = (rating: number) =>
  Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : 'New'

const getRatingDistribution = (reviews: ShopReview[]) =>
  [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => Math.round(review.rating) === rating)
      .length,
  }))

const isCurrentProduct = (product: ShopProduct, now: number) => {
  const start = product.starting_date
    ? new Date(product.starting_date).getTime()
    : 0
  const end = product.ending_date
    ? new Date(product.ending_date).getTime()
    : Number.POSITIVE_INFINITY
  return start <= now && end >= now
}

const SocialIcon = ({ platform }: { platform: string }) => {
  if (platform === 'x' || platform.includes('twitter')) {
    return (
      <span aria-hidden="true" className="text-sm font-bold">
        X
      </span>
    )
  }
  return <ExternalLink size={16} />
}

const ShopPage = () => {
  const params = useParams<{ id: string }>()
  const shopId = params.id
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, isLoading: userLoading } = useUser()
  const location = useLocationTracking()
  const deviceInfo = useDeviceTracking()
  const visitSentForShop = useRef<string | null>(null)
  const [followerCount, setFollowerCount] = useState<number | null>(null)
  const [followError, setFollowError] = useState('')

  const {
    data: shop,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['shop-details', shopId],
    queryFn: async () => {
      const response = await axiosInstance.get<ShopResponse>(
        `/product/api/get-shop/${encodeURIComponent(shopId)}`,
      )
      return response.data.shop
    },
    enabled: Boolean(shopId),
  })

  useEffect(() => {
    if (shop) setFollowerCount(shop.followerCount)
  }, [shop])

  useEffect(() => {
    if (
      !shop ||
      !deviceInfo ||
      userLoading ||
      visitSentForShop.current === shop.id
    ) {
      return
    }

    const timeout = window.setTimeout(
      () => {
        if (visitSentForShop.current === shop.id) return
        visitSentForShop.current = shop.id
        void sendKafkaEvent({
          userId: user?.id ?? null,
          shopId: shop.id,
          action: 'shop_visit',
          country: location?.country ?? 'Unknown',
          city: location?.city ?? 'Unknown',
          device: deviceInfo,
        }).then((sent) => {
          if (!sent) console.error('Shop visit analytics could not be sent.')
        })
      },
      location ? 0 : 1500,
    )

    return () => window.clearTimeout(timeout)
  }, [deviceInfo, location, shop, user?.id, userLoading])

  const followMutation = useMutation({
    mutationFn: async (follow: boolean) => {
      const response = await axiosInstance.patch<FollowResponse>(
        `/api/follow-shop/${encodeURIComponent(shopId)}`,
        { follow },
      )
      return response.data
    },
    onSuccess: (result) => {
      setFollowerCount(result.followerCount)
      setFollowError('')
      queryClient.setQueryData<{ following?: string[] }>(
        ['user'],
        (current) => {
          if (!current) return current
          const following = current.following ?? []
          return {
            ...current,
            following: result.following
              ? Array.from(new Set([...following, shopId]))
              : following.filter((id) => id !== shopId),
          }
        },
      )
    },
    onError: () => {
      setFollowError('We could not update your follow status. Please try again.')
    },
  })

  const followShop = () => {
    if (!user) {
      router.push('/login')
      return
    }
    setFollowError('')
    followMutation.mutate(!isFollowing)
  }

  const isFollowing = Boolean(user?.following?.includes(shopId))
  const products = shop?.products ?? []
  const now = Date.now()
  const availableProducts = products.filter((product) =>
    isCurrentProduct(product, now),
  )
  const offers = availableProducts.filter(
    (product) =>
      Number.isFinite(product.sale_price) &&
      Number.isFinite(product.regular_price) &&
      product.regular_price > product.sale_price,
  )
  const socialProfiles = shop ? getSocialProfiles(shop.socialLinks) : []
  const ratingDistribution = shop
    ? getRatingDistribution(shop.reviews)
    : []
  const banner = getSafeExternalUrl(shop?.converBanner)
  const avatar = getSafeExternalUrl(shop?.avatars[0]?.url)
  const website = getSafeExternalUrl(shop?.website)

  return (
    <main className="min-h-screen bg-[#f7f8fa] pb-16">
      {isLoading ? (
        <div
          role="status"
          aria-label="Loading shop"
          className="mx-auto max-w-7xl animate-pulse px-4 py-8 sm:px-6 lg:px-8"
        >
          <div className="h-64 rounded-3xl bg-gray-200" />
          <div className="mt-6 h-24 rounded-2xl bg-gray-200" />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <div className="h-48 rounded-2xl bg-gray-200" />
            <div className="h-48 rounded-2xl bg-gray-200" />
            <div className="h-48 rounded-2xl bg-gray-200" />
          </div>
        </div>
      ) : isError || !shop ? (
        <section
          role="alert"
          className="mx-auto max-w-2xl px-4 py-24 text-center"
        >
          <Store size={42} className="mx-auto text-gray-400" />
          <h1 className="mt-5 text-2xl font-bold text-gray-900">
            This shop is unavailable
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            We couldn&apos;t load this shop right now.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-5 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Try again
          </button>
          <Link
            href="/shops"
            className="mt-4 block text-sm font-semibold text-blue-700 hover:underline"
          >
            Browse all shops
          </Link>
        </section>
      ) : (
        <>
          <section className="relative isolate h-64 overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 sm:h-80">
            {banner && (
              <img
                src={banner}
                alt=""
                className="absolute inset-0 -z-10 h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-gray-950/85 via-gray-950/50 to-gray-950/20" />
            <div className="mx-auto flex h-full max-w-7xl items-end px-4 pb-8 sm:px-6 sm:pb-10 lg:px-8">
              <div className="flex items-center gap-4 text-white sm:gap-6">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/80 bg-white shadow-lg sm:h-24 sm:w-24">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={`${shop.name} logo`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Store size={34} className="text-blue-700" />
                  )}
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    <Store size={13} />
                    {shop.category}
                  </span>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                    {shop.name}
                  </h1>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
                    <MapPin size={15} />
                    {shop.address}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <section className="-mt-1 flex flex-col gap-5 rounded-b-2xl border border-t-0 border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex items-center gap-2">
                  <Star
                    size={19}
                    className="fill-amber-400 text-amber-400"
                  />
                  <span className="font-bold text-gray-900">
                    {formatRating(shop.averageRating)}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({shop.reviewCount} reviews)
                  </span>
                </div>
                <span className="h-5 w-px bg-gray-200" aria-hidden="true" />
                <div className="text-sm text-gray-600">
                  <strong className="text-gray-900">
                    {followerCount ?? shop.followerCount}
                  </strong>{' '}
                  followers
                </div>
                <div className="text-sm text-gray-600">
                  <strong className="text-gray-900">{products.length}</strong>{' '}
                  products
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={followShop}
                  disabled={followMutation.isPending || userLoading}
                  aria-pressed={isFollowing}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isFollowing
                      ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      : 'bg-blue-700 text-white hover:bg-blue-800'
                  }`}
                >
                  <Heart
                    size={16}
                    className={isFollowing ? 'fill-rose-500 text-rose-500' : ''}
                  />
                  {followMutation.isPending
                    ? 'Updating…'
                    : isFollowing
                      ? 'Following'
                      : 'Follow shop'}
                </button>
                <a
                  href="#products"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Explore products
                  <ArrowUpRight size={15} />
                </a>
              </div>
              {followError && (
                <p role="alert" className="text-sm text-red-600 sm:basis-full">
                  {followError}
                </p>
              )}
            </section>

            <nav
              aria-label="Shop sections"
              className="sticky top-0 z-20 mt-5 flex gap-6 overflow-x-auto border-b border-gray-200 bg-[#f7f8fa]/95 px-1 py-3 text-sm font-semibold text-gray-600 backdrop-blur"
            >
              <a className="whitespace-nowrap hover:text-blue-700" href="#about">
                About
              </a>
              <a
                className="whitespace-nowrap hover:text-blue-700"
                href="#products"
              >
                Products ({availableProducts.length})
              </a>
              <a className="whitespace-nowrap hover:text-blue-700" href="#offers">
                Offers ({offers.length})
              </a>
              <a
                className="whitespace-nowrap hover:text-blue-700"
                href="#reviews"
              >
                Reviews ({shop.reviewCount})
              </a>
            </nav>

            <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0 space-y-12">
                <section id="about" aria-labelledby="about-heading">
                  <div className="mb-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                      Get to know us
                    </p>
                    <h2
                      id="about-heading"
                      className="mt-1 text-2xl font-bold text-gray-900"
                    >
                      About {shop.name}
                    </h2>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
                    <p className="whitespace-pre-line text-sm leading-7 text-gray-600">
                      {shop.bio || 'This shop has not added an introduction yet.'}
                    </p>
                    <div className="mt-6 grid gap-4 border-t border-gray-100 pt-6 sm:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <Clock3
                          size={18}
                          className="mt-0.5 shrink-0 text-blue-700"
                        />
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">
                            Opening hours
                          </h3>
                          <p className="mt-1 whitespace-pre-line text-sm text-gray-600">
                            {shop.opening_hours || 'Hours not provided'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin
                          size={18}
                          className="mt-0.5 shrink-0 text-blue-700"
                        />
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">
                            Location
                          </h3>
                          <p className="mt-1 text-sm text-gray-600">
                            {shop.address}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section id="products" aria-labelledby="products-heading">
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                        Made available by this shop
                      </p>
                      <h2
                        id="products-heading"
                        className="mt-1 text-2xl font-bold text-gray-900"
                      >
                        Products
                      </h2>
                    </div>
                    <span className="text-sm text-gray-500">
                      {availableProducts.length} items
                    </span>
                  </div>
                  {availableProducts.length ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {availableProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
                      <Package size={28} className="mx-auto text-gray-400" />
                      <p className="mt-3 text-sm text-gray-600">
                        This shop hasn&apos;t listed any products yet.
                      </p>
                    </div>
                  )}
                </section>

                <section id="offers" aria-labelledby="offers-heading">
                  <div className="mb-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
                      Limited-time savings
                    </p>
                    <h2
                      id="offers-heading"
                      className="mt-1 text-2xl font-bold text-gray-900"
                    >
                      Shop offers
                    </h2>
                  </div>
                  {offers.length ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {offers.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          isEvent
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
                      <Tag size={25} className="mx-auto text-gray-400" />
                      <p className="mt-3 text-sm text-gray-600">
                        There are no active offers from this shop right now.
                      </p>
                    </div>
                  )}
                </section>

                <section id="reviews" aria-labelledby="reviews-heading">
                  <div className="mb-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                      Feedback from the community
                    </p>
                    <h2
                      id="reviews-heading"
                      className="mt-1 text-2xl font-bold text-gray-900"
                    >
                      Customer reviews
                    </h2>
                  </div>
                  {shop.reviews.length ? (
                    <div className="grid gap-5 md:grid-cols-[260px_minmax(0,1fr)]">
                      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="flex items-end gap-2">
                          <span className="text-4xl font-bold text-gray-900">
                            {formatRating(shop.averageRating)}
                          </span>
                          <span className="pb-1 text-sm text-gray-500">
                            out of 5
                          </span>
                        </div>
                        <div
                          className="mt-2 flex items-center gap-1"
                          aria-label={`${formatRating(shop.averageRating)} out of 5 stars`}
                        >
                          {Array.from({ length: 5 }, (_, index) => (
                            <Star
                              key={index}
                              size={16}
                              className={
                                index < Math.round(shop.averageRating)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-gray-300'
                              }
                            />
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          Based on {shop.reviewCount} reviews
                        </p>
                        <div className="mt-5 space-y-2">
                          {ratingDistribution.map(({ rating, count }) => (
                            <div
                              key={rating}
                              className="flex items-center gap-2 text-xs text-gray-500"
                            >
                              <span className="w-5">{rating}★</span>
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                                <span
                                  className="block h-full rounded-full bg-amber-400"
                                  style={{
                                    width: `${(count / shop.reviewCount) * 100}%`,
                                  }}
                                />
                              </div>
                              <span className="w-5 text-right">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        {shop.reviews.map((review) => {
                          const reviewerAvatar = getSafeExternalUrl(
                            review.user.avatars[0]?.url,
                          )
                          return (
                            <article
                              key={review.id}
                              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  {reviewerAvatar ? (
                                    <img
                                      src={reviewerAvatar}
                                      alt=""
                                      className="h-10 w-10 rounded-full object-cover"
                                    />
                                  ) : (
                                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                                      {review.user.name?.[0]?.toUpperCase() ??
                                        'U'}
                                    </span>
                                  )}
                                  <div>
                                    <h3 className="text-sm font-semibold text-gray-900">
                                      {review.user.name}
                                    </h3>
                                    <p className="mt-0.5 text-xs text-gray-500">
                                      {formatDate(review.createdAt)}
                                    </p>
                                  </div>
                                </div>
                                <span
                                  className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-gray-800"
                                  aria-label={`${review.rating} out of 5 stars`}
                                >
                                  <Star
                                    size={15}
                                    className="fill-amber-400 text-amber-400"
                                  />
                                  {review.rating.toFixed(1)}
                                </span>
                              </div>
                              {review.reviews && (
                                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-gray-600">
                                  {review.reviews}
                                </p>
                              )}
                            </article>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
                      <MessageCircle
                        size={28}
                        className="mx-auto text-gray-400"
                      />
                      <p className="mt-3 text-sm text-gray-600">
                        This shop hasn&apos;t received any reviews yet.
                      </p>
                    </div>
                  )}
                </section>
              </div>

              <aside className="space-y-5 lg:sticky lg:top-16">
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="text-base font-semibold text-gray-900">
                    Shop details
                  </h2>
                  <dl className="mt-4 space-y-4">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Member since
                      </dt>
                      <dd className="mt-1 flex items-center gap-2 text-sm font-medium text-gray-800">
                        <CalendarDays size={15} className="text-gray-400" />
                        {formatDate(shop.createdAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Website
                      </dt>
                      <dd className="mt-1">
                        {website ? (
                          <a
                            href={website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 break-all text-sm font-medium text-blue-700 hover:underline"
                          >
                            {new URL(website).hostname}
                            <ExternalLink size={13} />
                          </a>
                        ) : (
                          <span className="text-sm text-gray-500">
                            Not provided
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Follow us
                      </dt>
                      <dd className="mt-2 flex flex-wrap gap-2">
                        {socialProfiles.length ? (
                          socialProfiles.map((profile) => (
                            <a
                              key={`${profile.platform}-${profile.url}`}
                              href={profile.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Visit ${shop.name} on ${profile.platform}`}
                              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold capitalize text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                            >
                              <SocialIcon platform={profile.platform} />
                              {profile.platform}
                            </a>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">
                            No social profiles added
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                  <h2 className="text-sm font-semibold text-blue-950">
                    Enjoying this shop?
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-blue-800">
                    Follow {shop.name} to keep this seller close.
                  </p>
                  <button
                    type="button"
                    onClick={followShop}
                    disabled={followMutation.isPending || userLoading}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                  >
                    <Heart size={15} />
                    {isFollowing ? 'Following this shop' : 'Follow this shop'}
                  </button>
                </section>
              </aside>
            </div>
          </div>
        </>
      )}
    </main>
  )
}

export default ShopPage