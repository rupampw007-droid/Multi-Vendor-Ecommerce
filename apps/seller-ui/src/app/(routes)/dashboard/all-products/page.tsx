'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  Pencil,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import axiosInstance from '@/utils/axiosInstance';

interface ProductImage {
  fileId: string;
  file_url: string;
}

interface Product {
  id: string;
  title: string;
  slug: string;
  category: string;
  sale_price: number;
  regular_price: number;
  stock: number;
  ratings?: number;
  status?: 'published' | 'draft';
  images: ProductImage[];
}

type SortKey = 'title' | 'sale_price' | 'stock' | 'category' | 'ratings';

const LOW_STOCK_THRESHOLD = 10;
const USER_UI_URL = process.env.NEXT_PUBLIC_USER_UI_LINK ?? '';

const formatPrice = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const ProductList = () => {
  const queryClient = useQueryClient();

  const [globalFilter, setGlobalFilter] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'title',
    direction: 'asc',
  });
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shop-products'],
    queryFn: async () => {
      const res = await axiosInstance.get('/product/api/get-shop-products');
      return res.data.products as Product[];
    },
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/product/api/delete-product/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-products'] });
      setProductToDelete(null);
    },
  });

  const products = useMemo(() => data ?? [], [data]);

  useEffect(() => {
    setPageIndex(0);
  }, [globalFilter, sortConfig.key, sortConfig.direction]);

  const filteredProducts = useMemo(() => {
    const term = globalFilter.trim().toLowerCase();
    if (!term) return products;

    return products.filter((product) => {
      const fields = [product.title, product.category, product.slug, product.status ?? ''];
      return fields.some((field) => field.toLowerCase().includes(term));
    });
  }, [globalFilter, products]);

  const sortedProducts = useMemo(() => {
    const next = [...filteredProducts];
    const { key, direction } = sortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;

    next.sort((left, right) => {
      const leftValue = left[key] ?? 0;
      const rightValue = right[key] ?? 0;

      if (typeof leftValue === 'string' && typeof rightValue === 'string') {
        return leftValue.localeCompare(rightValue) * multiplier;
      }

      return ((Number(leftValue) || 0) - (Number(rightValue) || 0)) * multiplier;
    });

    return next;
  }, [filteredProducts, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const visibleRows = sortedProducts.slice(
    safePageIndex * pageSize,
    (safePageIndex + 1) * pageSize
  );

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <div className="w-full mx-auto p-4 sm:p-6 lg:p-8 text-white">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl py-2 font-semibold font-Poppins">
            All Products
          </h2>
          <div className="flex flex-wrap items-center">
            <Link href="/dashboard" className="text-[#80deea]">
              Dashboard
            </Link>
            <ChevronRight size={20} className="opacity-[.8]" />
            <span>All Products</span>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:items-center">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search products..."
              className="w-full sm:w-64 pl-9 pr-3 py-2 rounded-md border border-gray-700 bg-transparent outline-none focus:border-[#80deea]"
            />
          </div>
          <Link
            href="/dashboard/create-product"
            className="px-4 py-2 rounded-md bg-[#80deea] text-black font-semibold text-center hover:opacity-90"
          >
            + Add Product
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">Image</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('title')}
                  className="flex items-center gap-1 hover:text-[#80deea]"
                >
                  Product Name
                  {sortConfig.key === 'title' &&
                    (sortConfig.direction === 'asc' ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    ))}
                </button>
              </th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('sale_price')}
                  className="flex items-center gap-1 hover:text-[#80deea]"
                >
                  Price
                  {sortConfig.key === 'sale_price' &&
                    (sortConfig.direction === 'asc' ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    ))}
                </button>
              </th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('stock')}
                  className="flex items-center gap-1 hover:text-[#80deea]"
                >
                  Stock
                  {sortConfig.key === 'stock' &&
                    (sortConfig.direction === 'asc' ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    ))}
                </button>
              </th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('category')}
                  className="flex items-center gap-1 hover:text-[#80deea]"
                >
                  Category
                  {sortConfig.key === 'category' &&
                    (sortConfig.direction === 'asc' ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    ))}
                </button>
              </th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('ratings')}
                  className="flex items-center gap-1 hover:text-[#80deea]"
                >
                  Rating
                  {sortConfig.key === 'ratings' &&
                    (sortConfig.direction === 'asc' ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    ))}
                </button>
              </th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">Actions</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  Loading products...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-red-500">
                  Failed to load products
                </td>
              </tr>
            ) : visibleRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  {globalFilter
                    ? 'No products match your search'
                    : 'No products yet. Create your first product!'}
                </td>
              </tr>
            ) : (
              visibleRows.map((product) => (
                <tr
                  key={product.id}
                  className="border-t border-gray-800 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3 align-middle">
                    <div className="relative w-14 h-14 rounded-md overflow-hidden bg-white/5">
                      {product.images?.[0]?.file_url ? (
                        <Image
                          src={product.images[0].file_url}
                          alt={product.title}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-500">
                          No image
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="max-w-[260px]">
                      <Link
                        href={`${USER_UI_URL}/product/${product.slug}`}
                        target="_blank"
                        className="font-medium hover:text-[#80deea] line-clamp-2"
                        title={product.title}
                      >
                        {product.title}
                      </Link>
                      {product.status === 'draft' && (
                        <span className="mt-1 inline-block text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-600">
                          Draft
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex flex-col">
                      <span className="font-semibold">{formatPrice(product.sale_price)}</span>
                      {product.regular_price > product.sale_price && (
                        <span className="text-xs text-gray-500 line-through">
                          {formatPrice(product.regular_price)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <span
                      className={`text-sm ${
                        product.stock === 0
                          ? 'text-red-400'
                          : product.stock < LOW_STOCK_THRESHOLD
                          ? 'text-yellow-400'
                          : 'text-green-400'
                      }`}
                    >
                      {product.stock === 0 ? 'Out of stock' : `${product.stock} left`}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-middle text-sm text-gray-300">
                    {product.category}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-1">
                      <Star size={16} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-sm">{(product.ratings ?? 0).toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`${USER_UI_URL}/product/${product.slug}`}
                        target="_blank"
                        title="View"
                        aria-label="View product"
                        className="p-2 rounded-md hover:bg-white/10 text-gray-300 hover:text-white"
                      >
                        <Eye size={18} />
                      </Link>
                      <Link
                        href={`/dashboard/edit-product/${product.id}`}
                        title="Edit"
                        aria-label="Edit product"
                        className="p-2 rounded-md hover:bg-white/10 text-blue-400"
                      >
                        <Pencil size={18} />
                      </Link>
                      <Link
                        href={`/dashboard/product-analytics/${product.id}`}
                        title="Analytics"
                        aria-label="Product analytics"
                        className="p-2 rounded-md hover:bg-white/10 text-[#80deea]"
                      >
                        <BarChart3 size={18} />
                      </Link>
                      <button
                        type="button"
                        title="Delete"
                        aria-label="Delete product"
                        onClick={() => setProductToDelete(product)}
                        className="p-2 rounded-md hover:bg-white/10 text-red-400"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {visibleRows.length > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <span className="text-gray-400">
            Page {safePageIndex + 1} of {totalPages} · {sortedProducts.length} products
          </span>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPageIndex(0);
              }}
              className="border border-gray-700 bg-transparent p-2 rounded-md outline-none"
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size} className="bg-black">
                  {size} / page
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setPageIndex((current) => Math.max(current - 1, 0))}
              disabled={safePageIndex === 0}
              className="px-4 py-2 rounded-md border border-gray-600 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setPageIndex((current) => Math.min(current + 1, totalPages - 1))
              }
              disabled={safePageIndex >= totalPages - 1}
              className="px-4 py-2 rounded-md border border-gray-600 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {productToDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-[420px] max-w-[90vw]">
            <div className="flex justify-between items-center pb-3">
              <h3 className="text-lg font-semibold">Delete Product</h3>
              <X
                size={20}
                className="cursor-pointer"
                onClick={() => setProductToDelete(null)}
              />
            </div>
            <p className="text-sm text-gray-300">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-white">{productToDelete.title}</span>?
            </p>
            {deleteMutation.isError && (
              <p className="text-red-400 text-xs mt-2">
                Could not delete the product. Please try again.
              </p>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-md border border-gray-600 text-sm hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(productToDelete.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;