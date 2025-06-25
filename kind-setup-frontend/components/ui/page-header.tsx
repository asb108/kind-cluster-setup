'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBreadcrumbs } from '../Sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  showBreadcrumbs?: boolean;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  showBreadcrumbs = true,
}: PageHeaderProps) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname || '');

  return (
    <div className={cn('mb-8 space-y-4', className)}>
      {showBreadcrumbs && breadcrumbs.length > 1 && (
        <Breadcrumb className='mb-4'>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href='/'>
                <Home className='h-3.5 w-3.5' />
                <span className='sr-only'>Home</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.slice(1, -1).map(crumb => (
              <BreadcrumbItem key={crumb.href}>
                <BreadcrumbSeparator />
                <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
              </BreadcrumbItem>
            ))}
            {breadcrumbs.length > 1 && (
              <BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbPage>
                  {breadcrumbs[breadcrumbs.length - 1].label}
                </BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className='text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-primary-gradient'>
            {title}
          </h1>
          {description && (
            <p className='text-muted-foreground mt-1'>{description}</p>
          )}
        </motion.div>
        {actions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className='flex items-center gap-3'
          >
            {actions}
          </motion.div>
        )}
      </div>
    </div>
  );
}
