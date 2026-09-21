'use client';

import React from 'react';

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

interface SizeSelectorProps {
  label?: string;
  value: string[];
  onChange: (value: string[]) => void;
  sizes?: string[];
}

const SizeSelector = ({
  label = 'Sizes',
  value = [],
  onChange,
  sizes = DEFAULT_SIZES,
}: SizeSelectorProps) => {
  const toggleSize = (size: string) => {
    onChange(
      value.includes(size) ? value.filter((s) => s !== size) : [...value, size]
    );
  };

  return (
    <div className="w-full">
      <label className="block mb-1">{label}</label>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const isSelected = value.includes(size);
          return (
            <button
              key={size}
              type="button"
              onClick={() => toggleSize(size)}
              aria-pressed={isSelected}
              className={`min-w-[44px] px-3 py-1.5 rounded-md border text-sm transition-colors ${
                isSelected
                  ? 'bg-[#80deea] border-[#80deea] text-black font-semibold'
                  : 'border-gray-700 text-white hover:border-gray-500'
              }`}
            >
              {size}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SizeSelector;