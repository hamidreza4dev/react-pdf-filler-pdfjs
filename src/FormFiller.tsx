import React, { useState } from 'react';
import { InputObj } from './types';

interface FormFillerProps {
  inputs: InputObj[];
  onSubmit: (formData: Record<string, string>) => void;
}

export default function FormFiller({ inputs, onSubmit }: FormFillerProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (dataId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [dataId]: value,
    }));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white p-6 rounded-lg shadow"
    >
      <div className="space-y-4">
        {inputs.map(input => (
          <div key={input.dataId} className="flex flex-col">
            <label
              htmlFor={input.dataId}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {input.ariaLabel || input.dataId}
            </label>
            {input.name === 'select' ? (
              <select
                id={input.dataId}
                value={formData[input.dataId] || ''}
                onChange={e => handleInputChange(input.dataId, e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Select an option</option>
                {input.options?.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                id={input.dataId}
                value={formData[input.dataId] || ''}
                onChange={e => handleInputChange(input.dataId, e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Fill and Download PDF
        </button>
      </div>
    </form>
  );
}
