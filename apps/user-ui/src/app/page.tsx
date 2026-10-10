'use client'

import Hero from '@/shared/modules/hero'
import ProductCard from '@/shared/components/cards/product-card'
import axiosInstance from '@/utils/axiosInstance'
import { useQuery } from '@tanstack/react-query'
import React from 'react'

const gridClasses =
  'grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5'

const SkeletonGrid = () => (
  <div className={gridClasses}>
    {Array.from({ length: 10 }).map((_, index) => (
      <div
        key={index}
        className="h-[250px] bg-gray-300 animate-pulse rounded-xl"
      />
    ))}
  </div>
)

const Page = () => {
  const {
    data: products,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await axiosInstance.get(
        '/product/api/get-all-products?page=1&limit=10'
      )
      return response.data.products
    },
    staleTime: 1000 * 60 * 2,
  })

  const {
    data: latestProducts,
    isLoading: isLatestLoading,
    isError: isLatestError,
  } = useQuery({
    queryKey: ['latest-products'],
    queryFn: async () => {
      const response = await axiosInstance.get(
        '/product/api/get-all-products?page=1&limit=10&type=latest'
      )
      return response.data.products
    },
    staleTime: 1000 * 60 * 2,
  })

  return (
    <div className="bg-[#f5f5f5]">
      <Hero />

      <div className="md:w-[80%] w-[90%] my-10 m-auto">
        {/* Suggested products */}
        <h2 className="mb-5 text-2xl font-semibold text-gray-900">
          Suggested Products
        </h2>

        {isLoading && <SkeletonGrid />}

        {isError && (
          <p className="py-10 text-center text-gray-500">
            Failed to load products. Please try again later.
          </p>
        )}

        {!isLoading && !isError && (
          <>
            {products?.length ? (
              <div className={gridClasses}>
                {products.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-gray-500">
                No products available yet!
              </p>
            )}
          </>
        )}

        {/* Latest products */}
        <h2 className="mb-5 mt-14 text-2xl font-semibold text-gray-900">
          Latest Products
        </h2>

        {isLatestLoading && <SkeletonGrid />}

        {isLatestError && (
          <p className="py-10 text-center text-gray-500">
            Failed to load latest products.
          </p>
        )}

        {!isLatestLoading &&
          !isLatestError &&
          (latestProducts?.length ? (
            <div className={gridClasses}>
              {latestProducts.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-gray-500">
              No latest products available yet!
            </p>
          ))}
      </div>
    </div>
  )
}

export default Page