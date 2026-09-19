import { Pencil, WandSparkles, X } from 'lucide-react';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';

const ImagePlaceHolder = ({
  size,
  small,
  onImageChange,
  onRemove,
  defaultImage = null,
  file = null,
  index = 0,
  setOpenImageModal,
}: {
  size: string;
  small?: boolean;
  onImageChange: (file: File | null, index: number) => void;
  onRemove?: (index: number) => void;
  defaultImage?: string | null;
  file?: File | null;
  index?: number;
  setOpenImageModal: (openImageModal: boolean) => void;
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(defaultImage);

  // Derive the preview from the file prop so it stays in sync when slots shift
  useEffect(() => {
    if (!file) {
      setImagePreview(defaultImage);
      return;
    }
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, defaultImage]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) {
      onImageChange(selected, index);
    }
    event.target.value = ''; // allow re-selecting the same file
  };

  return (
    <div
      className={`relative ${
        small ? 'h-[180px]' : 'h-[450px]'
      } w-full cursor-pointer bg-[#1e1e1e] border border-green-600 rounded-lg flex flex-col justify-center items-center`}
    >
      <input
        type="file"
        accept="image/*"
        id={`image-upload-${index}`}
        className="hidden"
        onChange={handleFileChange}
      />

      {imagePreview ? (
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
            onClick={() => setOpenImageModal(true)}
            className="absolute p-2 rounded top-3 right-[70px] bg-blue-500 shadow-lg cursor-pointer z-10"
          >
            <WandSparkles size={16} />
          </button>
        </>
      ) : (
        <label
          htmlFor={`image-upload-${index}`}
          className="absolute top-3 right-3 p-2 !rounded bg-slate-700 shadow-lg cursor-pointer"
        >
          <Pencil size={16} />
        </label>
      )}

      {imagePreview ? (
        <Image
          width={400}
          height={300}
          src={imagePreview}
          alt="uploaded"
          unoptimized
          className="w-full h-full object-cover rounded-lg"
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