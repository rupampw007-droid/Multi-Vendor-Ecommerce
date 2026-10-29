'use client'

import axios, { AxiosError } from 'axios'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  Landmark,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '@/utils/axiosInstance'

type StripeAccountStatus = {
  accountId: string
  country: string | null
  detailsSubmitted: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
  transfersEnabled: boolean
  ready: boolean
  currentlyDue: string[]
  eventuallyDue: string[]
  disabledReason: string | null
}

type StripeStatusResponse = {
  connected: boolean
  ready: boolean
  account: StripeAccountStatus | null
  message?: string
}

type OnboardingResponse = {
  url: string
}

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const response = (
      error as AxiosError<{
        message?: string
        stripeErrorType?: string
        stripeErrorCode?: string | null
        stripeErrorMessage?: string
        stripeRequestId?: string | null
      }>
    ).response?.data
    if (response?.message) {
      const diagnostics = [
        response.stripeErrorMessage &&
          `Stripe details: ${response.stripeErrorMessage}`,
        response.stripeErrorType &&
          `Stripe error type: ${response.stripeErrorType}`,
        response.stripeErrorCode && `Stripe code: ${response.stripeErrorCode}`,
        response.stripeRequestId &&
          `Request ID: ${response.stripeRequestId}`,
      ].filter(Boolean)
      return diagnostics.length
        ? `${response.message} (${diagnostics.join('; ')})`
        : response.message
    }
  }
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.'
}

const requirementLabel = (requirement: string) =>
  requirement
    .split(/[._]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const PaymentsContent = () => {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState('')
  const returnedFromStripe = searchParams.get('connected') === 'true'
  const countryMismatchMessage =
    'This Stripe account is registered outside India. Stripe does not allow changing an account’s country. Contact support to resolve the existing account before connecting a new one.'

  const {
    data: status,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['stripe-connect-status'],
    queryFn: async () => {
      const response = await axiosInstance.get<StripeStatusResponse>(
        '/api/stripe-connect-status',
      )
      return response.data
    },
    retry: 1,
  })

  useEffect(() => {
    if (returnedFromStripe) {
      void queryClient.invalidateQueries({
        queryKey: ['stripe-connect-status'],
      })
    }
  }, [queryClient, returnedFromStripe])

  const onboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.post<OnboardingResponse>(
        '/api/create-stripe-link',
      )
      return response.data
    },
    onSuccess: (data) => {
      if (!data.url) {
        setActionError('Stripe did not provide an onboarding link. Try again.')
        return
      }
      window.location.assign(data.url)
    },
    onError: (mutationError) => {
      setActionError(getErrorMessage(mutationError))
    },
  })

  const account = status?.account
  const hasCountryMismatch = Boolean(
    account?.country && account.country !== 'IN',
  )
  const dueRequirements = account?.currentlyDue ?? []

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-400">
            Seller payments
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Payout account
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-slate-400">
            Connect a verified Stripe account to receive payouts for completed
            orders. Your bank and identity details are entered securely on
            Stripe.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_330px]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8">
            {isLoading ? (
              <div role="status" className="flex items-center gap-3 text-slate-300">
                <LoaderCircle className="animate-spin" size={20} />
                Checking your Stripe account...
              </div>
            ) : isError ? (
              <div role="alert" className="rounded-xl border border-red-900 bg-red-950/50 p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 shrink-0 text-red-400" />
                  <div>
                    <h2 className="font-semibold text-white">
                      Account status could not be loaded
                    </h2>
                    <p className="mt-1 text-sm text-red-200">
                      {getErrorMessage(error)}
                    </p>
                    <button
                      type="button"
                      onClick={() => void refetch()}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-blue-300"
                    >
                      <RefreshCw size={15} />
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            ) : status?.ready ? (
              <div className="rounded-xl border border-emerald-900 bg-emerald-950/40 p-5 sm:p-6">
                <CheckCircle2 size={34} className="text-emerald-400" />
                <h2 className="mt-4 text-xl font-semibold text-white">
                  Payouts are ready
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-emerald-100/80">
                  Your Stripe account can receive transfers and payouts.
                  Customers can now check out products from your shop.
                </p>
                <dl className="mt-5 grid gap-3 border-t border-emerald-900 pt-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-emerald-200/60">Account country</dt>
                    <dd className="mt-1 font-medium text-white">
                      {account?.country ?? 'India'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-emerald-200/60">Payouts</dt>
                    <dd className="mt-1 font-medium text-white">Enabled</dd>
                  </div>
                </dl>
              </div>
            ) : status?.message ? (
              <div
                role="alert"
                className="rounded-xl border border-amber-800 bg-amber-950/40 p-5 sm:p-6"
              >
                <AlertCircle size={32} className="text-amber-300" />
                <h2 className="mt-4 text-xl font-semibold text-white">
                  Stripe account needs support
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-amber-100/80">
                  {status.message}
                </p>
              </div>
            ) : hasCountryMismatch ? (
              <div role="alert" className="rounded-xl border border-amber-800 bg-amber-950/40 p-5 sm:p-6">
                <AlertCircle size={32} className="text-amber-300" />
                <h2 className="mt-4 text-xl font-semibold text-white">
                  Existing account needs attention
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-amber-100/80">
                  {countryMismatchMessage}
                </p>
                <p className="mt-4 break-all text-xs text-slate-400">
                  Stripe account: {account?.accountId}
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
                    <Landmark size={24} />
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {status?.connected
                        ? 'Finish setting up your payout account'
                        : 'Connect your Stripe account'}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                      {status?.connected
                        ? 'Stripe still needs information before your account can receive order payouts. Continue onboarding to provide the requested details.'
                        : 'Complete Stripe’s secure verification so your sales can be paid out to your bank account.'}
                    </p>
                  </div>
                </div>

                {account && (
                  <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm text-slate-400">
                        Stripe account
                      </span>
                      <span className="break-all text-sm font-medium text-slate-200">
                        {account.accountId}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3 text-sm">
                      <span className="text-slate-400">Account country</span>
                      <span className="font-medium text-slate-200">
                        {account.country ?? 'Not set'}
                      </span>
                    </div>
                    {dueRequirements.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                          Stripe still needs
                        </p>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {dueRequirements.map((item) => (
                            <li
                              key={item}
                              className="rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-100"
                            >
                              {requirementLabel(item)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {account.disabledReason && (
                      <p className="mt-3 text-sm text-red-300">
                        Stripe restriction: {requirementLabel(account.disabledReason)}
                      </p>
                    )}
                  </div>
                )}

                {actionError && (
                  <p
                    role="alert"
                    className="mt-5 rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-200"
                  >
                    {actionError}
                  </p>
                )}

                {returnedFromStripe && (
                  <p className="mt-5 rounded-lg border border-blue-900 bg-blue-950/40 px-4 py-3 text-sm text-blue-100">
                    Stripe returned you to the store. We’ve refreshed your
                    account status; if anything is still due, resume onboarding
                    below.
                  </p>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setActionError('')
                      onboardingMutation.mutate()
                    }}
                    disabled={
                      onboardingMutation.isPending ||
                      hasCountryMismatch ||
                      isFetching
                    }
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {onboardingMutation.isPending ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : (
                      <ArrowRight size={17} />
                    )}
                    {status?.connected
                      ? 'Continue Stripe setup'
                      : 'Connect with Stripe'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void refetch()}
                    disabled={isFetching}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    <RefreshCw
                      size={16}
                      className={isFetching ? 'animate-spin' : ''}
                    />
                    Refresh status
                  </button>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center gap-2 text-white">
                <ShieldCheck size={19} className="text-emerald-400" />
                <h2 className="font-semibold">Secure verification</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Identity and bank details are submitted directly to Stripe.
                This store never asks for or stores your banking credentials.
              </p>
              <a
                href="https://stripe.com/connect"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-300 hover:text-blue-200"
              >
                About Stripe Connect
                <ExternalLink size={14} />
              </a>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center gap-2 text-white">
                <CircleDollarSign size={19} className="text-blue-300" />
                <h2 className="font-semibold">When can I sell?</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Checkout becomes available after Stripe enables both transfers
                and payouts for your account.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <Clock3 size={14} />
                Stripe may take time to review submitted information.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

const PaymentsPage = () => (
  <Suspense
    fallback={
      <div className="min-h-screen bg-slate-950 px-6 py-12 text-slate-300">
        Loading payout settings...
      </div>
    }
  >
    <PaymentsContent />
  </Suspense>
)

export default PaymentsPage
