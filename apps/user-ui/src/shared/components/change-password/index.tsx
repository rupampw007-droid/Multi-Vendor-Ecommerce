'use client'

import { useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { FormEvent, useState } from 'react'
import axiosInstance from '@/utils/axiosInstance'

interface ChangePasswordResponse {
  message: string
}

interface ChangePasswordProps {
  onPasswordChanged?: () => void
}

const getErrorMessage = (error: AxiosError<{ message?: string }>) =>
  error.response?.data?.message ??
  'Could not change your password. Please try again.'

const ChangePassword = ({ onPasswordChanged }: ChangePasswordProps) => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState('')

  const mutation = useMutation({
    mutationFn: async (values: {
      currentPassword: string
      newPassword: string
    }) => {
      const response = await axiosInstance.patch<ChangePasswordResponse>(
        '/api/change-password-user',
        values
      )
      return response.data
    },
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setFormError('')
      onPasswordChanged?.()
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      setFormError(getErrorMessage(error))
    },
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')

    if (newPassword.length < 8) {
      setFormError('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setFormError('New password and confirmation do not match')
      return
    }

    mutation.mutate({ currentPassword, newPassword })
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Change password</h2>
        <p className="mt-1 text-sm text-gray-500">
          Use your current password to set a new password for your account.
        </p>
      </div>

      <form onSubmit={submit} className="max-w-xl space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Current password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          New password
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        {formError && (
          <p role="alert" className="text-sm text-red-600">
            {formError}
          </p>
        )}
        {mutation.isSuccess && (
          <p role="status" className="text-sm text-green-700">
            {mutation.data.message || 'Password changed successfully.'}
          </p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? 'Updating password…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}

export default ChangePassword