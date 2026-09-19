// packages/components/custom-specifications/index.tsx
'use client';

import { Plus, Trash2 } from 'lucide-react';
import React from 'react';
import {
  Control,
  UseFormRegister,
  get,
  useFieldArray,
  useFormState,
} from 'react-hook-form';
import Input from '../input';

type CustomSpecificationsProps = {
  control: Control<any>;
  register: UseFormRegister<any>;
  name?: string;
  label?: string;
  maxSpecs?: number;
};

const CustomSpecifications = ({
  control,
  register,
  name = 'custom_specifications',
  label = 'Custom Specifications',
  maxSpecs = 20,
}: CustomSpecificationsProps) => {
  const { fields, append, remove } = useFieldArray({ control, name });
  const { errors } = useFormState({ control, name });

  return (
    <div className="w-full">
      <label className="block mb-2">{label}</label>

      <div className="flex flex-col gap-3">
        {fields.map((field, index) => {
          const nameError = get(errors, `${name}.${index}.name.message`);
          const valueError = get(errors, `${name}.${index}.value.message`);

          return (
            <div key={field.id} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Specification name (e.g. Battery Life)"
                  {...register(`${name}.${index}.name`, {
                    required: 'Name is required',
                    maxLength: { value: 50, message: 'Max 50 characters' },
                  })}
                />
                {nameError && (
                  <p className="text-red-500 text-xs mt-1">
                    {nameError as string}
                  </p>
                )}
              </div>

              <div className="flex-1">
                <Input
                  placeholder="Value (e.g. 40 hours)"
                  {...register(`${name}.${index}.value`, {
                    required: 'Value is required',
                    maxLength: { value: 100, message: 'Max 100 characters' },
                  })}
                />
                {valueError && (
                  <p className="text-red-500 text-xs mt-1">
                    {valueError as string}
                  </p>
                )}
              </div>

              <button
                type="button"
                aria-label="Remove specification"
                onClick={() => remove(index)}
                className="mt-1 p-2 rounded text-red-400 hover:bg-white/10"
              >
                <Trash2 size={18} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => append({ name: '', value: '' })}
        disabled={fields.length >= maxSpecs}
        className="mt-3 flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-gray-500 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus size={14} /> Add specification
      </button>
    </div>
  );
};

export default CustomSpecifications;