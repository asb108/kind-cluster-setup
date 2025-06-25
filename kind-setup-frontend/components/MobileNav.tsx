'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server,
  Plus,
  AppWindow,
  Cpu,
  HardDrive,
  Settings,
  Book,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

// Define navigation items with sections
const navSections = [
  {
    title: 'Main',
    items: [
      { href: '/', label: 'Dashboard', icon: <Server className='h-4 w-4' /> },
    ],
  },
  {
    title: 'Cluster Management',
    items: [
      {
        href: '/create-cluster',
        label: 'Create Cluster',
        icon: <Plus className='h-4 w-4' />,
      },
      {
        href: '/cluster-status',
        label: 'Cluster Status',
        icon: <Cpu className='h-4 w-4' />,
      },
    ],
  },
  {
    title: 'Applications',
    items: [
      {
        href: '/deploy-app',
        label: 'Deploy App',
        icon: <AppWindow className='h-4 w-4' />,
      },
      {
        href: '/manage-apps',
        label: 'Manage Apps',
        icon: <AppWindow className='h-4 w-4' />,
      },
    ],
  },
  {
    title: 'Resources',
    items: [
      {
        href: '/manage-storage',
        label: 'Manage Storage',
        icon: <HardDrive className='h-4 w-4' />,
      },
      {
        href: '/settings',
        label: 'Settings',
        icon: <Settings className='h-4 w-4' />,
      },
      { href: '/docs', label: 'Docs', icon: <Book className='h-4 w-4' /> },
    ],
  },
];

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant='ghost' size='icon' className='md:hidden'>
          <Server className='h-5 w-5' />
          <span className='sr-only'>Toggle mobile menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side='left' className='p-0'>
        <div className='border-b p-4'>
          <Link
            href='/'
            className='flex items-center gap-2'
            onClick={() => setOpen(false)}
          >
            <Server className='h-5 w-5' />
            <span className='font-bold'>Kind Setup</span>
          </Link>
        </div>
        <ScrollArea className='h-[calc(100vh-4rem)]'>
          <div className='px-2 py-4'>
            {navSections.map(section => (
              <div key={section.title} className='mb-4'>
                <div className='px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                  {section.title}
                </div>
                <div className='space-y-1'>
                  {section.items.map(item => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                          'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'hover:bg-muted'
                        )}
                        aria-current={isActive ? 'page' : undefined}
                        aria-label={`Navigate to ${item.label}`}
                      >
                        <span
                          className={cn(
                            isActive ? 'text-primary' : 'text-muted-foreground'
                          )}
                        >
                          {item.icon}
                        </span>
                        {item.label}
                        {isActive && (
                          <motion.div
                            layoutId='mobile-nav-active'
                            className='ml-auto h-full w-1 rounded-full bg-primary'
                            transition={{
                              type: 'spring',
                              bounce: 0.2,
                              duration: 0.6,
                            }}
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
