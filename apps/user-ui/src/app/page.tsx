'use client'

import Hero from '@/shared/modules/hero'
import ProductCard from '@/shared/components/cards/product-card'
import ShopCard, {
  type ShopCardData,
} from '@/shared/components/cards/shop-card'
import axiosInstance from '@/utils/axiosInstance'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, SlidersHorizontal, Store } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const PRODUCT_LIMIT = 30
const PRICE_FILTERS = [
  { label: 'Any price', value: 'all' },
  { label: 'Under ₹1,000', value: 'under-1000' },
  { label: '₹1,000–₹5,000', value: '1000-5000' },
  { label: '₹5,000+', value: 'over-5000' },
] as const

type PriceFilter = (typeof PRICE_FILTERS)[number]['value']

interface Product {
  id: string
  category: string
  sale_price: number
  [key: string]: unknown
}

interface ProductsResponse {
  products: Product[]
}

interface TopShopsResponse {
  success: boolean
  topShops: ShopCardData[]
}

const filterProducts = (
  products: Product[],
  category: string,
  priceFilter: PriceFilter
) =>
  products.filter((product) => {
    if (category && product.category !== category) return false

    switch (priceFilter) {
      case 'under-1000':
        return product.sale_price < 1000
      case '1000-5000':
        return product.sale_price >= 1000 && product.sale_price <= 5000
      case 'over-5000':
        return product.sale_price > 5000
      default:
        return true
    }
  })

const CategoryFilters = ({
  categories,
  selected,
  onSelect,
}: {
  categories: string[]
  selected: string
  onSelect: (category: string) => void
}) => (
  <div
    aria-label="Filter by category"
    className="flex max-w-full gap-2 overflow-x-auto pb-1"
  >
    <button
      type="button"
      onClick={() => onSelect('')}
      aria-pressed={!selected}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
        !selected
          ? 'bg-gray-900 text-white'
          : 'border border-gray-300 bg-white text-gray-700 hover:border-gray-500'
      }`}
    >
      All
    </button>
    {categories.map((category) => (
      <button
        type="button"
        key={category}
        onClick={() => onSelect(category)}
        aria-pressed={selected === category}
        className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
          selected === category
            ? 'bg-blue-700 text-white'
            : 'border border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-700'
        }`}
      >
        {category}
      </button>
    ))}
  </div>
)

const ProductSkeletonGrid = () => (
  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: 4 }, (_, index) => (
      <div
        key={index}
        className="overflow-hidden rounded-xl border border-gray-200 bg-white"
      >
        <div className="aspect-square animate-pulse bg-gray-200" />
        <div className="space-y-3 p-4">
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
          <div className="h-9 animate-pulse rounded-lg bg-gray-200" />
        </div>
      </div>
    ))}
  </div>
)

const ShopSkeletonGrid = () => (
  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 3 }, (_, index) => (
      <div
        key={index}
        className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
      >
        <div className="h-36 animate-pulse bg-gray-200" />
        <div className="space-y-3 p-5">
          <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200" />
          <div className="h-5 w-1/3 animate-pulse rounded-full bg-gray-200" />
          <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    ))}
  </div>
)

const HomePage = () => {
  const [suggestedCategory, setSuggestedCategory] = useState('')
  const [latestCategory, setLatestCategory] = useState('')
  const [shopCategory, setShopCategory] = useState('')
  const [suggestedPrice, setSuggestedPrice] = useState<PriceFilter>('all')
  const [latestPrice, setLatestPrice] = useState<PriceFilter>('all')

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
        ? values.filter(
            (value: unknown): value is string => typeof value === 'string'
          )
        : []
    },
    staleTime: 1000 * 60 * 10,
  })

  const {
    data: products = [],
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await axiosInstance.get<ProductsResponse>(
        `/product/api/get-all-products?page=1&limit=${PRODUCT_LIMIT}`
      )
      return response.data.products
    },
    staleTime: 1000 * 60 * 2,
  })

  const {
    data: latestProducts = [],
    isLoading: isLatestLoading,
    isError: isLatestError,
    refetch: refetchLatest,
  } = useQuery({
    queryKey: ['latest-products'],
    queryFn: async () => {
      const response = await axiosInstance.get<ProductsResponse>(
        `/product/api/get-all-products?page=1&limit=${PRODUCT_LIMIT}&type=latest`
      )
      return response.data.products
    },
    staleTime: 1000 * 60 * 2,
  })

  const {
    data: topShops = [],
    isLoading: isShopsLoading,
    isError: isShopsError,
    refetch: refetchShops,
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

  const filteredProducts = filterProducts(
    products,
    suggestedCategory,
    suggestedPrice
  )
  const filteredLatestProducts = filterProducts(
    latestProducts,
    latestCategory,
    latestPrice
  )
  const filteredShops = topShops.filter(
    (shop) => !shopCategory || shop.category === shopCategory
  )
  const shopCategories = Array.from(
    new Set(topShops.map((shop) => shop.category).filter(Boolean))
  )

  const renderProductSection = ({
    title,
    description,
    products: sectionProducts,
    loading,
    error,
    refetch,
    category,
    setCategory,
    price,
    setPrice,
    emptyMessage,
  }: {
    title: string
    description: string
    products: Product[]
    loading: boolean
    error: boolean
    refetch: () => Promise<unknown>
    category: string
    setCategory: (value: string) => void
    price: PriceFilter
    setPrice: (value: PriceFilter) => void
    emptyMessage: string
  }) => (
    <section className="mt-14" aria-label={title}>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>
        <Link
          href="/products"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          View all products
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="mb-5 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <SlidersHorizontal size={16} />
          Filter products
        </div>
        {categoriesError ? (
          <div className="text-sm text-gray-600">
            <span>Could not load categories.</span>
            <button
              type="button"
              onClick={() => void refetchCategories()}
              className="ml-2 font-medium text-blue-700 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <CategoryFilters
            categories={categories}
            selected={category}
            onSelect={setCategory}
          />
        )}
        <label className="flex w-fit items-center gap-2 text-sm text-gray-600">
          <span>Price</span>
          <select
            value={price}
            onChange={(event) => setPrice(event.target.value as PriceFilter)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {PRICE_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <ProductSkeletonGrid />
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-white px-6 py-10 text-center">
          <p className="text-gray-700">Products could not be loaded.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 font-medium text-blue-700 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : sectionProducts.length > 0 ? (
        <>
          <p className="mb-3 text-sm text-gray-500" aria-live="polite">
            Showing {Math.min(sectionProducts.length, 12)} of{' '}
            {sectionProducts.length}{' '}
            {sectionProducts.length === 1 ? 'product' : 'products'}
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {sectionProducts.slice(0, 12).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <p className="font-medium text-gray-800">{emptyMessage}</p>
          <p className="mt-2 text-sm text-gray-500">
            Try a different category or price range.
          </p>
        </div>
      )}
    </section>
  )

  return (
    <main className="bg-[#f5f5f5]">
      <Hero />

      <div className="mx-auto my-10 w-[90%] max-w-7xl md:w-[80%]">
        {renderProductSection({
          title: 'Suggested Products',
          description: 'Popular picks from across the marketplace.',
          products: filteredProducts,
          loading: productsLoading,
          error: productsError,
          refetch: refetchProducts,
          category: suggestedCategory,
          setCategory: setSuggestedCategory,
          price: suggestedPrice,
          setPrice: setSuggestedPrice,
          emptyMessage: 'No suggested products match these filters.',
        })}

        {renderProductSection({
          title: 'Latest Products',
          description: 'Freshly added products from our sellers.',
          products: filteredLatestProducts,
          loading: isLatestLoading,
          error: isLatestError,
          refetch: refetchLatest,
          category: latestCategory,
          setCategory: setLatestCategory,
          price: latestPrice,
          setPrice: setLatestPrice,
          emptyMessage: 'No latest products match these filters.',
        })}

        <section className="mt-14" aria-labelledby="top-shops-heading">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="top-shops-heading"
                className="text-2xl font-semibold text-gray-900"
              >
                Top Shops
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Meet some of the highest-rated sellers in our marketplace.
              </p>
            </div>
            <Link
              href="/shops"
              className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800"
            >
              View all shops
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <SlidersHorizontal size={16} />
              Filter shops by category
            </div>
            {shopCategories.length > 0 ? (
              <CategoryFilters
                categories={shopCategories}
                selected={shopCategory}
                onSelect={setShopCategory}
              />
            ) : (
              <p className="text-sm text-gray-500">
                Shop categories will be available when shops load.
              </p>
            )}
          </div>

          {isShopsLoading ? (
            <ShopSkeletonGrid />
          ) : isShopsError ? (
            <div className="rounded-xl border border-red-100 bg-white px-6 py-10 text-center">
              <p className="text-gray-700">Top shops could not be loaded.</p>
              <button
                type="button"
                onClick={() => void refetchShops()}
                className="mt-3 font-medium text-blue-700 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filteredShops.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredShops.slice(0, 6).map((shop) => (
                <ShopCard key={shop.id} shop={shop} featured />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
              <Store size={28} className="mx-auto text-gray-400" />
              <p className="mt-3 font-medium text-gray-800">
                No top shops match this category.
              </p>
              <button
                type="button"
                onClick={() => setShopCategory('')}
                className="mt-3 font-medium text-blue-700 hover:underline"
              >
                Clear shop filter
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default HomePage
