'use client';

import ImagePlaceHolder from '@/shared/components/image-placeholder';
import { ChevronRight } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Input from '@repo/components/input';
import ColorSelector from '@repo/components/color-selector';
import CustomSpecifications from '@repo/components/custom-specifications';
import CustomProperties from '@repo/components/custom-properties';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/utils/axiosInstance';
import RichTextEditor from '@repo/components/rich-text-editor';
import SizeSelector from '@repo/components/size-selector';
import DiscountCodeInput from '@repo/components/discount-code-input';

const MAX_IMAGES = 8;

const getWordCount = (html: string) => {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return text ? text.split(/\s+/).length : 0;
};

const Page = () => {
  const {
    register,
    setValue,
    handleSubmit,
    control,
    watch,
    getValues,
    trigger,
    reset,
    formState: { errors },
  } = useForm();

  const [openImageModal, setOpenImageModal] = useState(false);
  const [images, setImages] = useState<(File | null)[]>([null]);
  const [submitting, setSubmitting] = useState<'create' | 'draft' | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/product/api/get-categories');
        return res.data;
      } catch (error) {
        console.log(error);
      }
    },
    staleTime: 1000 * 60 * 5, //Caching for 5mins
    retry: 2,
  });

  const categories = data?.categories || [];
  const subCategoriesData = data?.subCategories || {};

  const selectedCategory = watch('category');
  const regularPrice = watch('regular_price' as any) as number | undefined;
  const detailedDescription = watch('detailed_description') || '';

  const subcategories = useMemo(() => {
    return selectedCategory ? subCategoriesData[selectedCategory] || [] : [];
  }, [selectedCategory, subCategoriesData]);

  const buildFormData = (
    values: Record<string, any>,
    productStatus: 'published' | 'draft'
  ) => {
    const formData = new FormData();

    Object.entries(values).forEach(([key, value]) => {
      if (key === 'images') return; // files are appended separately below
      if (value === undefined || value === null || Number.isNaN(value)) return;
      formData.append(
        key,
        typeof value === 'object' ? JSON.stringify(value) : String(value)
      );
    });

    images.forEach((file) => {
      if (file) formData.append('images', file);
    });

    formData.append('status', productStatus);
    if (draftId) formData.append('id', draftId);
    return formData;
  };

  const submitProduct = async (
    values: Record<string, any>,
    productStatus: 'published' | 'draft'
  ) => {
    setSubmitting(productStatus === 'draft' ? 'draft' : 'create');
    setStatus(null);

    try {
      const res = await axiosInstance.post(
        '/product/api/create-product',
        buildFormData(values, productStatus),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (productStatus === 'draft') {
        setDraftId(res.data?.product?.id ?? draftId);
        setStatus({ type: 'success', text: 'Draft saved' });
      } else {
        setStatus({ type: 'success', text: 'Product created successfully' });
        reset();
        setImages([null]);
        setDraftId(null);
      }
    } catch (error: any) {
      setStatus({
        type: 'error',
        text:
          error?.response?.data?.message ||
          'Something went wrong. Please try again.',
      });
    } finally {
      setSubmitting(null);
    }
  };

  // Create: runs full validation first (handleSubmit)
  const onSubmit = (data: any) => {
    if (!images[0]) {
      setStatus({ type: 'error', text: 'Please add the main product image' });
      return;
    }
    submitProduct(data, 'published');
  };

  // Save Draft: skips validation except the title
  const onSaveDraft = async () => {
    const hasTitle = await trigger('title' as any);
    if (!hasTitle) return;
    submitProduct(getValues(), 'draft');
  };

  const updateImages = (updated: (File | null)[]) => {
    setImages(updated);
    setValue('images' as any, updated as any);
  };

  const handleImageChange = (file: File | null, index: number) => {
    const updated = [...images];
    updated[index] = file;
    if (index === updated.length - 1 && updated.length < MAX_IMAGES) {
      updated.push(null);
    }
    updateImages(updated);
  };

  const handleRemoveImage = (index: number) => {
    const updated = [...images];
    updated.splice(index, 1);

    // Always keep exactly one empty slot at the end (until the max is reached)
    if (
      updated.length === 0 ||
      (updated[updated.length - 1] !== null && updated.length < MAX_IMAGES)
    ) {
      updated.push(null);
    }
    updateImages(updated);
  };

  return (
    <form
      className="w-full mx-auto p-4 sm:p-6 lg:p-8 shadow-md rounded-lg text-white"
      onSubmit={handleSubmit(onSubmit)}
    >
      {/* Heading and breadcrumbs */}
      <h2 className="text-xl sm:text-2xl py-2 font-semibold font-Poppins text-white">
        Create Product
      </h2>
      <div className="flex flex-wrap items-center">
        <span className="text-[#80deea] cursor-pointer">Dashboard</span>
        <ChevronRight size={20} className="opacity-[.8]" />
        <span>Create Product</span>
      </div>

      {/* Content layout */}
      <div className="py-4 w-full flex flex-col lg:flex-row gap-6">
        {/* Images: stacked on top for mobile/tablet, left column on desktop */}
        <div className="w-full lg:w-[35%] flex flex-col gap-3">
          <ImagePlaceHolder
            setOpenImageModal={setOpenImageModal}
            size="765*850"
            small={false}
            index={0}
            file={images[0]}
            onImageChange={handleImageChange}
            onRemove={handleRemoveImage}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
            {images.slice(1).map((file, i) => (
              <ImagePlaceHolder
                key={i + 1}
                setOpenImageModal={setOpenImageModal}
                size="765*850"
                small
                index={i + 1}
                file={file}
                onImageChange={handleImageChange}
                onRemove={handleRemoveImage}
              />
            ))}
          </div>
        </div>

        {/* Form inputs (stacked vertically) */}
        <div className="w-full lg:w-[65%]">
          <div className="w-full flex flex-col gap-4">
            {/* Product title input */}
            <div className="w-full">
              <Input
                label="Product Title *"
                placeholder="Enter product title"
                {...register('title' as any, { required: 'Title is required' })}
              />
              {errors.title && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.title.message as string}
                </p>
              )}
            </div>

            {/* Product description input */}
            <div className="w-full">
              <Input
                type="textarea"
                rows={7}
                cols={10}
                label="Short Description * (Max 150 words)"
                placeholder="Enter product description for quick view"
                {...register('description' as any, {
                  required: 'Description is required',
                  validate: (value: string) => {
                    const wordCount = value.trim().split(/\s+/).length;
                    return (
                      wordCount <= 150 ||
                      `Description cannot exceed 150 words (Current: ${wordCount})`
                    );
                  },
                })}
              />
              {errors.description && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.description.message as string}
                </p>
              )}
            </div>

            {/* Tags input */}
            <div className="w-full">
              <Input
                label="Tags *"
                placeholder="apple, flagship"
                {...register('tags' as any, {
                  required: 'Separate related product tags with a comma,',
                })}
              />
              {errors.tags && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.tags.message as string}
                </p>
              )}
            </div>

            {/* Warranty input */}
            <div className="w-full">
              <Input
                label="Warranty *"
                placeholder="1 Year / No Warranty"
                {...register('warranty' as any, {
                  required: 'Warranty is required',
                })}
              />
              {errors.warranty && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.warranty.message as string}
                </p>
              )}
            </div>

            {/* Slug input */}
            <div className="w-full">
              <Input
                label="Slug *"
                placeholder="apple-iphone-15-pro"
                {...register('slug' as any, {
                  required: 'Slug is required',
                  minLength: {
                    value: 3,
                    message: 'Slug must be at least 3 characters',
                  },
                  maxLength: {
                    value: 50,
                    message: 'Slug cannot exceed 50 characters',
                  },
                  pattern: {
                    value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                    message:
                      'Slug can only contain lowercase letters, numbers and hyphens (no leading, trailing or double hyphens)',
                  },
                })}
              />
              {errors.slug && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.slug.message as string}
                </p>
              )}
            </div>

            {/* Brand input */}
            <div className="w-full">
              <Input
                label="Brand"
                placeholder="Apple, Samsung, Nike"
                {...register('brand' as any, {
                  maxLength: {
                    value: 50,
                    message: 'Brand name cannot exceed 50 characters',
                  },
                })}
              />
              {errors.brand && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.brand.message as string}
                </p>
              )}
            </div>

            {/* Colors */}
            <div className="w-full">
              <Controller
                name="colors"
                control={control}
                defaultValue={[]}
                render={({ field }) => (
                  <ColorSelector
                    label="Colors"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* Custom specifications */}
            <div className="w-full">
              <CustomSpecifications
                control={control}
                register={register as any}
              />
              {/* {
                  "custom_specifications": [
                    { "name": "Battery Life", "value": "40 hours" },
                    { "name": "Weight", "value": "250 g" }
                  ]
} */}
            </div>

            {/* Custom properties */}
            <div className="w-full">
              <Controller
                name="custom_properties"
                control={control}
                defaultValue={[]}
                render={({ field }) => (
                  <CustomProperties
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />

              {/* {
  "custom_properties": [
    { "label": "Size", "values": ["S", "M", "L"] },
    { "label": "Material", "values": ["Cotton", "Polyester"] }
  ]
} */}
            </div>

            {/* Cash on delivery */}
            <div className="w-full">
              <label className="block mb-1">Cash on Delivery *</label>
              <select
                defaultValue=""
                className="w-full border outline-none border-gray-700 bg-transparent p-2 rounded-md"
                {...register('cash_on_delivery', {
                  required: 'Please select Yes or No',
                })}
              >
                <option value="" disabled className="bg-black">
                  Select an option
                </option>
                <option value="yes" className="bg-black">
                  Yes
                </option>
                <option value="no" className="bg-black">
                  No
                </option>
              </select>
              {errors.cash_on_delivery && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.cash_on_delivery.message as string}
                </p>
              )}
            </div>

            {/* Category + Subcategory */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div className="w-full">
                <label className="block mb-1">Category *</label>
                {isLoading ? (
                  <p className="text-gray-400">Loading categories...</p>
                ) : isError ? (
                  <p className="text-red-500">Failed to load categories</p>
                ) : (
                  <Controller
                    name="category"
                    control={control}
                    defaultValue=""
                    rules={{ required: 'Category is required' }}
                    render={({ field }) => (
                      <select
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setValue('subcategory', '');
                        }}
                        className="w-full border outline-none border-gray-700 bg-transparent p-2 rounded-md"
                      >
                        <option value="" disabled className="bg-black">
                          Select a category
                        </option>
                        {categories.map((category: string) => (
                          <option
                            key={category}
                            value={category}
                            className="bg-black"
                          >
                            {category}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                )}
                {errors.category && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.category.message as string}
                  </p>
                )}
              </div>

              {/* Subcategory */}
              <div className="w-full">
                <label className="block mb-1">Subcategory *</label>
                <Controller
                  name="subcategory"
                  control={control}
                  defaultValue=""
                  rules={{ required: 'Subcategory is required' }}
                  render={({ field }) => (
                    <select
                      {...field}
                      disabled={!selectedCategory}
                      className="w-full border outline-none border-gray-700 bg-transparent p-2 rounded-md disabled:opacity-50"
                    >
                      <option value="" disabled className="bg-black">
                        {selectedCategory
                          ? 'Select a subcategory'
                          : 'Select a category first'}
                      </option>
                      {subcategories.map((sub: string) => (
                        <option key={sub} value={sub} className="bg-black">
                          {sub}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.subcategory && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.subcategory.message as string}
                  </p>
                )}
              </div>
            </div>

            {/* Detailed description */}
            <div className="w-full">
              <Controller
                name="detailed_description"
                control={control}
                defaultValue=""
                rules={{
                  validate: (value) => {
                    const count = getWordCount(value || '');
                    return (
                      count >= 100 ||
                      `Description must be at least 100 words (Current: ${count})`
                    );
                  },
                }}
                render={({ field }) => (
                  <RichTextEditor
                    label="Detailed Description * (Min 100 words)"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.detailed_description?.message as string}
                  />
                )}
              />
              <p className="text-gray-400 text-xs mt-1">
                Words: {getWordCount(detailedDescription)}
              </p>
            </div>

            {/* Regular price + Sale price + Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Regular price */}
              <div className="w-full">
                <Input
                  label="Regular Price *"
                  type="number"
                  placeholder="1000"
                  {...register('regular_price' as any, {
                    required: 'Regular price is required',
                    valueAsNumber: true,
                    min: { value: 1, message: 'Price must be at least 1' },
                    deps: ['sale_price'],
                  })}
                />
                {errors.regular_price && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.regular_price.message as string}
                  </p>
                )}
              </div>

              {/* Sale price */}
              <div className="w-full">
                <Input
                  label="Sale Price *"
                  type="number"
                  placeholder="800"
                  {...register('sale_price' as any, {
                    required: 'Sale price is required',
                    valueAsNumber: true,
                    min: { value: 1, message: 'Sale price must be at least 1' },
                    validate: (value: number) =>
                      !regularPrice ||
                      value < regularPrice ||
                      'Sale price must be less than the regular price',
                  })}
                />
                {errors.sale_price && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.sale_price.message as string}
                  </p>
                )}
              </div>

              {/* Stock */}
              <div className="w-full">
                <Input
                  label="Stock *"
                  type="number"
                  placeholder="100"
                  {...register('stock' as any, {
                    required: 'Stock is required',
                    valueAsNumber: true,
                    min: { value: 1, message: 'Stock must be at least 1' },
                    max: { value: 1000, message: 'Stock cannot exceed 1,000' },
                    validate: (value: number) =>
                      Number.isInteger(value) || 'Stock must be a whole number',
                  })}
                />
                {errors.stock && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.stock.message as string}
                  </p>
                )}
              </div>
            </div>

            {/* Sizes */}
            <div className="w-full">
              <Controller
                name="sizes"
                control={control}
                defaultValue={[]}
                render={({ field }) => (
                  <SizeSelector
                    label="Sizes"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* Discount codes */}
            <div className="w-full">
              <Controller
                name="discount_codes"
                control={control}
                defaultValue={[]}
                render={({ field }) => (
                  <DiscountCodeInput
                    label="Discount Codes (Optional)"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* Status message */}
            {status && (
              <p
                role="status"
                className={`text-sm rounded-md border px-3 py-2 ${
                  status.type === 'success'
                    ? 'border-green-600 text-green-400'
                    : 'border-red-600 text-red-400'
                }`}
              >
                {status.text}
              </p>
            )}

            {/* Actions */}
            <div className="w-full flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={submitting !== null}
                className="w-full sm:w-auto sm:min-w-[140px] px-6 py-2.5 rounded-md border border-gray-600 text-white font-medium hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting === 'draft' ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="submit"
                disabled={submitting !== null}
                className="w-full sm:w-auto sm:min-w-[140px] px-6 py-2.5 rounded-md bg-[#80deea] text-black font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {submitting === 'create' ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

export default Page;