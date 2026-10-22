import ProductDetails from '@/shared/components/cards/product-details';
import axiosInstance from '@/utils/axiosInstance'
import { Metadata } from 'next';
import React from 'react'

async function fetchProductDetails(slug: string) {
    const response = await axiosInstance.get(`/product/api/get-product/${slug}`);
    return response.data.product
}

export async function generateMetadata({
    params
} : {
    params: Promise<{ slug: string }>
}) : Promise<Metadata>  {
    const { slug } = await params
    const product = await fetchProductDetails(slug)

    return {
        title: `${product?.title} | Rupam Marketplace`,
        description: 
            product?.short_description ||
            "Discover high-quality products on Rupam Marketplace",
            openGraph: {
                title: product?.title,
                description: product?.short_description || "",
                images: [product?.images?.[0]?.url  || '/default-image.jpg'],
                type: 'website'
            },
            twitter: {
                card: 'summary_large_image',
                title: product?.title,
                description: product?.short_description || "",
                images: [product?.images?.[0]?.url  || '/default-image.jpg'],
            }
    }
}

const page = async ({params} : {params: Promise<{slug: string}>}) => {
    const { slug } = await params
    const product = await fetchProductDetails(slug)
  return (
    <div>
        <ProductDetails data={product} />
    </div>
  )
}

export default page