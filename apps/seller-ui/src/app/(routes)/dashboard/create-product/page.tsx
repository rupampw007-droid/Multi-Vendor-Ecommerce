'use client';

import ImagePlaceHolder from '@/shared/components/image-placeholder';
import { ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Input from '@repo/components/input';
import ColorSelector from '@repo/components/color-selector';
import CustomSpecifications from '@repo/components/custom-specifications';
import CustomProperties from '@repo/components/custom-properties';

const MAX_IMAGES = 8;

const Page = () => {
  const {
    register,
    setValue,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm();
  const [openImageModal, setOpenImageModal] = useState(false);
  const [images, setImages] = useState<(File | null)[]>([null]);

  const onSubmit = (data: any) => {
    console.log(data);
  };

  const updateImages = (updated: (File | null)[]) => {
    setImages(updated);
    setValue('images', updated);
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
      className="w-full mx-auto p-8 shadow-md rounded-lg text-white"
      onSubmit={handleSubmit(onSubmit)}
    >
      {/* Heading and breadcrumbs */}
      <h2 className="text-2xl py-2 font-semibold font-Poppins text-white">
        Create Product
      </h2>
      <div className="flex items-center">
        <span className="text-[#80deea] cursor-pointer">Dashboard</span>
        <ChevronRight size={20} className="opacity-[.8]" />
        <span>Create Product</span>
      </div>

      {/* Content layout */}
      <div className="py-4 w-full flex gap-6">
        {/* Left: main image */}
        <div className="md:w-[35%]">
          <ImagePlaceHolder
            setOpenImageModal={setOpenImageModal}
            size="765*850"
            small={false}
            index={0}
            file={images[0]}
            onImageChange={handleImageChange}
            onRemove={handleRemoveImage}
          />
        </div>

        {/* Right: additional images */}
        <div className="grid grid-cols-2 gap-3 mt-4">
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

        {/* Right side - form inputs (stacked vertically) */}
        <div className="md:w-[65%]">
          <div className="w-full flex flex-col gap-4">
            {/* Product title input */}
            <div className="w-full">
              <Input
                label="Product Title *"
                placeholder="Enter product title"
                {...register('title', { required: 'Title is required' })}
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
                {...register('description', {
                  required: 'Description is required',
                  validate: (value) => {
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
                {...register('tags', {
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
                {...register('warranty', { required: 'Warranty is required' })}
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
                {...register('slug', {
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
                {...register('brand', {
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
              <CustomSpecifications control={control} register={register} />
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
          </div>
        </div>
      </div>
    </form>
  );
};

export default Page;
