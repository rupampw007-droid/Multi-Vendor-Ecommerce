'use client'

import axiosInstance from '@/utils/axiosInstance'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Clock3,
  MapPin,
  Package,
  PackageCheck,
  Truck,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type FulfillmentStatus =
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'

interface FulfillmentEvent {
  status?: string
  updatedAt?: string
  updatedBy?: string
}

interface OrderItem {
  id?: string
  title?: string
  quantity?: number
  sale_price?: number
  product?: { title?: string } | null
}

interface OrderFulfillment {
  id: string
  status: string
  carrier: string | null
  trackingNumber: string | null
  estimatedDelivery: string | null
  shippedAt: string | null
  deliveredAt: string | null
  updatedAt: string
  statusHistory: FulfillmentEvent[]
  shop: { id: string; name: string }
}

interface TrackingOrder {
  id: string
  createdAt: string
  status: string
  totalAmount: number
  currency: string
  items: OrderItem[]
  fulfillments: OrderFulfillment[]
  shippingAddress: {
    name?: string
    street?: string
    city?: string
    state?: string
    zip?: string
    country?: string
  } | null
}

const fulfillmentSteps: FulfillmentStatus[] = [
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]

const stepLabels: Record<FulfillmentStatus, string> = {
  PAID: 'Order confirmed',
  PROCESSING: 'Preparing your order',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
}

const formatDate = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amount)

const getStatus = (status: string): FulfillmentStatus =>
  fulfillmentSteps.includes(status.toUpperCase() as FulfillmentStatus)
    ? (status.toUpperCase() as FulfillmentStatus)
    : 'PAID'

const getErrorMessage = (error: unknown) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'status' in error.response &&
    error.response.status === 404
  ) {
    return 'We could not find this order in your account.'
  }
  return 'We could not load tracking details for this order.'
}

function ShipmentTimeline({
  fulfillment,
  orderCreatedAt,
}: {
  fulfillment: OrderFulfillment
  orderCreatedAt: string
}) {
  const currentStatus = getStatus(fulfillment.status)
  const currentStep = fulfillmentSteps.indexOf(currentStatus)
  const history = fulfillment.statusHistory ?? []

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <PackageCheck size={19} className="text-blue-700" />
            <h2 className="font-semibold text-gray-900">
              {fulfillment.shop?.name || 'Shipment'}
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {currentStatus.replaceAll('_', ' ').toLowerCase()}
          </p>
        </div>
        {fulfillment.estimatedDelivery && currentStatus !== 'DELIVERED' && (
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
              Estimated delivery
            </p>
            <p className="mt-1 font-semibold">
              {formatDate(fulfillment.estimatedDelivery) ?? 'Date unavailable'}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-6 py-6 sm:grid-cols-2">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-gray-100 p-2 text-gray-600">
            <Truck size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Carrier
            </p>
            <p className="mt-1 font-medium text-gray-900">
              {fulfillment.carrier || 'Not assigned yet'}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-gray-100 p-2 text-gray-600">
            <Package size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Tracking number
            </p>
            <p className="mt-1 break-all font-medium text-gray-900">
              {fulfillment.trackingNumber || 'Will be added when shipped'}
            </p>
          </div>
        </div>
      </div>

      <ol aria-label="Shipment progress" className="space-y-0">
        {fulfillmentSteps.map((step, index) => {
          const event = history.find(
            (entry) => entry.status?.toUpperCase() === step,
          )
          const isComplete = index <= currentStep
          const isCurrent = index === currentStep
          const eventTime =
            event?.updatedAt ??
            (step === 'PAID'
              ? orderCreatedAt
              : step === 'SHIPPED'
                ? fulfillment.shippedAt
                : step === 'DELIVERED'
                  ? fulfillment.deliveredAt
                  : isCurrent
                    ? fulfillment.updatedAt
                    : null)

          return (
            <li key={step} className="relative flex min-h-14 gap-4">
              {index < fulfillmentSteps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[13px] top-7 h-full w-px ${
                    isComplete ? 'bg-blue-300' : 'bg-gray-200'
                  }`}
                />
              )}
              <span
                className={`relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                  isCurrent
                    ? 'border-blue-700 bg-blue-700 text-white'
                    : isComplete
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-400'
                }`}
              >
                {isComplete ? <Check size={14} /> : <Clock3 size={14} />}
              </span>
              <div className="flex min-w-0 flex-1 items-start justify-between gap-4 pb-5">
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      isComplete ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {stepLabels[step]}
                  </p>
                  {eventTime && (
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(eventTime) ?? 'Date unavailable'}
                    </p>
                  )}
                </div>
                {isCurrent && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    Current
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default function TrackOrderPage() {
  const params = useParams<{ orderId: string }>()
  const orderId = params.orderId
  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order-tracking', orderId],
    queryFn: async () => {
      const response = await axiosInstance.get<{ order: TrackingOrder }>(
        `/order/api/get-order-details/${encodeURIComponent(orderId)}`,
      )
      return response.data.order
    },
    enabled: Boolean(orderId),
  })

  const address = order?.shippingAddress
  const itemCount = order?.items.reduce(
    (count, item) => count + (item.quantity ?? 1),
    0,
  )

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/profile?active=My%20Orders"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to my orders
        </Link>

        <header className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">
            Order tracking
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
            Track your order
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Follow your shipment from confirmation through delivery.
          </p>
        </header>

        {isLoading ? (
          <div
            role="status"
            className="animate-pulse space-y-5"
            aria-label="Loading tracking details"
          >
            <div className="h-36 rounded-2xl bg-white" />
            <div className="h-96 rounded-2xl bg-white" />
          </div>
        ) : isError ? (
          <section
            role="alert"
            className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"
          >
            <CircleAlert size={36} className="mx-auto text-red-600" />
            <h2 className="mt-4 font-semibold text-gray-900">
              Tracking details unavailable
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {getErrorMessage(error)}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-5 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700"
            >
              Try again
            </button>
          </section>
        ) : order ? (
          <div className="space-y-5">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Order reference
                  </p>
                  <p className="mt-1 break-all text-lg font-bold text-gray-900">
                    #{order.id.slice(-8).toUpperCase()}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Placed {formatDate(order.createdAt) ?? 'date unavailable'}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Order total
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {formatCurrency(order.totalAmount, order.currency)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {itemCount ?? 0} {(itemCount ?? 0) === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </div>
              {address && (
                <div className="mt-5 flex items-start gap-3 border-t border-gray-100 pt-5">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-gray-500" />
                  <div className="text-sm text-gray-700">
                    <p className="font-semibold text-gray-900">
                      Delivering to {address.name || 'your address'}
                    </p>
                    <p className="mt-1">
                      {[address.street, address.city, address.state, address.zip]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    {address.country && (
                      <p className="mt-0.5">{address.country}</p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {order.fulfillments.length > 0 ? (
              order.fulfillments.map((fulfillment) => (
                <ShipmentTimeline
                  key={fulfillment.id}
                  fulfillment={fulfillment}
                  orderCreatedAt={order.createdAt}
                />
              ))
            ) : (
              <section className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
                <div className="flex items-start gap-4">
                  <span className="rounded-xl bg-amber-50 p-3 text-amber-700">
                    <Clock3 size={22} />
                  </span>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      We&apos;re preparing your tracking details
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      Your order is confirmed. Shipment details will appear here
                      once they are available.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>
        ) : null}
      </div>
    </main>
  )
}