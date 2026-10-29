'use client';

import axiosInstance from '@/utils/axiosInstance';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, LoaderCircle, PackageSearch, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type FulfillmentStatus =
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED';

interface SellerOrder {
  id: string;
  createdAt: string;
  totalAmount: number;
  currency: string;
  items: Array<{
    id?: string;
    title?: string;
    quantity?: number;
    sale_price?: number;
  }>;
  user: { name: string; email: string };
  fulfillment: {
    status: FulfillmentStatus;
    totalAmount?: number | null;
  } | null;
}

const statusLabels: Record<FulfillmentStatus, string> = {
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
};

const statusStyles: Record<FulfillmentStatus, string> = {
  PAID: 'bg-blue-500/10 text-blue-300 ring-blue-400/20',
  PROCESSING: 'bg-amber-500/10 text-amber-300 ring-amber-400/20',
  SHIPPED: 'bg-violet-500/10 text-violet-300 ring-violet-400/20',
  OUT_FOR_DELIVERY: 'bg-cyan-500/10 text-cyan-300 ring-cyan-400/20',
  DELIVERED: 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20',
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: async () => {
      const response = await axiosInstance.get('/order/api/get-seller-orders');
      return response.data.orders as SellerOrder[];
    },
  });

  const orders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((order) => {
      const status = order.fulfillment?.status ?? 'PAID';
      const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
      const matchesSearch =
        !term ||
        order.id.toLowerCase().includes(term) ||
        order.user.name.toLowerCase().includes(term) ||
        order.user.email.toLowerCase().includes(term) ||
        order.items.some((item) => item.title?.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [data, search, statusFilter]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-400">
            Seller workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Orders</h1>
          <p className="mt-2 text-sm text-slate-400">
            Review purchases, prepare shipments, and keep customers updated.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
              <input
                aria-label="Search orders"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order, customer, or item"
                value={search}
              />
            </label>
            <select
              aria-label="Filter by fulfillment status"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500"
              onChange={(event) => setStatusFilter(event.target.value)}
              value={statusFilter}
            >
              <option value="ALL">All statuses</option>
              {Object.entries(statusLabels).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
              <LoaderCircle className="animate-spin" size={20} />
              Loading orders…
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center py-12 text-center">
              <AlertCircle className="mb-3 text-rose-400" size={28} />
              <p className="font-medium">Orders could not be loaded.</p>
              <button
                className="mt-4 rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                onClick={() => void refetch()}
                type="button"
              >
                Try again
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <PackageSearch className="mb-4 text-slate-500" size={34} />
              <p className="font-medium">
                {data?.length ? 'No orders match your filters' : 'No orders yet'}
              </p>
              <p className="mt-2 max-w-md text-sm text-slate-400">
                New paid orders for your shop will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const status = order.fulfillment?.status ?? 'PAID';
                const itemSummary = order.items
                  .map((item) => `${item.title ?? 'Item'} × ${item.quantity ?? 1}`)
                  .join(', ');
                return (
                  <article
                    className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                    key={order.id}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-medium">
                          Order #{order.id.slice(-8).toUpperCase()}
                        </h2>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[status]}`}
                        >
                          {statusLabels[status]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">
                        {order.user.name} · {formatDate(order.createdAt)}
                      </p>
                      <p className="mt-2 truncate text-sm text-slate-300">
                        {itemSummary}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-5 sm:justify-end">
                      <span className="font-semibold">
                        {new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: order.currency.toUpperCase(),
                        }).format(
                          order.fulfillment?.totalAmount ??
                            order.items.reduce(
                              (total, item) =>
                                total +
                                (item.sale_price ?? 0) * (item.quantity ?? 1),
                              0,
                            ),
                        )}
                      </span>
                      <Link
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium hover:bg-blue-500"
                        href={`/order/${order.id}`}
                      >
                        Manage <ArrowRight size={16} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
