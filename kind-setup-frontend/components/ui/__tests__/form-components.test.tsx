import { render, screen, fireEvent } from '@testing-library/react';
import {
  FormLabel,
  FormInput,
  FormTextarea,
  FormSelect,
  FormCheckbox,
  FormRadioGroup,
  FormGroup,
  FormSection,
  FormInfo,
} from '../form-components';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

describe('Form Components', () => {
  describe('FormLabel', () => {
    it('renders correctly', () => {
      render(<FormLabel htmlFor='test'>Test Label</FormLabel>);
      expect(screen.getByText('Test Label')).toBeInTheDocument();
    });

    it('shows required indicator when required is true', () => {
      render(
        <FormLabel htmlFor='test' required>
          Required Label
        </FormLabel>
      );
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('FormInput', () => {
    it('renders correctly', () => {
      render(<FormInput id='test' placeholder='Test Input' />);
      expect(screen.getByPlaceholderText('Test Input')).toBeInTheDocument();
    });

    it('shows hint text when provided', () => {
      render(<FormInput id='test' hint='This is a hint' />);
      expect(screen.getByText('This is a hint')).toBeInTheDocument();
    });

    it('shows error message when provided', () => {
      render(<FormInput id='test' error='This is an error' />);
      expect(screen.getByText('This is an error')).toBeInTheDocument();
    });
  });

  describe('FormTextarea', () => {
    it('renders correctly', () => {
      render(<FormTextarea id='test' placeholder='Test Textarea' />);
      expect(screen.getByPlaceholderText('Test Textarea')).toBeInTheDocument();
    });

    it('shows hint text when provided', () => {
      render(<FormTextarea id='test' hint='This is a hint' />);
      expect(screen.getByText('This is a hint')).toBeInTheDocument();
    });

    it('shows error message when provided', () => {
      render(<FormTextarea id='test' error='This is an error' />);
      expect(screen.getByText('This is an error')).toBeInTheDocument();
    });
  });

  describe('FormSelect', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
    ];

    it('renders correctly', () => {
      render(
        <FormSelect
          id='test'
          options={options}
          placeholder='Select an option'
        />
      );
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('FormCheckbox', () => {
    it('renders correctly', () => {
      render(<FormCheckbox id='test' label='Test Checkbox' />);
      expect(screen.getByText('Test Checkbox')).toBeInTheDocument();
    });
  });

  describe('FormRadioGroup', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
    ];

    it('renders correctly', () => {
      render(<FormRadioGroup name='test' options={options} />);
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });
  });

  describe('FormGroup', () => {
    it('renders children correctly', () => {
      render(
        <FormGroup>
          <div>Child 1</div>
          <div>Child 2</div>
        </FormGroup>
      );
      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });
  });

  describe('FormSection', () => {
    it('renders title and description correctly', () => {
      render(
        <FormSection title='Section Title' description='Section Description'>
          <div>Section Content</div>
        </FormSection>
      );
      expect(screen.getByText('Section Title')).toBeInTheDocument();
      expect(screen.getByText('Section Description')).toBeInTheDocument();
      expect(screen.getByText('Section Content')).toBeInTheDocument();
    });
  });

  describe('FormInfo', () => {
    it('renders children correctly', () => {
      render(
        <FormInfo>
          <div>Info Content</div>
        </FormInfo>
      );
      expect(screen.getByText('Info Content')).toBeInTheDocument();
    });
  });
});
