// packages/components/custom-properties/index.tsx
'use client';

import { Plus, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import Input from '../input';

export type CustomProperty = {
  label: string;
  values: string[];
};

type CustomPropertiesProps = {
  value?: CustomProperty[];
  onChange: (properties: CustomProperty[]) => void;
  label?: string;
  maxProperties?: number;
  maxValues?: number;
};

type PropertyCardProps = {
  property: CustomProperty;
  maxValues: number;
  onAddValue: (value: string) => void;
  onRemoveValue: (value: string) => void;
  onRemove: () => void;
};

const PropertyCard = ({
  property,
  maxValues,
  onAddValue,
  onRemoveValue,
  onRemove,
}: PropertyCardProps) => {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddValue(trimmed);
    setDraft('');
  };

  return (
    <div className="border border-gray-600 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{property.label}</span>
        <button
          type="button"
          aria-label={`Remove property ${property.label}`}
          onClick={onRemove}
          className="p-1 rounded text-red-400 hover:bg-white/10"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Value chips */}
      <div className="flex flex-wrap gap-2 mb-2">
        {property.values.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1 px-2 py-1 text-sm rounded-full bg-white/10"
          >
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={() => onRemoveValue(v)}
              className="hover:text-red-400"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {property.values.length === 0 && (
          <span className="text-xs opacity-60">No values yet</span>
        )}
      </div>

      {/* Add value */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            placeholder="Add a value and press Enter"
            value={draft}
            maxLength={50}
            disabled={property.values.length >= maxValues}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setDraft(e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault(); // stop the form from submitting
                commit();
              }
            }}
          />
        </div>
        <button
          type="button"
          onClick={commit}
          disabled={property.values.length >= maxValues}
          className="px-3 py-1.5 text-sm rounded border border-gray-500 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
    </div>
  );
};

const CustomProperties = ({
  value = [],
  onChange,
  label = 'Custom Properties',
  maxProperties = 10,
  maxValues = 10,
}: CustomPropertiesProps) => {
  const [newLabel, setNewLabel] = useState('');
  const [error, setError] = useState('');

  const addProperty = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) {
      setError('Property name is required');
      return;
    }
    if (value.some((p) => p.label.toLowerCase() === trimmed.toLowerCase())) {
      setError('This property already exists');
      return;
    }
    onChange([...value, { label: trimmed, values: [] }]);
    setNewLabel('');
    setError('');
  };

  const addValue = (index: number, newValue: string) => {
    const property = value[index];
    if (
      property.values.some((v) => v.toLowerCase() === newValue.toLowerCase())
    ) {
      return; // ignore duplicates
    }
    onChange(
      value.map((p, i) =>
        i === index ? { ...p, values: [...p.values, newValue] } : p
      )
    );
  };

  const removeValue = (index: number, removed: string) => {
    onChange(
      value.map((p, i) =>
        i === index ? { ...p, values: p.values.filter((v) => v !== removed) } : p
      )
    );
  };

  const removeProperty = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full">
      <label className="block mb-2">{label}</label>

      <div className="flex flex-col gap-3">
        {value.map((property, index) => (
          <PropertyCard
            key={property.label}
            property={property}
            maxValues={maxValues}
            onAddValue={(v) => addValue(index, v)}
            onRemoveValue={(v) => removeValue(index, v)}
            onRemove={() => removeProperty(index)}
          />
        ))}
      </div>

      {/* Add property */}
      {value.length < maxProperties && (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                placeholder="New property (e.g. Size, Material)"
                value={newLabel}
                maxLength={30}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setNewLabel(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addProperty();
                  }
                }}
              />
            </div>
            <button
              type="button"
              onClick={addProperty}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-gray-500 hover:bg-white/10"
            >
              <Plus size={14} /> Add property
            </button>
          </div>
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default CustomProperties;