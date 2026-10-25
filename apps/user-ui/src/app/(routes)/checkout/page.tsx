'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { ArrowLeft, LockKeyhole, ShoppingBag } from 'lucide-react'
import axiosInstance from '@/utils/axiosInstance'
import CheckoutForm from '@/shared/components/checkout/checkoutForm'

const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null

type PaymentSetup = {
  clientSecret: string
  paymentIntentId: string
  subtotalAmount: number
  discountAmount: number
  totalAmount: number
  currency: string
  items: Array<{
    id: string
    title: string
    quantity: number
    sale_price: number
  }>
}

const formatMoney = (value: number, currency: string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(value)

const CheckoutContent = () => {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')
  const [paymentSetup, setPaymentSetup] = useState<PaymentSetup | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isCurrent = true

    const createPaymentIntent = async () => {
      if (!sessionId) {
        setErrorMessage('Your checkout session is missing. Please start again.')
        setIsLoading(false)
        return
      }
      if (!stripePromise) {
        setErrorMessage(
          'Online payment is not configured. Please contact the store and try again later.',
        )
        setIsLoading(false)
        return
      }

      try {
        const response = await axiosInstance.post<PaymentSetup>(
          '/order/api/create-payment-intent',
          { sessionId },
        )
        if (!response.data.clientSecret) {
          throw new Error('Stripe did not return a payment confirmation token.')
        }
        if (isCurrent) setPaymentSetup(response.data)
      } catch (error) {
        const message =
          typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          typeof error.response === 'object' &&
          error.response !== null &&
          'data' in error.response &&
          typeof error.response.data === 'object' &&
          error.response.data !== null &&
          'message' in error.response.data &&
          typeof error.response.data.message === 'string'
            ? error.response.data.message
            : error instanceof Error
              ? error.message
              : 'We could not prepare your payment. Please try again.'
        if (isCurrent) setErrorMessage(message)
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    void createPaymentIntent()
    return () => {
      isCurrent = false
    }
  }, [sessionId])

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/cart"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to cart
        </Link>

        <header className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
            Secure checkout
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
            Complete your payment
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Your order will be confirmed once your payment is verified.
          </p>
        </header>

        {errorMessage ? (
          <section
            role="alert"
            className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm"
          >
            <h2 className="font-semibold text-gray-900">
              Checkout could not be started
            </h2>
            <p className="mt-2 text-sm text-red-700">{errorMessage}</p>
            <Link
              href="/cart"
              className="mt-5 inline-flex rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
            >
              Return to cart
            </Link>
          </section>
        ) : isLoading || !paymentSetup ? (
          <div
            role="status"
            className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600 shadow-sm"
          >
            Preparing your secure payment form...
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                <LockKeyhole size={18} className="text-green-700" />
                <h2 className="font-semibold text-gray-900">
                  Payment details
                </h2>
              </div>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: paymentSetup.clientSecret,
                  appearance: { theme: 'stripe' },
                }}
              >
                <CheckoutForm
                  amount={paymentSetup.totalAmount}
                  currency={paymentSetup.currency}
                />
              </Elements>
            </section>

            <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
              <div className="mb-4 flex items-center gap-2">
                <ShoppingBag size={18} className="text-gray-600" />
                <h2 className="font-semibold text-gray-900">Order summary</h2>
              </div>
              {paymentSetup.items.length ? (
                <ul className="mb-5 max-h-64 space-y-3 overflow-y-auto border-b border-gray-100 pb-5">
                  {paymentSetup.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 text-gray-700">
                        <span className="block truncate font-medium">
                          {item.title}
                        </span>
                        <span className="text-xs text-gray-500">
                          Qty {item.quantity ?? 1}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium text-gray-900">
                        {formatMoney(
                          item.sale_price * item.quantity,
                          paymentSetup.currency,
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-5 border-b border-gray-100 pb-5 text-sm text-gray-500">
                  No items were found in this payment session.
                </p>
              )}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>
                    {formatMoney(
                      paymentSetup.subtotalAmount,
                      paymentSetup.currency,
                    )}
                  </span>
                </div>
                {paymentSetup.discountAmount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount</span>
                    <span>
                      −
                      {formatMoney(
                        paymentSetup.discountAmount,
                        paymentSetup.currency,
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-dashed border-gray-200 pt-3 text-base font-bold text-gray-900">
                  <span>Total</span>
                  <span>
                    {formatMoney(
                      paymentSetup.totalAmount,
                      paymentSetup.currency,
                    )}
                  </span>
                </div>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-gray-500">
                Prices and discounts are verified by the store before payment.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}

const CheckoutPage = () => (
  <Suspense
    fallback={
      <main className="min-h-screen bg-gray-50 px-4 py-10 text-center text-sm text-gray-600">
        Loading checkout...
      </main>
    }
  >
    <CheckoutContent />
  </Suspense>
)

export default CheckoutPage
