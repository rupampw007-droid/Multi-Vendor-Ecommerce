'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

const CODE_PATTERN = /^[A-Z0-9_-]{3,20}$/;

interface DiscountCodeInputProps {
  label?: string;
  value: string[];
  onChange: (value: string[]) => void;
  maxCodes?: number;
}

const DiscountCodeInput = ({
  label = 'Discount Codes',
  value = [],
  onChange,
  maxCodes = 5,
}: DiscountCodeInputProps) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const addCode = () => {
    const code = input.trim().toUpperCase();
    if (!code) return;

    if (!CODE_PATTERN.test(code)) {
      setError('3-20 characters: letters, numbers, hyphens or underscores');
      return;
    }
    if (value.includes(code)) {
      setError('This code is already added');
      return;
    }
    if (value.length >= maxCodes) {
      setError(`You can add up to ${maxCodes} codes`);
      return;
    }

    onChange([...value, code]);
    setInput('');
    setError('');
  };

  const removeCode = (code: string) => {
    onChange(value.filter((c) => c !== code));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault(); // stops Enter from submitting the form
      addCode();
    }
  };

  return (
    <div className="w-full">
      <label className="block mb-1">{label}</label>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (error) setError('');
          }}
          onKeyDown={handleKeyDown}
          placeholder="SUMMER25"
          className="flex-1 border outline-none border-gray-700 bg-transparent p-2 rounded-md uppercase"
        />
        <button
          type="button"
          onClick={addCode}
          className="px-4 rounded-md bg-[#80deea] text-black font-semibold hover:opacity-90"
        >
          Add
        </button>
      </div>

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((code) => (
            <span
              key={code}
              className="flex items-center gap-1 px-3 py-1 rounded-full border border-gray-700 text-sm"
            >
              {code}
              <button
                type="button"
                onClick={() => removeCode(code)}
                aria-label={`Remove ${code}`}
                className="opacity-70 hover:opacity-100"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscountCodeInput;