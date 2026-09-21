'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Plus, Trash2, X } from 'lucide-react';
import Input from '@repo/components/input';
import axiosInstance from '@/utils/axiosInstance';

type DiscountType = 'percentage' | 'flat';

interface DiscountCode {
  id: string;
  public_name: string;
  discountType: DiscountType;
  discountValue: number;
  discountCode: string;
}

interface DiscountForm {
  public_name: string;
  discountType: DiscountType;
  discountValue: number;
  discountCode: string;
}

const QUERY_KEY = ['discount-codes'];

const formatValue = (code: DiscountCode) =>
  code.discountType === 'percentage'
    ? `${code.discountValue}% off`
    : `${code.discountValue} off`;

/* ---------- Modal shell (closes on Escape and backdrop click) ---------- */

const Modal = ({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-xl border border-gray-800 bg-neutral-900 p-5 sm:p-6 text-white shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="opacity-70 hover:opacity-100"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

/* ---------- Create modal ---------- */

const CreateDiscountModal = ({ onClose }: { onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    formState: { errors },
  } = useForm<DiscountForm>({
    defaultValues: {
      public_name: '',
      discountType: 'percentage',
      discountCode: '',
    },
  });

  const discountType = watch('discountType');

  const mutation = useMutation({
    mutationFn: (payload: DiscountForm) =>
      axiosInstance.post('/product/api/create-discount-code', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      onClose();
    },
    onError: (error: any) => {
      setServerError(
        error?.response?.data?.message ||
          'Could not create the discount code. Please try again.'
      );
    },
  });

  const onSubmit = (values: DiscountForm) => {
    setServerError('');
    mutation.mutate({
      ...values,
      public_name: values.public_name.trim(),
      discountCode: values.discountCode.trim().toUpperCase(),
    });
  };

  return (
    <Modal title="Create discount code" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Public name */}
        <div className="w-full">
          <Input
            label="Name *"
            placeholder="Summer sale"
            {...register('public_name', {
              required: 'Name is required',
              maxLength: {
                value: 60,
                message: 'Name cannot exceed 60 characters',
              },
            })}
          />
          {errors.public_name && (
            <p className="text-red-500 text-xs mt-1">
              {errors.public_name.message}
            </p>
          )}
        </div>

        {/* Type + value */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="w-full">
            <label className="block mb-1">Discount type *</label>
            <select
              className="w-full border outline-none border-gray-700 bg-transparent p-2 rounded-md"
              {...register('discountType')}
            >
              <option value="percentage" className="bg-black">
                Percentage (%)
              </option>
              <option value="flat" className="bg-black">
                Flat amount
              </option>
            </select>
          </div>

          <div className="w-full">
            <Input
              label={
                discountType === 'percentage'
                  ? 'Discount value (%) *'
                  : 'Discount amount *'
              }
              type="number"
              placeholder={discountType === 'percentage' ? '10' : '200'}
              {...register('discountValue', {
                required: 'Discount value is required',
                valueAsNumber: true,
                min: { value: 0.01, message: 'Value must be greater than 0' },
                validate: (value) =>
                  getValues('discountType') !== 'percentage' ||
                  value <= 100 ||
                  'Percentage cannot exceed 100',
              })}
            />
            {errors.discountValue && (
              <p className="text-red-500 text-xs mt-1">
                {errors.discountValue.message}
              </p>
            )}
          </div>
        </div>

        {/* Code */}
        <div className="w-full">
          <Input
            label="Discount code *"
            placeholder="SUMMER25"
            {...register('discountCode', {
              required: 'Discount code is required',
              pattern: {
                value: /^[A-Za-z0-9_-]{3,20}$/,
                message:
                  '3-20 characters: letters, numbers, hyphens or underscores',
              },
            })}
          />
          {errors.discountCode && (
            <p className="text-red-500 text-xs mt-1">
              {errors.discountCode.message}
            </p>
          )}
        </div>

        {serverError && (
          <p
            role="alert"
            className="text-sm rounded-md border border-red-600 text-red-400 px-3 py-2"
          >
            {serverError}
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-md border border-gray-600 font-medium hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-[#80deea] text-black font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {mutation.isPending ? 'Creating...' : 'Create code'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/* ---------- Delete confirmation ---------- */

const DeleteDiscountDialog = ({
  target,
  onClose,
}: {
  target: DiscountCode;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      axiosInstance.delete(`/product/api/delete-discount-code/${target.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      onClose();
    },
    onError: (error: any) => {
      setServerError(
        error?.response?.data?.message ||
          'Could not delete the discount code. Please try again.'
      );
    },
  });

  return (
    <Modal title="Delete discount code" onClose={onClose}>
      <p className="text-gray-300">
        Delete{' '}
        <span className="font-mono font-semibold text-white">
          {target.discountCode}
        </span>
        ? Buyers will no longer be able to use it.
      </p>

      {serverError && (
        <p
          role="alert"
          className="mt-4 text-sm rounded-md border border-red-600 text-red-400 px-3 py-2"
        >
          {serverError}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-5">
        <button
          type="button"
          onClick={onClose}
          className="w-full sm:w-auto px-5 py-2.5 rounded-md border border-gray-600 font-medium hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {mutation.isPending ? 'Deleting...' : 'Delete code'}
        </button>
      </div>
    </Modal>
  );
};

/* ---------- Page ---------- */

const Page = () => {
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DiscountCode | null>(null);

  const {
    data: codes = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await axiosInstance.get('/product/api/get-discount-codes');
      return (res.data?.discount_code || []) as DiscountCode[];
    },
    staleTime: 1000 * 60 * 2,
  });

  return (
    <div className="w-full mx-auto p-4 sm:p-6 lg:p-8 text-white">
      {/* Heading and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl py-2 font-semibold font-Poppins">
            Discount Codes
          </h2>
          <div className="flex flex-wrap items-center">
            <span className="text-[#80deea] cursor-pointer">Dashboard</span>
            <ChevronRight size={20} className="opacity-[.8]" />
            <span>Discount Codes</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-md bg-[#80deea] text-black font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          Create discount
        </button>
      </div>

      {/* Content */}
      <div className="mt-6">
        {isLoading ? (
          <p className="text-gray-400">Loading discount codes...</p>
        ) : isError ? (
          <p className="text-red-500">
            Failed to load discount codes. Refresh the page to try again.
          </p>
        ) : codes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-700 p-8 text-center">
            <p className="text-gray-300">No discount codes yet.</p>
            <p className="text-gray-400 text-sm mt-1">
              Create a code to offer buyers a discount on your products.
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-4 px-5 py-2.5 rounded-md border border-gray-600 font-medium hover:bg-white/10 transition-colors"
            >
              Create your first code
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-white/5 text-gray-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Discount</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr
                    key={code.id}
                    className="border-t border-gray-800 hover:bg-white/5"
                  >
                    <td className="px-4 py-3">{code.public_name}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono rounded bg-white/10 px-2 py-0.5">
                        {code.discountCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {code.discountType}
                    </td>
                    <td className="px-4 py-3">{formatValue(code)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(code)}
                        aria-label={`Delete ${code.discountCode}`}
                        className="p-2 rounded-md text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreateDiscountModal onClose={() => setShowCreate(false)} />}
      {deleteTarget && (
        <DeleteDiscountDialog
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default Page;