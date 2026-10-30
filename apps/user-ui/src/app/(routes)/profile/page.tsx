'use client'

import QuickActionCard from '@/shared/components/cards/quick-action-card'
import StatCard from '@/shared/components/cards/stat-card'
import ShippingAddressSection from '@/shared/components/shippingAddress'
import ChangePassword from '@/shared/components/change-password'
import useUser from '@/hooks/useUser'
import axiosInstance from '@/utils/axiosInstance'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  CreditCard,
  Gift,
  Inbox,
  LogOut,
  MapPin,
  PackageCheck,
  Pencil,
  Shield,
  Star,
  UserRound,
  X,
} from 'lucide-react'
import { Suspense, useEffect, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const accountSections = [
  { label: 'Profile', icon: UserRound },
  { label: 'My Orders', icon: ClipboardList },
  { label: 'Inbox', icon: Inbox },
  { label: 'Notifications', icon: Bell },
  { label: 'Shipping Address', icon: MapPin },
  { label: 'Change Password', icon: Shield },
]

const quickLinks = [
  { label: 'Referral Program', icon: Gift },
  { label: 'Your Badges', icon: Star },
  { label: 'Account Settings', icon: UserRound },
  { label: 'Billing History', icon: CreditCard },
  { label: 'Support Center', icon: CircleHelp },
]

interface ProfileUser {
  id: string
  name: string
  email: string
  createdAt: string
  avatars?: Array<{ id: string; url: string }>
}

interface ProfileResponse {
  user: ProfileUser
}

interface UserOrder {
  id: string
  createdAt: string
  subtotal: number
  totalAmount: number
  currency: string
  status: string
  fulfillments: Array<{ status: string }>
  items: unknown
}

interface UserOrdersResponse {
  orders: UserOrder[]
}

const formatJoinedDate = (dateString?: string) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-IN', {
        month: 'long',
        year: 'numeric',
      }).format(date)
}

const getInitials = (name?: string) =>
  name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U'

const formatOrderTotal = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amount)

const getOrderStatus = (order: UserOrder) => {
  const statuses = order.fulfillments.map((fulfillment) =>
    fulfillment.status.toUpperCase()
  )

  if (statuses.length > 0) {
    if (statuses.every((status) => status === 'DELIVERED')) return 'DELIVERED'
    if (statuses.includes('OUT_FOR_DELIVERY')) return 'OUT FOR DELIVERY'
    if (statuses.includes('SHIPPED')) return 'SHIPPED'
    if (statuses.includes('PROCESSING')) return 'PROCESSING'
    return statuses[0].replaceAll('_', ' ')
  }

  return order.status.toUpperCase().replaceAll('_', ' ')
}

const ProfileContent = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { user, isLoading, isError, refetch } = useUser()
  const activeSection = searchParams.get('active') || 'Profile'
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState('')
  const {
    data: orders = [],
    isLoading: ordersLoading,
    isError: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['user-orders'],
    queryFn: async () => {
      const response = await axiosInstance.get<UserOrdersResponse>(
        '/order/api/get-user-orders'
      )
      return response.data.orders
    },
  })

  const processingOrderCount = orders.filter(
    (order) => getOrderStatus(order) !== 'DELIVERED'
  ).length
  const completedOrderCount = orders.length - processingOrderCount

  useEffect(() => {
    if (!isEditOpen || !user) return
    setName(user.name ?? '')
    setEmail(user.email ?? '')
    setFormError('')
  }, [isEditOpen, user])

  const profileMutation = useMutation({
    mutationFn: async (values: { name: string; email: string }) => {
      const response = await axiosInstance.patch<ProfileResponse>(
        '/api/user-profile',
        values
      )
      return response.data.user
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['user'], updatedUser)
      setIsEditOpen(false)
      setFormError('')
    },
    onError: () => {
      setFormError('Your profile could not be updated. Please try again.')
    },
  })

  const logoutMutation = useMutation({
    mutationFn: async () => axiosInstance.post('/api/logout-user'),
    onSuccess: async () => {
      queryClient.clear()
      router.push('/login')
    },
  })

  const navigateToSection = (section: string) => {
    const params = new URLSearchParams()
    params.set('active', section)
    router.push(`/profile?${params.toString()}`)
  }

  const updateProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    profileMutation.mutate({ name: name.trim(), email: email.trim() })
  }

  const avatarUrl = user?.avatars?.[0]?.url

  return (
    <main className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">
            Your account
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
            My Profile
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your account, orders, and saved addresses.
          </p>
        </header>

        <section
          aria-label="Order summary"
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <StatCard
            title="Total Orders"
            value={ordersLoading ? '…' : String(orders.length)}
            description="Orders placed from your account."
            icon={<ClipboardList size={21} />}
          />
          <StatCard
            title="Processing Orders"
            value={ordersLoading ? '…' : String(processingOrderCount)}
            description="Orders not yet delivered."
            icon={<PackageCheck size={21} />}
          />
          <StatCard
            title="Completed Orders"
            value={ordersLoading ? '…' : String(completedOrderCount)}
            description="Orders delivered successfully."
            icon={<Check size={21} />}
          />
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[235px_minmax(0,1fr)_235px]">
          <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
              Account
            </h2>
            <nav aria-label="Account sections" className="space-y-1">
              {accountSections.map(({ label, icon: Icon }) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => navigateToSection(label)}
                  aria-current={activeSection === label ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    activeSection === label
                      ? 'bg-blue-50 text-blue-800'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon size={17} />
                  {label}
                  {activeSection === label && (
                    <ChevronRight size={15} className="ml-auto" />
                  )}
                </button>
              ))}
            </nav>
            <div className="my-4 border-t border-gray-100" />
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              <LogOut size={17} />
              {logoutMutation.isPending ? 'Logging out…' : 'Logout'}
            </button>
            {logoutMutation.isError && (
              <p role="alert" className="mt-2 px-3 text-xs text-red-600">
                Could not log out. Please try again.
              </p>
            )}
          </aside>

          <section
            aria-live="polite"
            className="min-w-0"
            aria-label={`${activeSection} section`}
          >
            {activeSection === 'Profile' ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Personal information
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Your account details and membership information.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!user || isLoading}
                    onClick={() => setIsEditOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-400 hover:text-blue-700 disabled:opacity-50"
                  >
                    <Pencil size={15} />
                    Edit profile
                  </button>
                </div>

                {isLoading ? (
                  <div className="animate-pulse space-y-5">
                    <div className="h-20 w-20 rounded-full bg-gray-200" />
                    <div className="h-16 rounded-xl bg-gray-100" />
                    <div className="h-16 rounded-xl bg-gray-100" />
                  </div>
                ) : isError ? (
                  <div className="rounded-xl bg-red-50 p-5 text-center">
                    <p className="text-sm text-red-700">
                      Your profile could not be loaded.
                    </p>
                    <button
                      type="button"
                      onClick={() => void refetch()}
                      className="mt-2 text-sm font-semibold text-red-800 hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : user ? (
                  <>
                    <div className="mb-7 flex items-center gap-4 rounded-xl bg-gray-50 p-4">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={`${user.name} profile`}
                          className="h-16 w-16 rounded-full border-2 border-white object-cover shadow-sm"
                        />
                      ) : (
                        <div
                          aria-label={`${user.name} profile photo placeholder`}
                          className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-800"
                        >
                          {getInitials(user.name)}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">
                          {user.name}
                        </p>
                        <p className="mt-0.5 text-sm text-gray-500">
                          Profile photo
                        </p>
                      </div>
                    </div>

                    <dl className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-gray-100 p-4">
                        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Full name
                        </dt>
                        <dd className="mt-1.5 break-words font-medium text-gray-900">
                          {user.name}
                        </dd>
                      </div>
                      <div className="rounded-xl border border-gray-100 p-4">
                        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Email address
                        </dt>
                        <dd className="mt-1.5 break-all font-medium text-gray-900">
                          {user.email}
                        </dd>
                      </div>
                      <div className="rounded-xl border border-gray-100 p-4">
                        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Joined
                        </dt>
                        <dd className="mt-1.5 font-medium text-gray-900">
                          {formatJoinedDate(user.createdAt)}
                        </dd>
                      </div>
                      <div className="rounded-xl border border-gray-100 p-4">
                        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Earned points
                        </dt>
                        <dd className="mt-1.5 font-medium text-gray-900">
                          Not available yet
                        </dd>
                      </div>
                    </dl>
                  </>
                ) : null}
              </div>
            ) : activeSection === 'My Orders' ? (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-5 py-5 sm:px-7">
                  <h2 className="text-xl font-semibold text-gray-900">
                    My orders
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Review your recent purchases and order status.
                  </p>
                </div>
                {ordersLoading ? (
                  <div className="space-y-3 p-5 sm:p-7" aria-label="Loading orders">
                    {[1, 2, 3].map((row) => (
                      <div
                        key={row}
                        className="h-14 animate-pulse rounded-lg bg-gray-100"
                      />
                    ))}
                  </div>
                ) : ordersError ? (
                  <div className="p-8 text-center">
                    <p role="alert" className="text-sm text-red-700">
                      Your orders could not be loaded.
                    </p>
                    <button
                      type="button"
                      onClick={() => void refetchOrders()}
                      className="mt-2 text-sm font-semibold text-blue-700 hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : orders.length === 0 ? (
                  <p className="px-5 py-12 text-center text-sm text-gray-500">
                    You have not placed any orders yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] divide-y divide-gray-100 text-left text-sm">
                      <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th scope="col" className="px-5 py-3 font-semibold sm:px-7">
                            Order
                          </th>
                          <th scope="col" className="px-5 py-3 font-semibold">
                            Date
                          </th>
                          <th scope="col" className="px-5 py-3 font-semibold">
                            Items
                          </th>
                          <th scope="col" className="px-5 py-3 font-semibold">
                            Total
                          </th>
                          <th scope="col" className="px-5 py-3 font-semibold">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {orders.map((order) => {
                          const itemCount = Array.isArray(order.items)
                            ? order.items.length
                            : 0
                          const status = getOrderStatus(order)
                          const isDelivered = status === 'DELIVERED'

                          return (
                            <tr key={order.id} className="text-gray-700">
                              <th
                                scope="row"
                                className="whitespace-nowrap px-5 py-4 font-medium text-gray-900 sm:px-7"
                              >
                                #{order.id.slice(-8).toUpperCase()}
                              </th>
                              <td className="whitespace-nowrap px-5 py-4">
                                {new Intl.DateTimeFormat('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                }).format(new Date(order.createdAt))}
                              </td>
                              <td className="px-5 py-4">
                                {itemCount} {itemCount === 1 ? 'item' : 'items'}
                              </td>
                              <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900">
                                {formatOrderTotal(order.totalAmount, order.currency)}
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    isDelivered
                                      ? 'bg-green-50 text-green-700'
                                      : 'bg-blue-50 text-blue-700'
                                  }`}
                                >
                                  {status}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : activeSection === 'Change Password' ? (
              <ChangePassword />
            ) : activeSection === 'Shipping Address' ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Shipping addresses
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Manage where your orders should be delivered.
                  </p>
                </div>
                <ShippingAddressSection />
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                  {accountSections.find(
                    (section) => section.label === activeSection
                  ) ? (
                    (() => {
                      const ActiveIcon =
                        accountSections.find(
                          (section) => section.label === activeSection
                        )?.icon ?? UserRound
                      return <ActiveIcon size={22} />
                    })()
                  ) : (
                    <CircleHelp size={22} />
                  )}
                </div>
                <h2 className="mt-4 text-lg font-semibold text-gray-900">
                  {activeSection}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
                  This account section is not available yet. Your profile and
                  shipping address are ready to manage.
                </p>
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
              More from your account
            </h2>
            <div className="space-y-2">
              {quickLinks.map(({ label, icon: Icon }) => (
                <QuickActionCard
                  key={label}
                  label={label}
                  icon={<Icon size={17} />}
                  active={activeSection === label}
                  onClick={() => navigateToSection(label)}
                />
              ))}
            </div>
          </aside>
        </div>
      </div>

      {isEditOpen && user && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsEditOpen(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="edit-profile-title"
                  className="text-xl font-semibold text-gray-900"
                >
                  Update profile
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Update your name and email address.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close edit profile dialog"
                onClick={() => setIsEditOpen(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={updateProfile} className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Full name
                <input
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              {formError && (
                <p role="alert" className="text-sm text-red-600">
                  {formError}
                </p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileMutation.isPending}
                  className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {profileMutation.isPending ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

const ProfilePage = () => (
  <Suspense
    fallback={
      <main className="min-h-screen bg-[#f7f8fa] p-8">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-10 w-1/3 rounded bg-gray-200" />
          <div className="h-28 rounded-2xl bg-gray-200" />
          <div className="h-96 rounded-2xl bg-gray-200" />
        </div>
      </main>
    }
  >
    <ProfileContent />
  </Suspense>
)

export default ProfilePage
