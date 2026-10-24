'use client'

import axiosInstance from '@/utils/axiosInstance'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  MapPin,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'

interface UserAddress {
  id: string
  label: string
  name: string
  street: string
  city: string
  state?: string | null
  zip: string
  country: string
  phone?: string | null
  isDefault: boolean
}

interface AddressesResponse {
  addresses: UserAddress[]
}

const ShippingAddressSection = () => {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({
    label: '',
    name: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    phone: '',
    isDefault: false,
  })
  const {
    data: addresses = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['user-addresses'],
    queryFn: async () => {
      const response =
        await axiosInstance.get<AddressesResponse>('/api/user-addresses')
      return response.data.addresses
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (addressId: string) =>
      axiosInstance.delete(`/api/user-addresses/${addressId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-addresses'] })
    },
  })

  const defaultMutation = useMutation({
    mutationFn: async (addressId: string) =>
      axiosInstance.patch(`/api/user-addresses/${addressId}/default`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-addresses'] })
    },
  })

  const addMutation = useMutation({
    mutationFn: async (address: typeof form) =>
      axiosInstance.post('/api/user-addresses', address),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-addresses'] })
      setForm({
        label: '',
        name: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        phone: '',
        isDefault: false,
      })
      setFormError('')
      setIsAddOpen(false)
    },
    onError: () => {
      setFormError('The address could not be saved. Please try again.')
    },
  })

  const submitAddress = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    addMutation.mutate(form)
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div
            key={index}
            className="h-48 animate-pulse rounded-2xl border border-gray-200 bg-white"
          />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-white px-6 py-10 text-center">
        <p className="font-medium text-gray-900">
          We couldn&apos;t load your shipping addresses.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-3 text-sm font-semibold text-blue-700 hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => {
            setFormError('')
            setIsAddOpen(true)
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          <Plus size={16} />
          Add address
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <MapPin size={30} className="mx-auto text-gray-400" />
          <p className="mt-3 font-semibold text-gray-900">
            No shipping addresses saved
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Add an address to make checkout quicker.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
          <article
            key={address.id}
            className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <MapPin size={17} />
              </span>
              <div>
                <h3 className="font-semibold text-gray-900">{address.label}</h3>
                {address.isDefault && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                    <Star size={12} className="fill-green-600" />
                    Default address
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              aria-label={`Delete ${address.label} address`}
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete the ${address.label} shipping address?`
                  )
                ) {
                  deleteMutation.mutate(address.id)
                }
              }}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={17} />
            </button>
          </div>

          <div className="mt-4 space-y-1 text-sm text-gray-600">
            <p className="font-medium text-gray-900">{address.name}</p>
            <p>{address.street}</p>
            <p>
              {[address.city, address.state, address.zip, address.country]
                .filter(Boolean)
                .join(', ')}
            </p>
            {address.phone && <p>{address.phone}</p>}
          </div>

          {!address.isDefault && (
            <button
              type="button"
              disabled={defaultMutation.isPending}
              onClick={() => defaultMutation.mutate(address.id)}
              className="mt-auto inline-flex items-center gap-1.5 pt-5 text-left text-sm font-semibold text-blue-700 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check size={16} />
              Set as default
            </button>
          )}
          </article>
          ))}

          {(deleteMutation.isError || defaultMutation.isError) && (
            <p role="alert" className="text-sm text-red-600 sm:col-span-2">
              An address could not be updated. Please try again.
            </p>
          )}
        </div>
      )}

      {isAddOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsAddOpen(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-address-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="add-address-title"
                  className="text-xl font-semibold text-gray-900"
                >
                  Add shipping address
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Save an address for your future orders.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close add address dialog"
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitAddress} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ['label', 'Address label', 'Home'],
                    ['name', 'Recipient name', 'Full name'],
                    ['street', 'Street address', 'Street and house number'],
                    ['city', 'City', 'City'],
                    ['state', 'State / province', 'State or province'],
                    ['zip', 'ZIP / postal code', 'Postal code'],
                    ['country', 'Country', 'Country'],
                    ['phone', 'Phone (optional)', 'Phone number'],
                  ] as const
                ).map(([field, label, placeholder]) => (
                  <label
                    key={field}
                    className={`block text-sm font-medium text-gray-700 ${
                      field === 'street' ? 'sm:col-span-2' : ''
                    }`}
                  >
                    {label}
                    <input
                      type="text"
                      required={
                        field !== 'state' &&
                        field !== 'phone'
                      }
                      value={form[field]}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [field]: event.target.value,
                        }))
                      }
                      placeholder={placeholder}
                      className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                ))}
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isDefault: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 accent-blue-700"
                />
                Set as my default address
              </label>
              {formError && (
                <p role="alert" className="text-sm text-red-600">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {addMutation.isPending ? 'Saving…' : 'Save address'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default ShippingAddressSection