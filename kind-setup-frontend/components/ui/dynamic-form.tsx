"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Info, AlertCircle } from 'lucide-react';
import { ParameterControl } from './parameter-controls';

// Type definitions for template parameters
export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';
  ui_control: 'text' | 'textarea' | 'number' | 'slider' | 'checkbox' | 'select' | 'multiselect' | 'file' | 'password';
  label: string;
  description?: string;
  default?: any;
  required?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
    custom_validator?: string;
    min_items?: number;
    max_items?: number;
  };
  dependencies?: {
    show_when?: Record<string, any>;
    required_when?: Record<string, any>;
    disabled_when?: Record<string, any>;
  };
  group?: string;
}

export interface ParameterGroup {
  label: string;
  description?: string;
  order: number;
  collapsible?: boolean;
  collapsed?: boolean;
}

export interface TemplateMetadata {
  display_name: string;
  description: string;
  version: string;
  parameters: Record<string, ParameterDefinition>;
  parameter_groups?: Record<string, ParameterGroup>;
}

interface DynamicFormProps {
  template: TemplateMetadata;
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onValidationChange?: (isValid: boolean, errors: Record<string, string>) => void;
}

export function DynamicForm({ template, values, onChange, onValidationChange }: DynamicFormProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize collapsed state for groups
  useEffect(() => {
    if (template.parameter_groups) {
      const initialCollapsed: Record<string, boolean> = {};
      Object.entries(template.parameter_groups).forEach(([groupId, group]) => {
        initialCollapsed[groupId] = group.collapsed ?? false;
      });
      setCollapsedGroups(initialCollapsed);
    }
  }, [template.parameter_groups]);

  // Validate parameters
  useEffect(() => {
    const errors: Record<string, string> = {};

    Object.entries(template.parameters).forEach(([paramId, param]) => {
      const value = values[paramId];

      // Check if parameter should be shown
      if (!shouldShowParameter(paramId, param, values)) {
        return;
      }

      // Required validation
      const isRequired = param.required || shouldRequireParameter(paramId, param, values);
      if (isRequired && (value === undefined || value === null || value === '')) {
        errors[paramId] = `${param.label} is required`;
        return;
      }

      // Skip validation if value is empty and not required
      if (value === undefined || value === null || value === '') {
        return;
      }

      // Type-specific validation
      if (param.type === 'string' && typeof value === 'string') {
        if (param.validation?.min && value.length < param.validation.min) {
          errors[paramId] = `${param.label} must be at least ${param.validation.min} characters`;
        }
        if (param.validation?.max && value.length > param.validation.max) {
          errors[paramId] = `${param.label} must be at most ${param.validation.max} characters`;
        }
        if (param.validation?.pattern && !new RegExp(param.validation.pattern).test(value)) {
          errors[paramId] = `${param.label} format is invalid`;
        }
      }

      if (param.type === 'number' && typeof value === 'number') {
        if (param.validation?.min && value < param.validation.min) {
          errors[paramId] = `${param.label} must be at least ${param.validation.min}`;
        }
        if (param.validation?.max && value > param.validation.max) {
          errors[paramId] = `${param.label} must be at most ${param.validation.max}`;
        }
      }

      if (param.type === 'enum' && param.validation?.options) {
        if (!param.validation.options.includes(value)) {
          errors[paramId] = `${param.label} must be one of: ${param.validation.options.join(', ')}`;
        }
      }
    });

    setValidationErrors(errors);
  }, [template.parameters, values]);

  // Notify parent of validation changes
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(Object.keys(validationErrors).length === 0, validationErrors);
    }
  }, [validationErrors]);

  const shouldShowParameter = (paramId: string, param: ParameterDefinition, currentValues: Record<string, any>): boolean => {
    if (!param.dependencies?.show_when) return true;
    
    return Object.entries(param.dependencies.show_when).every(([depParam, depValue]) => {
      const currentValue = currentValues[depParam];
      if (Array.isArray(depValue)) {
        return depValue.includes(currentValue);
      }
      return currentValue === depValue;
    });
  };

  const shouldRequireParameter = (paramId: string, param: ParameterDefinition, currentValues: Record<string, any>): boolean => {
    if (!param.dependencies?.required_when) return false;
    
    return Object.entries(param.dependencies.required_when).every(([depParam, depValue]) => {
      const currentValue = currentValues[depParam];
      if (Array.isArray(depValue)) {
        return depValue.includes(currentValue);
      }
      return currentValue === depValue;
    });
  };

  const shouldDisableParameter = (paramId: string, param: ParameterDefinition, currentValues: Record<string, any>): boolean => {
    if (!param.dependencies?.disabled_when) return false;
    
    return Object.entries(param.dependencies.disabled_when).every(([depParam, depValue]) => {
      const currentValue = currentValues[depParam];
      if (Array.isArray(depValue)) {
        return depValue.includes(currentValue);
      }
      return currentValue === depValue;
    });
  };

  const handleParameterChange = (paramId: string, value: any) => {
    const newValues = { ...values, [paramId]: value };
    onChange(newValues);
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Group parameters by their group property
  const groupedParameters = React.useMemo(() => {
    const groups: Record<string, string[]> = {};
    const ungrouped: string[] = [];
    
    Object.entries(template.parameters).forEach(([paramId, param]) => {
      if (param.group) {
        if (!groups[param.group]) {
          groups[param.group] = [];
        }
        groups[param.group].push(paramId);
      } else {
        ungrouped.push(paramId);
      }
    });
    
    return { groups, ungrouped };
  }, [template.parameters]);

  // Sort groups by order
  const sortedGroups = React.useMemo(() => {
    if (!template.parameter_groups) return Object.keys(groupedParameters.groups);
    
    return Object.keys(groupedParameters.groups).sort((a, b) => {
      const orderA = template.parameter_groups?.[a]?.order ?? 999;
      const orderB = template.parameter_groups?.[b]?.order ?? 999;
      return orderA - orderB;
    });
  }, [template.parameter_groups, groupedParameters.groups]);

  const renderParameter = (paramId: string, param: ParameterDefinition) => {
    if (!shouldShowParameter(paramId, param, values)) {
      return null;
    }

    const isDisabled = shouldDisableParameter(paramId, param, values);
    const isRequired = param.required || shouldRequireParameter(paramId, param, values);
    const error = validationErrors[paramId];

    return (
      <div key={paramId} className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">
            {param.label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          {param.description && (
            <div className="group relative">
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                {param.description}
              </div>
            </div>
          )}
        </div>
        
        <ParameterControl
          parameter={param}
          value={values[paramId]}
          onChange={(value) => handleParameterChange(paramId, value)}
          disabled={isDisabled}
          error={error}
        />
        
        {error && (
          <div className="flex items-center gap-1 text-red-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Ungrouped parameters */}
      {groupedParameters.ungrouped.length > 0 && (
        <div className="space-y-4">
          {groupedParameters.ungrouped.map(paramId => 
            renderParameter(paramId, template.parameters[paramId])
          )}
        </div>
      )}

      {/* Grouped parameters */}
      {sortedGroups.map(groupId => {
        const group = template.parameter_groups?.[groupId];
        const isCollapsed = collapsedGroups[groupId];
        const groupParams = groupedParameters.groups[groupId] || [];
        
        if (groupParams.length === 0) return null;

        return (
          <div key={groupId} className="border border-gray-200 rounded-lg">
            <div
              className={`px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer flex items-center justify-between ${
                group?.collapsible !== false ? 'hover:bg-gray-100' : ''
              }`}
              onClick={() => group?.collapsible !== false && toggleGroup(groupId)}
            >
              <div>
                <h3 className="text-lg font-medium text-gray-900">{group?.label || groupId}</h3>
                {group?.description && (
                  <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                )}
              </div>
              {group?.collapsible !== false && (
                <div className="ml-2">
                  {isCollapsed ? (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              )}
            </div>
            
            {(!isCollapsed || group?.collapsible === false) && (
              <div className="p-4 space-y-4">
                {groupParams.map(paramId => 
                  renderParameter(paramId, template.parameters[paramId])
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
