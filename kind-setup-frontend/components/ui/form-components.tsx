'use client';
'use client';

import React from 'react';
import { ChevronDown, Check, AlertCircle, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { cn } from '@/lib/utils';

interface FormLabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

export function FormLabel({
  htmlFor,
  children,
  required = false,
  className = '',
}: FormLabelProps) {
  return (
    <Label htmlFor={htmlFor} className={cn('mb-1.5', className)}>
      {children}
      {required && <span className='text-destructive ml-1'>*</span>}
    </Label>
  );
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  hint?: string;
  className?: string;
  wrapperClassName?: string;
}

export function FormInput({
  error,
  hint,
  className = '',
  wrapperClassName = '',
  ...props
}: FormInputProps) {
  return (
    <div className={cn('w-full', wrapperClassName)}>
      <Input
        className={cn(
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        {...props}
      />
      {hint && !error && (
        <p className='mt-1.5 text-xs text-muted-foreground'>{hint}</p>
      )}
      {error && (
        <p className='mt-1.5 text-xs text-destructive flex items-center'>
          <AlertCircle className='w-3 h-3 mr-1' />
          {error}
        </p>
      )}
    </div>
  );
}

// New component using react-hook-form and zod validation
export interface ValidatedFormInputProps<T extends z.ZodType> {
  form: ReturnType<typeof useForm<z.infer<T>>>;
  name: string;
  label: string;
  placeholder?: string;
  description?: string;
  type?: string;
  required?: boolean;
  className?: string;
}

export function ValidatedFormInput<T extends z.ZodType>({
  form,
  name,
  label,
  placeholder,
  description,
  type = 'text',
  required = false,
  className,
}: ValidatedFormInputProps<T>) {
  return (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className='text-destructive ml-1'>*</span>}
          </FormLabel>
          <FormControl>
            <Input type={type} placeholder={placeholder} {...field} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface FormTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  hint?: string;
  className?: string;
  wrapperClassName?: string;
}

export function FormTextarea({
  error,
  hint,
  className = '',
  wrapperClassName = '',
  ...props
}: FormTextareaProps) {
  return (
    <div className={cn('w-full', wrapperClassName)}>
      <Textarea
        className={cn(
          'min-h-[100px]',
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        {...props}
      />
      {hint && !error && (
        <p className='mt-1.5 text-xs text-muted-foreground'>{hint}</p>
      )}
      {error && (
        <p className='mt-1.5 text-xs text-destructive flex items-center'>
          <AlertCircle className='w-3 h-3 mr-1' />
          {error}
        </p>
      )}
    </div>
  );
}

// New component using react-hook-form and zod validation
export interface ValidatedFormTextareaProps<T extends z.ZodType> {
  form: ReturnType<typeof useForm<z.infer<T>>>;
  name: string;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  className?: string;
}

export function ValidatedFormTextarea<T extends z.ZodType>({
  form,
  name,
  label,
  placeholder,
  description,
  required = false,
  className,
}: ValidatedFormTextareaProps<T>) {
  return (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className='text-destructive ml-1'>*</span>}
          </FormLabel>
          <FormControl>
            <Textarea
              placeholder={placeholder}
              className='min-h-[100px]'
              {...field}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface FormSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface FormSelectProps {
  options: FormSelectOption[];
  error?: string;
  hint?: string;
  className?: string;
  wrapperClassName?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  value?: string;
  disabled?: boolean;
  id?: string;
}

export function FormSelect({
  options,
  error,
  hint,
  className = '',
  wrapperClassName = '',
  onChange,
  placeholder,
  value,
  disabled,
  id,
  ...props
}: FormSelectProps) {
  const handleChange = (newValue: string) => {
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div className={cn('w-full', wrapperClassName)}>
      <Select value={value} onValueChange={handleChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          className={cn(
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && !error && (
        <p className='mt-1.5 text-xs text-muted-foreground'>{hint}</p>
      )}
      {error && (
        <p className='mt-1.5 text-xs text-destructive flex items-center'>
          <AlertCircle className='w-3 h-3 mr-1' />
          {error}
        </p>
      )}
    </div>
  );
}

// New component using react-hook-form and zod validation
export interface ValidatedFormSelectProps<T extends z.ZodType> {
  form: ReturnType<typeof useForm<z.infer<T>>>;
  name: string;
  label: string;
  options: FormSelectOption[];
  placeholder?: string;
  description?: string;
  required?: boolean;
  className?: string;
}

export function ValidatedFormSelect<T extends z.ZodType>({
  form,
  name,
  label,
  options,
  placeholder,
  description,
  required = false,
  className,
}: ValidatedFormSelectProps<T>) {
  return (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className='text-destructive ml-1'>*</span>}
          </FormLabel>
          <Select
            onValueChange={field.onChange}
            defaultValue={field.value}
            value={field.value}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map(option => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface FormCheckboxProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'onChange'
  > {
  label: React.ReactNode;
  error?: string;
  hint?: string;
  className?: string;
  wrapperClassName?: string;
  onChange?: (checked: boolean) => void;
}

export function FormCheckbox({
  label,
  error,
  hint,
  className = '',
  wrapperClassName = '',
  onChange,
  ...props
}: FormCheckboxProps) {
  const handleChange = (checked: boolean) => {
    if (onChange) {
      onChange(checked);
    }
  };

  return (
    <div className={cn('w-full', wrapperClassName)}>
      <div className={cn('flex items-start', className)}>
        <Checkbox
          id={props.id}
          checked={props.checked}
          onCheckedChange={handleChange}
          disabled={props.disabled}
          className='mt-1'
        />
        <label
          htmlFor={props.id}
          className='ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer'
        >
          {label}
        </label>
      </div>
      {hint && !error && (
        <p className='mt-1.5 text-xs text-muted-foreground pl-7'>{hint}</p>
      )}
      {error && (
        <p className='mt-1.5 text-xs text-destructive flex items-center pl-7'>
          <AlertCircle className='w-3 h-3 mr-1' />
          {error}
        </p>
      )}
    </div>
  );
}

// New component using react-hook-form and zod validation
export interface ValidatedFormCheckboxProps<T extends z.ZodType> {
  form: ReturnType<typeof useForm<z.infer<T>>>;
  name: string;
  label: React.ReactNode;
  description?: string;
  className?: string;
}

export function ValidatedFormCheckbox<T extends z.ZodType>({
  form,
  name,
  label,
  description,
  className,
}: ValidatedFormCheckboxProps<T>) {
  return (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem
          className={cn(
            'flex flex-row items-start space-x-3 space-y-0 rounded-md p-4',
            className
          )}
        >
          <FormControl>
            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
          <div className='space-y-1 leading-none'>
            <FormLabel className='text-sm font-medium leading-none'>
              {label}
            </FormLabel>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}

interface FormRadioOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

interface FormRadioGroupProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'onChange'
  > {
  options: FormRadioOption[];
  error?: string;
  hint?: string;
  className?: string;
  wrapperClassName?: string;
  onChange?: (value: string) => void;
  value?: string;
}

export function FormRadioGroup({
  options,
  error,
  hint,
  className = '',
  wrapperClassName = '',
  onChange,
  value,
  ...props
}: FormRadioGroupProps) {
  const handleChange = (value: string) => {
    if (onChange) {
      onChange(value);
    }
  };

  return (
    <div className={cn('w-full', wrapperClassName)}>
      <RadioGroup
        value={value}
        onValueChange={handleChange}
        className={cn('space-y-2', className)}
        disabled={props.disabled}
      >
        {options.map(option => (
          <div key={option.value} className='flex items-center space-x-2'>
            <RadioGroupItem
              value={option.value}
              id={`radio-${option.value}`}
              disabled={option.disabled}
            />
            <label
              htmlFor={`radio-${option.value}`}
              className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer'
            >
              {option.label}
            </label>
          </div>
        ))}
      </RadioGroup>
      {hint && !error && (
        <p className='mt-1.5 text-xs text-muted-foreground'>{hint}</p>
      )}
      {error && (
        <p className='mt-1.5 text-xs text-destructive flex items-center'>
          <AlertCircle className='w-3 h-3 mr-1' />
          {error}
        </p>
      )}
    </div>
  );
}

// New component using react-hook-form and zod validation
export interface ValidatedFormRadioGroupProps<T extends z.ZodType> {
  form: ReturnType<typeof useForm<z.infer<T>>>;
  name: string;
  label: string;
  options: FormRadioOption[];
  description?: string;
  required?: boolean;
  className?: string;
}

export function ValidatedFormRadioGroup<T extends z.ZodType>({
  form,
  name,
  label,
  options,
  description,
  required = false,
  className,
}: ValidatedFormRadioGroupProps<T>) {
  return (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className='text-destructive ml-1'>*</span>}
          </FormLabel>
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value}
              value={field.value}
              className='space-y-2'
            >
              {options.map(option => (
                <div key={option.value} className='flex items-center space-x-2'>
                  <RadioGroupItem
                    value={option.value}
                    id={`${name}-${option.value}`}
                    disabled={option.disabled}
                  />
                  <label
                    htmlFor={`${name}-${option.value}`}
                    className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer'
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface FormGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function FormGroup({ children, className = '' }: FormGroupProps) {
  return <div className={cn('space-y-4', className)}>{children}</div>;
}

interface FormSectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function FormSection({
  children,
  title,
  description,
  className = '',
}: FormSectionProps) {
  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className='space-y-6'>{children}</CardContent>
    </Card>
  );
}

interface FormInfoProps {
  children: React.ReactNode;
  className?: string;
}

export function FormInfo({ children, className = '' }: FormInfoProps) {
  return (
    <Alert className={cn('bg-muted/50', className)}>
      <Info className='h-4 w-4' />
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

// Create a validated form component that uses zod schema
export interface ValidatedFormProps<T extends z.ZodType> {
  schema: T;
  defaultValues: Partial<z.infer<T>>;
  onSubmit: (values: z.infer<T>) => void;
  children: React.ReactNode;
  className?: string;
  submitButton?: React.ReactNode;
}

export function ValidatedForm<T extends z.ZodType>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className,
  submitButton,
}: ValidatedFormProps<T>) {
  // Create form with zod validation
  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as any,
  });

  // Clone children and pass form to them
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<any>, { form });
    }
    return child;
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('space-y-6', className)}
      >
        {childrenWithProps}
        {submitButton}
      </form>
    </Form>
  );
}
