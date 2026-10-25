'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, CircleAlert, Clock3, RefreshCw } from 'lucide-react'
import axiosInstance from '@/utils/axiosInstance'
import { useStore } from '@/store'

type VerificationResponse = {
  paymentStatus: string
  paid: boolean
  orderId: string | null
}

type VerificationState =
  | { status: 'checking' }
  | { status: 'waiting' }
  | { status: 'success'; orderId: string }
  | { status: 'failed'; paymentStatus: string }
  | { status: 'error'; message: string }

const PaymentSuccessContent = () => {
  const searchParams = useSearchParams()
  const paymentIntentId =
    searchParams.get('paymentIntentId') ?? searchParams.get('payment_intent')
  const redirectStatus = searchParams.get('redirect_status')
  const clearCart = useStore((state) => state.clearCart)
  const [verification, setVerification] = useState<VerificationState>({
    status: 'checking',
  })
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!paymentIntentId) {
      setVerification({
        status: 'error',
        message: 'We could not find a payment to verify.',
      })
      return
    }

    let isCurrent = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0

    const verifyPayment = async () => {
      try {
        const response = await axiosInstance.get<VerificationResponse>(
          '/order/api/verify-payment-session',
          { params: { paymentIntentId } },
        )
        if (!isCurrent) return

        const result = response.data
        if (result.paid && result.orderId) {
          setVerification({ status: 'success', orderId: result.orderId })
          clearCart()
          return
        }

        if (
          result.paymentStatus === 'processing' ||
          (result.paid && !result.orderId)
        ) {
          if (attempts < 15) {
            attempts += 1
            setVerification({ status: 'waiting' })
            timer = setTimeout(verifyPayment, 2000)
            return
          }
          setVerification({ status: 'waiting' })
          return
        }

        setVerification({
          status: 'failed',
          paymentStatus: result.paymentStatus || redirectStatus || 'unknown',
        })
      } catch (error) {
        if (!isCurrent) return
        setVerification({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Payment verification failed. Please try again.',
        })
      }
    }

    setVerification({ status: 'checking' })
    void verifyPayment()
    return () => {
      isCurrent = false
      if (timer) clearTimeout(timer)
    }
  }, [paymentIntentId, redirectStatus, retryCount, clearCart])

  const isChecking =
    verification.status === 'checking' || verification.status === 'waiting'

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-4 py-12">
      <section className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-7 text-center shadow-sm sm:p-10">
        {verification.status === 'success' ? (
          <>
            <CheckCircle2
              size={56}
              className="mx-auto text-green-600"
              aria-hidden="true"
            />
            <h1 className="mt-5 text-2xl font-bold text-gray-900">
              Payment successful
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Your payment is confirmed and your order has been placed.
            </p>
            <p className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
              Order reference:{' '}
              <span className="break-all font-semibold">{verification.orderId}</span>
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/profile?active=My%20Orders"
                className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-700"
              >
                View your orders
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Continue shopping
              </Link>
            </div>
          </>
        ) : verification.status === 'failed' ? (
          <>
            <CircleAlert
              size={56}
              className="mx-auto text-red-600"
              aria-hidden="true"
            />
            <h1 className="mt-5 text-2xl font-bold text-gray-900">
              Payment was not completed
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              The payment status is {verification.paymentStatus.replaceAll('_', ' ')}.
              Your cart has not been cleared.
            </p>
            <Link
              href="/cart"
              className="mt-6 inline-flex rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-700"
            >
              Return to cart
            </Link>
          </>
        ) : verification.status === 'error' ? (
          <>
            <CircleAlert
              size={56}
              className="mx-auto text-amber-600"
              aria-hidden="true"
            />
            <h1 className="mt-5 text-2xl font-bold text-gray-900">
              We couldn&apos;t verify your payment
            </h1>
            <p role="alert" className="mt-2 text-sm leading-relaxed text-gray-600">
              {verification.message}
            </p>
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-700"
            >
              <RefreshCw size={16} />
              Check again
            </button>
          </>
        ) : (
          <>
            <Clock3
              size={56}
              className="mx-auto animate-pulse text-blue-600"
              aria-hidden="true"
            />
            <h1 className="mt-5 text-2xl font-bold text-gray-900">
              {isChecking ? 'Verifying your payment' : 'Payment confirmation pending'}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              {isChecking
                ? 'Please wait while we confirm your payment and prepare your order.'
                : 'Your payment was received, but order processing is taking longer than usual. Check again shortly.'}
            </p>
            {!isChecking && (
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-700"
              >
                <RefreshCw size={16} />
                Check again
              </button>
            )}
          </>
        )}
      </section>
    </main>
  )
}

const PaymentSuccessPage = () => (
  <Suspense
    fallback={
      <main className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-4 text-sm text-gray-600">
        Verifying your payment...
      </main>
    }
  >
    <PaymentSuccessContent />
  </Suspense>
)

export default PaymentSuccessPage
