'use client'

import { useState, type FormEvent } from 'react'
import { useElements, useStripe, PaymentElement } from '@stripe/react-stripe-js'
import { useRouter } from 'next/navigation'

type CheckoutFormProps = {
  amount: number
  currency: string
}

const CheckoutForm = ({ amount, currency }: CheckoutFormProps) => {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amount)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!stripe || !elements || isSubmitting) return

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      })

      if (error) {
        setErrorMessage(
          error.message ??
            'Your payment could not be completed. Please try again.',
        )
        setIsSubmitting(false)
        return
      }

      if (
        paymentIntent?.status === 'succeeded' ||
        paymentIntent?.status === 'processing'
      ) {
        router.replace(
          `/payment-success?paymentIntentId=${encodeURIComponent(paymentIntent.id)}`,
        )
        return
      }

      setErrorMessage(
        'Payment is not complete yet. Please check your payment details.',
      )
      setIsSubmitting(false)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Payment could not be confirmed. Please try again.',
      )
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement options={{ layout: 'accordion' }} />
      {errorMessage && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || isSubmitting}
        className="flex w-full items-center justify-center rounded-xl bg-gray-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {isSubmitting ? 'Confirming payment...' : `Pay ${formattedAmount}`}
      </button>
      <p className="text-center text-xs text-gray-500">
        Your payment details are encrypted and processed securely by Stripe.
      </p>
    </form>
  )
}

export default CheckoutForm
