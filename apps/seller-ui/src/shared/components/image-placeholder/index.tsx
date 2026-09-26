'use client';

import { Loader2, Pencil, WandSparkles, X } from 'lucide-react';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';

interface ImagePlaceHolderProps {
  size: string;
  small?: boolean;
  onImageChange: (file: File, index: number) => void;
  onRemove?: (index: number) => void;
  defaultImage?: string | null;
  file?: string | null; // the uploaded image's URL, or null if this slot is empty
  index?: number;
  isUploading?: boolean;
  setOpenImageModal: (openImageModal: boolean) => void;
  onEnhanceClick?: (index: number) => void;
}

const ImagePlaceHolder = ({
  size,
  small,
  onImageChange,
  onRemove,
  defaultImage = null,
  file = null,
  index = 0,
  isUploading = false,
  setOpenImageModal,
  onEnhanceClick,
}: ImagePlaceHolderProps) => {
  // Local object-URL preview shown instantly while the real upload is in
  // flight; cleared once the real `file_url` comes back from the parent.
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    if (file && localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
   
  }, [file]);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const imagePreview = file || defaultImage || localPreview;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) {
      setLocalPreview(URL.createObjectURL(selected));
      onImageChange(selected, index);
    }
    event.target.value = ''; // allow re-selecting the same file
  };

  const handleEnhanceClick = () => {
    onEnhanceClick?.(index);
    setOpenImageModal(true);
  };

  return (
    <div
      className={`relative ${
        small ? 'h-[180px]' : 'h-[450px]'
      } w-full cursor-pointer bg-[#1e1e1e] border border-green-600 rounded-lg flex flex-col justify-center items-center overflow-hidden`}
    >
      <input
        type="file"
        accept="image/*"
        id={`image-upload-${index}`}
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {imagePreview && !isUploading && (
        <>
          <button
            type="button"
            onClick={() => onRemove?.(index)}
            className="absolute top-3 right-3 p-2 !rounded bg-red-600 shadow-lg z-10"
          >
            <X size={16} />
          </button>
          <button
            type="button"
            onClick={handleEnhanceClick}
            className="absolute p-2 rounded top-3 right-[70px] bg-blue-500 shadow-lg cursor-pointer z-10"
          >
            <WandSparkles size={16} />
          </button>
        </>
      )}

      {!imagePreview && !isUploading && (
        <label
          htmlFor={`image-upload-${index}`}
          className="absolute top-3 right-3 p-2 !rounded bg-slate-700 shadow-lg cursor-pointer z-10"
        >
          <Pencil size={16} />
        </label>
      )}

      {isUploading ? (
        <div className="flex flex-col items-center gap-2 text-gray-300">
          <Loader2 className="animate-spin" size={small ? 24 : 36} />
          <p className={small ? 'text-xs' : 'text-sm'}>Uploading...</p>
        </div>
      ) : imagePreview ? (
        <Image
          src={imagePreview}
          alt="uploaded"
          fill
          unoptimized
          className="object-cover rounded-lg"
        />
      ) : (
        <>
          <p
            className={`text-gray-400 ${
              small ? 'text-xl' : 'text-4xl'
            } font-semibold`}
          >
            {size}
          </p>
          <p
            className={`text-gray-500 ${
              small ? 'text-sm' : 'text-lg'
            } pt-2 text-center`}
          ></p>
        </>
      )}
    </div>
  );
};

export default ImagePlaceHolder;