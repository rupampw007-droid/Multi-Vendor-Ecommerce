'use client';

import axiosInstance from '@/utils/axiosInstance';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock3,
  LoaderCircle,
  PackageCheck,
  Save,
  Truck,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type FulfillmentStatus =
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED';

interface OrderItem {
  id?: string;
  title?: string;
  quantity?: number;
  sale_price?: number;
  selectedOptions?: Record<string, string>;
}

interface FulfillmentEvent {
  status?: FulfillmentStatus;
  updatedAt?: string;
  updatedBy?: string;
}

interface Fulfillment {
  status: FulfillmentStatus;
  subtotal: number | null;
  totalAmount: number | null;
  carrier: string | null;
  trackingNumber: string | null;
  estimatedDelivery: string | null;
  sellerNotes: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  statusHistory: FulfillmentEvent[];
}

interface SellerOrder {
  id: string;
  paymentIntentId: string;
  createdAt: string;
  currency: string;
  subtotal: number;
  totalAmount: number;
  items: OrderItem[];
  shippingAddress: Record<string, unknown> | null;
  user: { name: string; email: string; avatars: Array<{ url: string }> };
  fulfillment: Fulfillment | null;
}

type OrderPayload = Omit<SellerOrder, 'shippingAddress'> & {
  shippingAddress: Record<string, unknown> | null;
};

const statusLabels: Record<FulfillmentStatus, string> = {
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
};

const statusStyles: Record<FulfillmentStatus, string> = {
  PAID: 'border-blue-400/20 bg-blue-500/10 text-blue-300',
  PROCESSING: 'border-amber-400/20 bg-amber-500/10 text-amber-300',
  SHIPPED: 'border-violet-400/20 bg-violet-500/10 text-violet-300',
  OUT_FOR_DELIVERY: 'border-cyan-400/20 bg-cyan-500/10 text-cyan-300',
  DELIVERED: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
};

const nextStatuses: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  PAID: ['PROCESSING'],
  PROCESSING: ['SHIPPED'],
  SHIPPED: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(value);

const toDateTimeInput = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );
  return localDate.toISOString().slice(0, 16);
};

const errorMessage = (error: unknown) =>
  axios.isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message ?? 'Unable to save shipment updates.'
    : 'Unable to save shipment updates.';

export default function SellerOrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<FulfillmentStatus>('PAID');
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [sellerNotes, setSellerNotes] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['seller-order', orderId],
    queryFn: async () => {
      const response = await axiosInstance.get(
        `/order/api/get-seller-orders/${encodeURIComponent(orderId)}`,
      );
      return response.data.order as OrderPayload;
    },
    enabled: Boolean(orderId),
  });

  const currentStatus = order?.fulfillment?.status ?? 'PAID';
  const availableStatuses = useMemo(
    () => [currentStatus, ...nextStatuses[currentStatus]],
    [currentStatus],
  );

  useEffect(() => {
    if (!order) return;
    const fulfillment = order.fulfillment;
    setStatus(fulfillment?.status ?? 'PAID');
    setCarrier(fulfillment?.carrier ?? '');
    setTrackingNumber(fulfillment?.trackingNumber ?? '');
    setEstimatedDelivery(toDateTimeInput(fulfillment?.estimatedDelivery));
    setSellerNotes(fulfillment?.sellerNotes ?? '');
  }, [order]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.patch(
        `/order/api/get-seller-orders/${encodeURIComponent(orderId)}/fulfillment`,
        {
          status,
          carrier: carrier.trim() || null,
          trackingNumber: trackingNumber.trim() || null,
          estimatedDelivery: estimatedDelivery
            ? new Date(estimatedDelivery).toISOString()
            : null,
          sellerNotes: sellerNotes.trim() || null,
        },
      );
    },
    onSuccess: async () => {
      setSaveError('');
      setSaveSuccess(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['seller-order', orderId] }),
        queryClient.invalidateQueries({ queryKey: ['seller-orders'] }),
      ]);
    },
    onError: (error) => {
      setSaveSuccess(false);
      setSaveError(errorMessage(error));
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveSuccess(false);
    setSaveError('');
    updateMutation.mutate();
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <LoaderCircle className="mr-3 animate-spin" size={22} />
        Loading order…
      </main>
    );
  }

  if (isError || !order) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-rose-400" size={30} />
          <h1 className="text-xl font-semibold">Order could not be loaded</h1>
          <p className="mt-2 text-sm text-slate-400">
            The order may not belong to your shop, or it may no longer be
            available.
          </p>
          <button
            className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
            onClick={() => void refetch()}
            type="button"
          >
            Try again
          </button>
          <Link
            className="mt-4 block text-sm text-slate-300 hover:text-white"
            href="/dashboard/orders"
          >
            Back to orders
          </Link>
        </div>
      </main>
    );
  }

  const fulfillment = order.fulfillment;
  const history = fulfillment?.statusHistory ?? [];
  const address = order.shippingAddress;
  const addressLines = [
    address?.name,
    address?.street,
    [
      address?.city,
      address?.state,
      address?.zip,
    ]
      .filter((value): value is string => typeof value === 'string' && Boolean(value))
      .join(', '),
    address?.country,
    address?.phone,
  ].filter((value): value is string => typeof value === 'string' && Boolean(value));

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <Link
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          href="/dashboard/orders"
        >
          <ArrowLeft size={17} /> Back to orders
        </Link>

        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-400">
              Order fulfillment
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              Order #{order.id.slice(-8).toUpperCase()}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Placed {formatDate(order.createdAt)}
            </p>
          </div>
          <span
            className={`w-fit rounded-full border px-3 py-1.5 text-sm font-medium ${statusStyles[currentStatus]}`}
          >
            {statusLabels[currentStatus]}
          </span>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <PackageCheck className="text-blue-400" size={21} />
                <h2 className="text-lg font-semibold">Items in your shop</h2>
              </div>
              {order.items.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No item details are available for this order.
                </p>
              ) : (
                <div className="divide-y divide-slate-800">
                  {order.items.map((item, index) => (
                    <div
                      className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                      key={`${item.id ?? item.title ?? 'item'}-${index}`}
                    >
                      <div>
                        <p className="font-medium">{item.title ?? 'Product'}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          Quantity: {item.quantity ?? 1}
                        </p>
                        {item.selectedOptions &&
                          Object.keys(item.selectedOptions).length > 0 && (
                            <p className="mt-1 text-xs text-slate-500">
                              {Object.entries(item.selectedOptions)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(' · ')}
                            </p>
                          )}
                      </div>
                      <p className="shrink-0 font-medium">
                        {formatCurrency(
                          (item.sale_price ?? 0) * (item.quantity ?? 1),
                          order.currency,
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-5 border-t border-slate-800 pt-4">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Order subtotal</span>
                  <span>
                    {formatCurrency(
                      fulfillment?.subtotal ??
                        order.items.reduce(
                          (total, item) =>
                            total +
                            (item.sale_price ?? 0) * (item.quantity ?? 1),
                          0,
                        ),
                      order.currency,
                    )}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-base font-semibold">
                  <span>Your shop total</span>
                  <span>
                    {formatCurrency(
                      fulfillment?.totalAmount ??
                        order.items.reduce(
                          (total, item) =>
                            total +
                            (item.sale_price ?? 0) * (item.quantity ?? 1),
                          0,
                        ),
                      order.currency,
                    )}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Shop total includes the discount allocated to this shop.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <Truck className="text-blue-400" size={21} />
                <h2 className="text-lg font-semibold">Shipment updates</h2>
              </div>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label
                    className="mb-2 block text-sm font-medium text-slate-300"
                    htmlFor="fulfillment-status"
                  >
                    Fulfillment status
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    id="fulfillment-status"
                    onChange={(event) =>
                      setStatus(event.target.value as FulfillmentStatus)
                    }
                    value={status}
                  >
                    {availableStatuses.map((value) => (
                      <option key={value} value={value}>
                        {statusLabels[value]}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    Statuses move forward in order. A tracking number is
                    required before dispatch.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium text-slate-300"
                      htmlFor="carrier"
                    >
                      Delivery carrier
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                      id="carrier"
                      maxLength={100}
                      onChange={(event) => setCarrier(event.target.value)}
                      placeholder="e.g. Delhivery"
                      value={carrier}
                    />
                  </div>
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium text-slate-300"
                      htmlFor="tracking-number"
                    >
                      Tracking number
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                      id="tracking-number"
                      maxLength={200}
                      onChange={(event) => setTrackingNumber(event.target.value)}
                      placeholder="Add tracking reference"
                      required={
                        status === 'SHIPPED' ||
                        status === 'OUT_FOR_DELIVERY' ||
                        status === 'DELIVERED'
                      }
                      value={trackingNumber}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="mb-2 block text-sm font-medium text-slate-300"
                    htmlFor="estimated-delivery"
                  >
                    Estimated delivery
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    id="estimated-delivery"
                    onChange={(event) => setEstimatedDelivery(event.target.value)}
                    type="datetime-local"
                    value={estimatedDelivery}
                  />
                </div>

                <div>
                  <label
                    className="mb-2 block text-sm font-medium text-slate-300"
                    htmlFor="seller-notes"
                  >
                    Internal seller notes
                  </label>
                  <textarea
                    className="min-h-24 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    id="seller-notes"
                    maxLength={2000}
                    onChange={(event) => setSellerNotes(event.target.value)}
                    placeholder="Notes for your fulfillment team"
                    value={sellerNotes}
                  />
                </div>

                {saveError && (
                  <p
                    className="flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-300"
                    role="alert"
                  >
                    <AlertCircle className="mt-0.5 shrink-0" size={17} />
                    {saveError}
                  </p>
                )}
                {saveSuccess && (
                  <p
                    className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-300"
                    role="status"
                  >
                    <Check size={17} /> Shipment information saved.
                  </p>
                )}

                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={updateMutation.isPending}
                  type="submit"
                >
                  {updateMutation.isPending ? (
                    <LoaderCircle className="animate-spin" size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  {updateMutation.isPending ? 'Saving…' : 'Save shipment update'}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <Clock3 className="text-blue-400" size={21} />
                <h2 className="text-lg font-semibold">Status history</h2>
              </div>
              {history.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No status changes have been recorded yet.
                </p>
              ) : (
                <ol className="space-y-4">
                  {[...history].reverse().map((entry, index) => (
                    <li
                      className="flex gap-3"
                      key={`${entry.updatedAt ?? index}-${index}`}
                    >
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          {entry.status ? statusLabels[entry.status] : 'Updated'}
                        </p>
                        {entry.updatedAt && (
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(entry.updatedAt)}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Customer</h2>
              <p className="mt-4 font-medium">{order.user.name}</p>
              <a
                className="mt-1 block break-all text-sm text-blue-300 hover:text-blue-200"
                href={`mailto:${order.user.email}`}
              >
                {order.user.email}
              </a>
              {addressLines.length > 0 && (
                <div className="mt-5 border-t border-slate-800 pt-4">
                  <h3 className="text-sm font-medium text-slate-300">
                    Delivery address
                  </h3>
                  <address className="mt-2 space-y-1 text-sm not-italic text-slate-400">
                    {addressLines.map((line, index) => (
                      <p key={`${line}-${index}`}>{line}</p>
                    ))}
                  </address>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Shipment summary</h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="text-slate-500">Carrier</dt>
                  <dd className="mt-1 text-slate-200">
                    {fulfillment?.carrier || 'Not added'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Tracking number</dt>
                  <dd className="mt-1 break-all text-slate-200">
                    {fulfillment?.trackingNumber || 'Not added'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Estimated delivery</dt>
                  <dd className="mt-1 text-slate-200">
                    {fulfillment?.estimatedDelivery
                      ? formatDate(fulfillment.estimatedDelivery)
                      : 'Not set'}
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}