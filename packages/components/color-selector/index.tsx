// packages/components/color-selector/index.tsx
'use client';

import { Check, Plus, X } from 'lucide-react';
import React, { useState } from 'react';

const DEFAULT_COLORS = [
  '#000000',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#6b7280',
];

type ColorSelectorProps = {
  value?: string[];
  onChange: (colors: string[]) => void;
  label?: string;
  presetColors?: string[];
  maxColors?: number;
};

const ColorSelector = ({
  value = [],
  onChange,
  label = 'Colors',
  presetColors = DEFAULT_COLORS,
  maxColors = 10,
}: ColorSelectorProps) => {
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [picker, setPicker] = useState('#3b82f6');

  // Presets + colors added by the user + any selected value not in the lists
  const options = Array.from(
    new Set([...presetColors, ...customColors, ...value])
  );

  const isSelected = (color: string) => value.includes(color);

  const toggleColor = (color: string) => {
    if (isSelected(color)) {
      onChange(value.filter((c) => c !== color));
    } else if (value.length < maxColors) {
      onChange([...value, color]);
    }
  };

  const addCustomColor = () => {
    const color = picker.toLowerCase();
    if (!options.includes(color)) {
      setCustomColors([...customColors, color]);
    }
    if (!isSelected(color) && value.length < maxColors) {
      onChange([...value, color]);
    }
  };

  const removeCustomColor = (color: string) => {
    setCustomColors(customColors.filter((c) => c !== color));
    onChange(value.filter((c) => c !== color));
  };

  return (
    <div className="w-full">
      <label className="block mb-1">{label}</label>

      {/* Swatches */}
      <div className="flex flex-wrap gap-2">
        {options.map((color) => {
          const isCustom = customColors.includes(color);
          const selected = isSelected(color);
          return (
            <div key={color} className="relative">
              <button
                type="button"
                title={color}
                aria-label={`${selected ? 'Deselect' : 'Select'} ${color}`}
                aria-pressed={selected}
                onClick={() => toggleColor(color)}
                style={{ backgroundColor: color }}
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition ${
                  selected
                    ? 'border-white ring-2 ring-[#80deea]'
                    : 'border-gray-500 hover:scale-110'
                }`}
              >
                {selected && (
                  <Check
                    size={16}
                    className={
                      color === '#ffffff' ? 'text-black' : 'text-white'
                    }
                  />
                )}
              </button>
              {isCustom && (
                <button
                  type="button"
                  aria-label={`Remove ${color}`}
                  onClick={() => removeCustomColor(color)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom color picker */}
      <div className="flex items-center gap-2 mt-3">
        <input
          type="color"
          value={picker}
          onChange={(e) => setPicker(e.target.value)}
          className="w-9 h-9 p-0 bg-transparent border border-gray-500 rounded cursor-pointer"
          aria-label="Pick a custom color"
        />
        <button
          type="button"
          onClick={addCustomColor}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-gray-500 hover:bg-white/10"
        >
          <Plus size={14} /> Add color
        </button>
        <span className="text-xs opacity-70">
          {value.length}/{maxColors} selected
        </span>
      </div>
    </div>
  );
};

export default ColorSelector;