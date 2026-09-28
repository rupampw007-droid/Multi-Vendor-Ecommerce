'use client';

import ImagePlaceHolder from '@/shared/components/image-placeholder';
import { ChevronRight, X } from 'lucide-react';
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
import Image from 'next/image';
import { enhancements } from '@/utils/AI.enhancements';  // adjust path to wherever you place the array

interface UploadedImage {
  fileId: string;
  file_url: string;
}

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
  const [images, setImages] = useState<(UploadedImage | null)[]>([null]);
  const [uploadingIndexes, setUploadingIndexes] = useState<Set<number>>(
    new Set()
  );
  const [submitting, setSubmitting] = useState<'create' | 'draft' | null>(
    null
  );
  const [draftId, setDraftId] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(
    null
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [activeEffect, setActiveEffect] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  const buildProductPayload = (
    values: Record<string, any>,
    productStatus: 'published' | 'draft'
  ) => {
    const {
      subcategory,
      custom_properties,
      discount_codes,
      ...productValues
    } = values;

    return {
      ...productValues,
      subCategory: subcategory,
      customProperties: custom_properties,
      discountCodes: discount_codes,
      images: images.filter((img): img is UploadedImage => img !== null),
      status: productStatus,
      ...(draftId ? { id: draftId } : {}),
    };
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
        buildProductPayload(values, productStatus)
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

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageChange = async (file: File, index: number) => {
    setUploadingIndexes((prev) => new Set(prev).add(index));

    try {
      const fileName = await convertFileToBase64(file);
      const response = await axiosInstance.post(
        '/product/api/upload-product-image',
        { fileName }
      );
      const uploadedImage: UploadedImage = {
        fileId: response.data.fileId,
        file_url: response.data.file_url,
      };

      setImages((prev) => {
        const updated = [...prev];
        updated[index] = uploadedImage;

        if (index === updated.length - 1 && updated.length < MAX_IMAGES) {
          updated.push(null);
        }

        setValue('images', updated);
        return updated;
      });
    } catch (error) {
      console.log(error);
    } finally {
      setUploadingIndexes((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  const handleRemoveImage = async (index: number) => {
    try {
      const imageToDelete = images[index];

      if (imageToDelete) {
        await axiosInstance.delete('/product/api/delete-product-image', {
          data: { fileId: imageToDelete.fileId },
        });
      }

      setImages((prev) => {
        const updated = [...prev];
        updated.splice(index, 1);

        if (!updated.includes(null) && updated.length < MAX_IMAGES) {
          updated.push(null);
        }

        setValue('images', updated);
        return updated;
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleEnhanceClick = (index: number) => {
    const img = images[index];
    if (!img) return;
    setSelectedImage(img);
    setSelectedIndex(index);
    setActiveEffect(null);
    setPreviewUrl(null);
  };

  const closeImageModal = () => {
    setOpenImageModal(false);
    setSelectedImage(null);
    setSelectedIndex(null);
    setActiveEffect(null);
    setPreviewUrl(null);
  };

  // Always transforms from the original uploaded URL so effects replace
  // rather than stack, and preloads the result so the loading state
  // reflects ImageKit actually generating the transformed asset.
  const applyTransformation = async (effect: string) => {
    if (!selectedImage || processing) return;

    setProcessing(true);
    setActiveEffect(effect);

    try {
      const transformedUrl = `${selectedImage.file_url}?tr=${effect}`;

      await new Promise<void>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to apply effect'));
        img.src = transformedUrl;
      });

      setPreviewUrl(transformedUrl);
    } catch (error) {
      console.log(error);
      setActiveEffect(null);
      setStatus({
        type: 'error',
        text: 'Could not apply enhancement, please try again',
      });
    } finally {
      setProcessing(false);
    }
  };

  const resetTransformation = () => {
    setActiveEffect(null);
    setPreviewUrl(null);
  };

  const handleUseEnhancedImage = () => {
    if (selectedIndex === null || !selectedImage || !previewUrl) return;

    setImages((prev) => {
      const updated = [...prev];
      updated[selectedIndex] = { ...selectedImage, file_url: previewUrl };
      setValue('images', updated);
      return updated;
    });

    closeImageModal();
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
            file={images[0]?.file_url ?? null}
            isUploading={uploadingIndexes.has(0)}
            onImageChange={handleImageChange}
            onRemove={handleRemoveImage}
            onEnhanceClick={handleEnhanceClick}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
            {images.slice(1).map((file, i) => {
              const index = i + 1;
              return (
                <ImagePlaceHolder
                  key={index}
                  setOpenImageModal={setOpenImageModal}
                  size="765*850"
                  small
                  index={index}
                  file={file?.file_url ?? null}
                  isUploading={uploadingIndexes.has(index)}
                  onImageChange={handleImageChange}
                  onRemove={handleRemoveImage}
                  onEnhanceClick={handleEnhanceClick}
                />
              );
            })}
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
                {...register('title' as any, {
                  required: 'Title is required',
                  validate: (value: string) =>
                    Boolean(value.trim()) || 'Title is required',
                })}
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
                {...register('short_description' as any, {
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
              {errors.short_description && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.short_description.message as string}
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

        {openImageModal && selectedImage && (
          <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-60 z-50">
            <div className="bg-gray-800 p-6 rounded-lg w-[450px] max-w-[90vw] text-white">
              <div className="flex justify-between items-center pb-3 mb-4">
                <h2 className="text-lg font-semibold">
                  Enhance Product Image
                </h2>
                <X
                  size={20}
                  className="cursor-pointer"
                  onClick={closeImageModal}
                />
              </div>

              <div className="relative w-full h-[300px] rounded-md overflow-hidden bg-black/20">
                <Image
                  src={previewUrl || selectedImage.file_url}
                  alt="Product to enhance"
                  fill
                  unoptimized
                  className="object-contain"
                />
                {processing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-xs text-white/80">
                      Enhancing image...
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                {enhancements.map((item: (typeof enhancements)[number]) => (
                  <button
                    key={item.effect}
                    type="button"
                    disabled={processing}
                    onClick={() => applyTransformation(item.effect)}
                    className={`px-3 py-2 rounded-md text-sm border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      activeEffect === item.effect
                        ? 'border-[#80deea] bg-[#80deea]/10 text-[#80deea]'
                        : 'border-gray-600 text-white hover:bg-white/10'
                    }`}
                  >
                    {processing && activeEffect === item.effect
                      ? 'Applying...'
                      : item.label}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={resetTransformation}
                  disabled={processing || !previewUrl}
                  className="px-4 py-2 rounded-md border border-gray-600 text-white text-sm hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleUseEnhancedImage}
                  disabled={processing || !previewUrl}
                  className="px-4 py-2 rounded-md bg-[#80deea] text-black text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Use this image
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </form>
  );
};

export default Page;