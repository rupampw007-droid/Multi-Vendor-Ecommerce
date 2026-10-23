'use client'

import ProductCard from '@/shared/components/cards/product-card'
import axiosInstance from '@/utils/axiosInstance'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Sparkles,
  Tag,
} from 'lucide-react'
import Link from 'next/link'

const EVENT_PAGE_SIZE = 12
const PRODUCT_PAGE_SIZE = 100

interface OfferProduct {
  id: string
  sale_price: number
  regular_price: number
  starting_date?: string | null
  ending_date?: string | null
  [key: string]: unknown
}

interface EventOffer {
  id: string
  title: string
  category: string
  price: number
  starting_date: string
  ending_date: string
}

interface Pagination {
  total: number
  page: number
  totalPages: number
}

interface EventsResponse {
  events: EventOffer[]
  pagination: Pagination
}

interface ProductsResponse {
  products: OfferProduct[]
}

const formatINR = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))

const OfferSkeleton = () => (
  <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6">
    <div className="h-4 w-1/3 rounded bg-gray-200" />
    <div className="mt-5 h-6 w-2/3 rounded bg-gray-200" />
    <div className="mt-4 h-4 w-1/2 rounded bg-gray-200" />
    <div className="mt-8 h-10 w-1/3 rounded bg-gray-200" />
  </div>
)

const EventCard = ({ event }: { event: EventOffer }) => {
  const startsAt = new Date(event.starting_date)
  const isUpcoming = startsAt.getTime() > Date.now()

  return (
    <article className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
          <Tag size={13} />
          {event.category}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            isUpcoming
              ? 'bg-blue-50 text-blue-700'
              : 'bg-green-50 text-green-700'
          }`}
        >
          {isUpcoming ? 'Coming soon' : 'Live now'}
        </span>
      </div>

      <h3 className="mt-5 text-lg font-semibold leading-snug text-gray-900">
        {event.title}
      </h3>

      <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
        <CalendarDays size={16} className="shrink-0 text-gray-400" />
        <span>
          {formatDate(event.starting_date)} – {formatDate(event.ending_date)}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
        <Clock3 size={16} className="shrink-0 text-gray-400" />
        <span>{isUpcoming ? 'Starts' : 'Event price'}</span>
        <span className="font-semibold text-gray-900">
          {formatINR(event.price)}
        </span>
      </div>

      <Link
        href="/products"
        className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-blue-700 hover:text-blue-800"
      >
        Explore products
        <ArrowRight size={16} />
      </Link>
    </article>
  )
}

const OffersPage = () => {
  const [eventPage, setEventPage] = useState(1)

  const {
    data: products = [],
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['offer-products'],
    queryFn: async () => {
      const response = await axiosInstance.get<ProductsResponse>(
        `/product/api/get-all-products?page=1&limit=${PRODUCT_PAGE_SIZE}`
      )
      return response.data.products.filter(
        (product) =>
          Number.isFinite(product.sale_price) &&
          Number.isFinite(product.regular_price) &&
          product.regular_price > product.sale_price
      )
    },
    staleTime: 1000 * 60 * 2,
  })

  const {
    data: eventData,
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ['offer-events', eventPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(eventPage),
        limit: String(EVENT_PAGE_SIZE),
        startDate: new Date().toISOString(),
      })
      const response = await axiosInstance.get<EventsResponse>(
        `/product/api/get-filtered-events?${params.toString()}`
      )
      return response.data
    },
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 2,
  })

  const events = eventData?.events ?? []
  const totalEventPages = eventData?.pagination?.totalPages ?? 0

  return (
    <main className="min-h-screen bg-[#f7f8fa]">
      <section className="overflow-hidden bg-gradient-to-br from-[#101a36] via-[#193a72] to-[#326de0] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-blue-100">
              <Sparkles size={16} />
              Handpicked for you
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-5xl">
              Offers worth opening
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
              Find current price drops and discover marketplace events from our
              independent sellers.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-50"
          >
            Browse all products
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <section aria-labelledby="product-offers-heading">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">
                Real price drops
              </p>
              <h2
                id="product-offers-heading"
                className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
              >
                Deals on products
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Products currently listed below their regular price.
              </p>
            </div>
            {!productsLoading && !productsError && (
              <span className="text-sm text-gray-500">
                {products.length} {products.length === 1 ? 'deal' : 'deals'}
              </span>
            )}
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="h-[340px] animate-pulse rounded-xl bg-gray-200"
                />
              ))}
            </div>
          ) : productsError ? (
            <div className="rounded-2xl border border-red-100 bg-white px-6 py-12 text-center">
              <h3 className="font-semibold text-gray-900">
                Product offers could not be loaded
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Please check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => void refetchProducts()}
                className="mt-5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Try again
              </button>
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isEvent={Boolean(product.ending_date)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
              <p className="font-semibold text-gray-900">
                No discounted products right now
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Check back soon for new deals from our sellers.
              </p>
              <Link
                href="/products"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Explore products
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </section>

        <section aria-labelledby="event-offers-heading">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-violet-700">
              Coming up and happening now
            </p>
            <h2
              id="event-offers-heading"
              className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
            >
              Marketplace events
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Browse event prices and dates provided by our sellers.
            </p>
          </div>

          {eventsLoading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <OfferSkeleton key={index} />
              ))}
            </div>
          ) : eventsError ? (
            <div className="rounded-2xl border border-red-100 bg-white px-6 py-12 text-center">
              <h3 className="font-semibold text-gray-900">
                Marketplace events could not be loaded
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Please check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => void refetchEvents()}
                className="mt-5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Try again
              </button>
            </div>
          ) : events.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
              {totalEventPages > 1 && (
                <nav
                  aria-label="Event pages"
                  className="mt-8 flex items-center justify-center gap-4"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setEventPage((current) => Math.max(1, current - 1))
                    }
                    disabled={eventPage <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {eventData?.pagination?.page ?? eventPage} of{' '}
                    {totalEventPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEventPage((current) =>
                        Math.min(totalEventPages, current + 1)
                      )
                    }
                    disabled={eventPage >= totalEventPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </nav>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
              <p className="font-semibold text-gray-900">
                No active or upcoming events
              </p>
              <p className="mt-2 text-sm text-gray-600">
                New seller events will appear here when they are announced.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default OffersPage