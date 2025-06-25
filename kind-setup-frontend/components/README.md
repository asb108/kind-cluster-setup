# UI Components

## Overview

This directory contains reusable UI components used throughout the Kind Setup frontend application. Components are organized following a variant of the Atomic Design methodology.

## Directory Structure

- `/ui`: Core UI components (buttons, cards, inputs)
- `/forms`: Form components and validation logic
- `/dialogs`: Modal dialogs and notifications
- `/layout`: Layout components (headers, footers, sidebars)

## Component Guidelines

### Component Creation

When creating new components:

1. Place them in the appropriate subdirectory based on their function
2. Include proper PropTypes or TypeScript interfaces
3. Use consistent styling patterns
4. Include comments for complex logic

### State Management

Components should follow these state management principles:

- Lift state up to the nearest common ancestor when shared between components
- Use React hooks for local component state
- Pass callbacks for state changes to child components

### Styling

The project uses a combination of:

- Tailwind CSS for utility-based styling
- CSS modules for component-specific styles
- Global styles for theme variables

### Error Handling

Components should:

- Handle loading states gracefully
- Display appropriate error messages
- Provide fallback UI when errors occur

## Example Component

```tsx
import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface StatusCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  loading?: boolean;
  onRefresh?: () => void;
}

export function StatusCard({
  title,
  value,
  icon,
  loading = false,
  onRefresh,
}: StatusCardProps) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='flex items-center gap-2 text-muted-foreground'>
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='flex flex-col'>
          {loading ? (
            <p className='text-3xl font-bold text-foreground'>Loading...</p>
          ) : (
            <p className='text-3xl font-bold text-foreground'>{value}</p>
          )}
          {onRefresh && (
            <Button
              variant='ghost'
              size='sm'
              onClick={onRefresh}
              className='mt-2 self-end'
            >
              Refresh
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

## Usage

Components can be imported and used in pages and other components:

```tsx
import { StatusCard } from '@/components/status-card';
import { Server } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className='grid grid-cols-3 gap-4'>
      <StatusCard
        title='Clusters'
        value={5}
        icon={<Server className='h-5 w-5' />}
      />
      <StatusCard
        title='Applications'
        value={12}
        loading={isLoading}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
```
