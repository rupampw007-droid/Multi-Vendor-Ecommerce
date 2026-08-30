import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import React from 'react'
import { useForm } from 'react-hook-form';
import {shopCategories} from '@/utils/categories'

type CreateShopFormValues = {
    name: string;
    bio: string;
    openingHours: string;
    website?: string;
    category: string;
};

const WEBSITE_REGEX = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i;

const CreateShop = ({
    sellerId,
    setActiveStep
}: {
    sellerId: string,
    setActiveStep: (step: number) => void
}) => {
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors }
    } = useForm<CreateShopFormValues>();

    const bioValue = watch("bio") || "";
    const bioWordCount = bioValue.trim() === "" ? 0 : bioValue.trim().split(/\s+/).length;

    const countWords = (text: string) => text.trim() === "" ? 0 : text.trim().split(/\s+/).length

    const shopCreateMutation = useMutation({
        mutationFn: async (data: CreateShopFormValues & { sellerId: string }) => {
            const response = await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URI}/api/create-shop`, data)
            return response.data
        },
        onSuccess: () => {
            setActiveStep(3)
        }
    })

    const onSubmit = async (data: CreateShopFormValues) => {
        const shopData = {
            ...data, sellerId
        }
        shopCreateMutation.mutate(shopData)
    }

    return (
        <div className="w-full max-w-xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    Setup new Shop
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    Tell customers a bit about your shop before you start selling.
                </p>

                {/* Name */}
                <div className="flex flex-col gap-1">
                    <label htmlFor="name" className="text-sm font-medium text-gray-700">
                        Name
                    </label>
                    <input
                        id="name"
                        type="text"
                        placeholder="shop name"
                        className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.name ? "border-red-400" : "border-gray-300"
                        }`}
                        {...register("name", {
                            required: "Name is required",
                        })}
                    />
                    {errors.name && (
                        <p className="text-xs text-red-500">{String(errors.name.message)}</p>
                    )}
                </div>

                {/* Bio */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <label htmlFor="bio" className="text-sm font-medium text-gray-700">
                            Bio (Maximum 100 words)
                        </label>
                        <span className={`text-xs ${bioWordCount > 100 ? "text-red-500" : "text-gray-400"}`}>
                            {bioWordCount}/100
                        </span>
                    </div>
                    <textarea
                        id="bio"
                        rows={4}
                        placeholder="Tell us about your shop..."
                        className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.bio ? "border-red-400" : "border-gray-300"
                        }`}
                        {...register("bio", {
                            required: "Bio is required",
                            validate: (value) =>
                                countWords(value) <= 100 || "Bio cannot exceed 100 words",
                        })}
                    />
                    {errors.bio && (
                        <p className="text-xs text-red-500">{String(errors.bio.message)}</p>
                    )}
                </div>

                {/* Opening hours */}
                <div className="flex flex-col gap-1">
                    <label htmlFor="openingHours" className="text-sm font-medium text-gray-700">
                        Opening Hours
                    </label>
                    <input
                        id="openingHours"
                        type="text"
                        placeholder="e.g. Mon-Sat, 9:00 AM - 8:00 PM"
                        className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.openingHours ? "border-red-400" : "border-gray-300"
                        }`}
                        {...register("openingHours", {
                            required: "Opening hours are required",
                        })}
                    />
                    {errors.openingHours && (
                        <p className="text-xs text-red-500">{String(errors.openingHours.message)}</p>
                    )}
                </div>

                {/* Website */}
                <div className="flex flex-col gap-1">
                    <label htmlFor="website" className="text-sm font-medium text-gray-700">
                        Website <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                        id="website"
                        type="text"
                        placeholder="https://yourshop.com"
                        className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.website ? "border-red-400" : "border-gray-300"
                        }`}
                        {...register("website", {
                            pattern: {
                                value: WEBSITE_REGEX,
                                message: "Enter a valid website URL",
                            },
                        })}
                    />
                    {errors.website && (
                        <p className="text-xs text-red-500">{String(errors.website.message)}</p>
                    )}
                </div>

                {/* Category */}
                <div className="flex flex-col gap-1">
                    <label htmlFor="category" className="text-sm font-medium text-gray-700">
                        Category
                    </label>
                    <select
                        id="category"
                        defaultValue=""
                        className={`w-full rounded-md border px-3 py-2 text-sm bg-white outline-none transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.category ? "border-red-400" : "border-gray-300"
                        }`}
                        {...register("category", {
                            required: "Please select a category",
                        })}
                    >
                        <option value="" disabled>
                            Select a category
                        </option>
                        {shopCategories.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                                {cat.label}
                            </option>
                        ))}
                    </select>
                    {errors.category && (
                        <p className="text-xs text-red-500">{String(errors.category.message)}</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={shopCreateMutation.isPending}
                    className="w-full mt-2 rounded-md bg-blue-600 text-white text-sm font-medium py-2.5 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                    {shopCreateMutation.isPending ? "Creating..." : "Create"}
                </button>

                {shopCreateMutation.isError && (
                    <p className="text-xs text-red-500 text-center">
                        Something went wrong. Please try again.
                    </p>
                )}
            </form>
        </div>
    )
}

export default CreateShop