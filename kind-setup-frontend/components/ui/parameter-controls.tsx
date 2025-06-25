"use client";

import React from 'react';
import type { ParameterDefinition } from './dynamic-form';

interface ParameterControlProps {
  parameter: ParameterDefinition;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  error?: string;
}

export function ParameterControl({ parameter, value, onChange, disabled = false, error }: ParameterControlProps) {
  const baseInputClasses = `
    w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
    ${error ? 'border-red-500' : 'border-gray-300'}
  `;

  const renderTextInput = () => (
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={baseInputClasses}
      placeholder={parameter.default?.toString() || ''}
    />
  );

  const renderPasswordInput = () => (
    <input
      type="password"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={baseInputClasses}
      placeholder={parameter.default?.toString() || ''}
    />
  );

  const renderTextareaInput = () => (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`${baseInputClasses} min-h-[100px] resize-vertical`}
      placeholder={parameter.default?.toString() || ''}
      rows={4}
    />
  );

  const renderNumberInput = () => (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => {
        const numValue = e.target.value === '' ? undefined : Number(e.target.value);
        onChange(numValue);
      }}
      disabled={disabled}
      className={baseInputClasses}
      min={parameter.validation?.min}
      max={parameter.validation?.max}
      placeholder={parameter.default?.toString() || ''}
    />
  );

  const renderSliderInput = () => {
    const min = parameter.validation?.min ?? 0;
    const max = parameter.validation?.max ?? 100;
    const currentValue = value ?? parameter.default ?? min;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Min: {min}</span>
          <span className="text-sm font-medium">{currentValue}</span>
          <span className="text-sm text-gray-600">Max: {max}</span>
        </div>
        <input
          type="range"
          value={currentValue}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          min={min}
          max={max}
          step={1}
        />
        <style jsx>{`
          .slider::-webkit-slider-thumb {
            appearance: none;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          .slider::-moz-range-thumb {
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
        `}</style>
      </div>
    );
  };

  const renderCheckboxInput = () => (
    <label className="flex items-center space-x-2 cursor-pointer">
      <input
        type="checkbox"
        checked={value ?? parameter.default ?? false}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      />
      <span className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
        {parameter.label}
      </span>
    </label>
  );

  const renderSelectInput = () => {
    const options = parameter.validation?.options || [];
    
    return (
      <select
        value={value ?? parameter.default ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={baseInputClasses}
      >
        <option value="">Select an option...</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  };

  const renderMultiselectInput = () => {
    const options = parameter.validation?.options || [];
    const selectedValues = Array.isArray(value) ? value : [];

    const toggleOption = (option: string) => {
      const newValues = selectedValues.includes(option)
        ? selectedValues.filter(v => v !== option)
        : [...selectedValues, option];
      onChange(newValues);
    };

    return (
      <div className="space-y-2">
        <div className={`border rounded-md p-2 ${error ? 'border-red-500' : 'border-gray-300'} ${
          disabled ? 'bg-gray-100' : 'bg-white'
        }`}>
          {options.length === 0 ? (
            <p className="text-gray-500 text-sm">No options available</p>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {options.map((option) => (
                <label key={option} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option)}
                    onChange={() => toggleOption(option)}
                    disabled={disabled}
                    className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  />
                  <span className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
                    {option}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
        {selectedValues.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedValues.map((selectedValue) => (
              <span
                key={selectedValue}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {selectedValue}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => toggleOption(selectedValue)}
                    className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600 focus:outline-none"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderFileInput = () => (
    <input
      type="file"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            onChange(event.target?.result);
          };
          reader.readAsText(file);
        }
      }}
      disabled={disabled}
      className={`${baseInputClasses} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`}
    />
  );

  // Render the appropriate control based on ui_control type
  switch (parameter.ui_control) {
    case 'textarea':
      return renderTextareaInput();
    case 'number':
      return renderNumberInput();
    case 'slider':
      return renderSliderInput();
    case 'checkbox':
      return renderCheckboxInput();
    case 'select':
      return renderSelectInput();
    case 'multiselect':
      return renderMultiselectInput();
    case 'file':
      return renderFileInput();
    case 'password':
      return renderPasswordInput();
    case 'text':
    default:
      return renderTextInput();
  }
}
