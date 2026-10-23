'use client'

import ProductCard from '@/shared/components/cards/product-card'
import axiosInstance from '@/utils/axiosInstance'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import React, { FormEvent, useState } from 'react'

const PAGE_SIZE = 12
const DEFAULT_PRICE_RANGE: [number, number] = [0, 10000]

interface Product {
  id: string
  [key: string]: unknown
}

interface ProductsResponse {
  products: Product[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const ProductSkeleton = () => (
  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
    <div className="aspect-square animate-pulse bg-gray-200" />
    <div className="space-y-3 p-4">
      <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
      <div className="h-9 animate-pulse rounded-lg bg-gray-200" />
    </div>
  </div>
)

const ProductsPage = () => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [priceInputs, setPriceInputs] = useState<[string, string]>([
    String(DEFAULT_PRICE_RANGE[0]),
    String(DEFAULT_PRICE_RANGE[1]),
  ])
  const [priceRange, setPriceRange] =
    useState<[number, number]>(DEFAULT_PRICE_RANGE)
  const [page, setPage] = useState(1)
  const [priceError, setPriceError] = useState('')

  const {
    data: categories = [],
    isError: categoriesError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const response = await axiosInstance.get('/product/api/get-categories')
      const values = response.data.categories
      return Array.isArray(values)
        ? values.filter((value: unknown): value is string => typeof value === 'string')
        : []
    },
    staleTime: 1000 * 60 * 10,
  })

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['filtered-products', selectedCategories, priceRange, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        priceRange: priceRange.join(','),
      })
      if (selectedCategories.length > 0) {
        params.set('categories', selectedCategories.join(','))
      }
      const response = await axiosInstance.get<ProductsResponse>(
        `/product/api/get-filtered-products?${params.toString()}`
      )
      return response.data
    },
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 2,
  })

  const toggleCategory = (category: string) => {
    setPage(1)
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    )
  }

  const applyPriceRange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const minimum = Number(priceInputs[0])
    const maximum = Number(priceInputs[1])

    if (
      !Number.isFinite(minimum) ||
      !Number.isFinite(maximum) ||
      minimum < 0 ||
      maximum < minimum
    ) {
      setPriceError('Enter a valid minimum and maximum price.')
      return
    }

    setPriceError('')
    setPage(1)
    setPriceRange([minimum, maximum])
  }

  const resetFilters = () => {
    setSelectedCategories([])
    setPriceInputs([
      String(DEFAULT_PRICE_RANGE[0]),
      String(DEFAULT_PRICE_RANGE[1]),
    ])
    setPriceRange(DEFAULT_PRICE_RANGE)
    setPriceError('')
    setPage(1)
  }

  const pagination = data?.pagination
  const totalPages = pagination?.totalPages ?? 0

  return (
    <main className="min-h-screen bg-[#f7f8fa]">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">
            Find your next favorite
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Shop all products
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-600 sm:text-base">
            Explore the latest finds from our independent sellers.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8">
        <aside className="h-fit rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <SlidersHorizontal size={18} />
              Filters
            </h2>
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Clear all
            </button>
          </div>

          <section className="border-t border-gray-100 py-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Categories
            </h3>
            {categoriesError ? (
              <div className="text-sm text-gray-600">
                <p>Could not load categories.</p>
                <button
                  type="button"
                  onClick={() => void refetchCategories()}
                  className="mt-2 font-medium text-blue-600 hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : categories.length === 0 ? (
              <p className="text-sm text-gray-500">No categories available.</p>
            ) : (
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {categories.map((category) => (
                  <label
                    key={category}
                    className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={() => toggleCategory(category)}
                      className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                    />
                    <span>{category}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <form
            onSubmit={applyPriceRange}
            className="border-t border-gray-100 py-5"
          >
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Price range
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-gray-500">
                Min (₹)
                <input
                  type="number"
                  min="0"
                  value={priceInputs[0]}
                  onChange={(event) =>
                    setPriceInputs((current) => [
                      event.target.value,
                      current[1],
                    ])
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="text-xs text-gray-500">
                Max (₹)
                <input
                  type="number"
                  min="0"
                  value={priceInputs[1]}
                  onChange={(event) =>
                    setPriceInputs((current) => [
                      current[0],
                      event.target.value,
                    ])
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
            {priceError && (
              <p role="alert" className="mt-2 text-xs text-red-600">
                {priceError}
              </p>
            )}
            <button
              type="submit"
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 transition hover:border-blue-600 hover:text-blue-600"
            >
              Apply price
            </button>
          </form>
        </aside>

        <section aria-label="Product results">
          <div className="mb-5 flex min-h-10 flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600" aria-live="polite">
              {pagination
                ? `${pagination.total} ${
                    pagination.total === 1 ? 'product' : 'products'
                  } found`
                : 'Browse our products'}
            </p>
            {isFetching && !isLoading && (
              <span className="text-xs text-gray-500">Updating results…</span>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                <ProductSkeleton key={index} />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-xl border border-red-100 bg-white px-6 py-14 text-center">
              <h2 className="font-semibold text-gray-900">
                Products could not be loaded
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Please check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Try again
              </button>
            </div>
          ) : data?.products.length ? (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {data.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav
                  aria-label="Product pages"
                  className="mt-8 flex items-center justify-center gap-4"
                >
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
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
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
              <h2 className="font-semibold text-gray-900">
                No products match these filters
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Try another category or adjust your price range.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default ProductsPage
