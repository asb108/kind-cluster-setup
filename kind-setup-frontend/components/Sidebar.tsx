'use client';
import Link from 'next/link';
import {
  Server,
  Plus,
  AppWindow,
  Cpu,
  HardDrive,
  Settings,
  Book,
  X,
  ChevronRight,
} from 'lucide-react';
import { useSidebar } from './sidebar-context';
import React from 'react';
import { usePathname } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from './utils';
import { motion } from 'framer-motion';

// Define navigation items with sections
export const navSections = [
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

// Flatten all items for breadcrumb generation
const allNavItems = (navSections || []).flatMap(section => section.items || []);

export function NavItem({
  href,
  label,
  icon,
  isActive,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={{
        x: 4,
        transition: { duration: 0.2 },
      }}
      whileTap={{
        scale: 0.98,
        transition: { duration: 0.1 },
      }}
    >
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          'group flex items-center gap-x-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
          isActive
            ? 'bg-primary/10 text-primary shadow-sm'
            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
        )}
        aria-current={isActive ? 'page' : undefined}
        aria-label={`Navigate to ${label}`}
      >
        <motion.div
          initial={{ scale: 1 }}
          whileHover={{
            scale: 1.15,
            rotate: [0, -10, 10, -5, 0],
            transition: { duration: 0.3 },
          }}
          className={cn(
            'transition-colors flex items-center justify-center p-1 rounded-md',
            isActive
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground group-hover:text-foreground group-hover:bg-muted/50'
          )}
        >
          {icon}
        </motion.div>
        <span>{label}</span>

        {/* Active indicator with animation */}
        {isActive ? (
          <motion.div
            layoutId='sidebar-active-indicator'
            className='ml-auto h-full w-1 rounded-full bg-primary'
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: '100%' }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
          />
        ) : (
          <motion.div
            className='ml-auto h-full w-1 rounded-full bg-transparent'
            initial={{ opacity: 0 }}
            whileHover={{
              opacity: 0.5,
              backgroundColor: 'hsl(var(--primary) / 0.3)',
            }}
            transition={{ duration: 0.2 }}
          />
        )}
      </Link>
    </motion.div>
  );
}

export default function Sidebar() {
  const { isOpen, close } = useSidebar();
  const pathname = usePathname();

  // Animation variants for staggered children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.07,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24,
      },
    },
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24,
      },
    },
  };

  return (
    <>
      {/* Mobile sidebar using Sheet component with enhanced animations */}
      <Sheet open={isOpen} onOpenChange={close}>
        <SheetContent
          side='left'
          className='p-0 w-[280px] sm:w-[320px] border-r shadow-lg'
        >
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SheetHeader className='p-4 border-b'>
              <SheetTitle className='text-xl font-bold bg-clip-text text-transparent bg-primary-gradient flex items-center gap-2'>
                <motion.div
                  initial={{ rotate: -10, scale: 0.9 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ duration: 0.5, type: 'spring' }}
                >
                  <Server className='h-5 w-5 text-primary' />
                </motion.div>
                Kind Setup
              </SheetTitle>
            </SheetHeader>
          </motion.div>

          <ScrollArea className='h-[calc(100vh-5rem)] pb-10'>
            <motion.div
              className='px-3 py-2'
              variants={containerVariants}
              initial='hidden'
              animate='visible'
            >
              {navSections.map((section, sectionIndex) => (
                <motion.div
                  key={section.title}
                  className='mb-6'
                  variants={sectionVariants}
                >
                  <motion.h3
                    className='px-4 mb-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 * sectionIndex, duration: 0.3 }}
                  >
                    {section.title}
                  </motion.h3>
                  <motion.div
                    className='space-y-1.5'
                    variants={containerVariants}
                  >
                    {section.items.map((item, itemIndex) => (
                      <motion.div
                        key={item.href}
                        variants={itemVariants}
                        custom={itemIndex}
                      >
                        <NavItem
                          href={item.href}
                          label={item.label}
                          icon={item.icon}
                          isActive={pathname === item.href}
                          onClick={close}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar with enhanced styling and animations */}
      <aside className='hidden md:flex flex-col w-64 h-screen border-r border-border bg-card/50 fixed left-0 top-16 shadow-sm'>
        <ScrollArea className='flex-1'>
          <motion.div
            className='px-3 py-4'
            initial='hidden'
            animate='visible'
            variants={containerVariants}
          >
            {navSections.map((section, sectionIndex) => (
              <motion.div
                key={section.title}
                className='mb-6'
                variants={sectionVariants}
                custom={sectionIndex}
              >
                <h3 className='px-4 mb-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase'>
                  {section.title}
                </h3>
                <motion.div
                  className='space-y-1.5'
                  variants={containerVariants}
                >
                  {section.items.map((item, itemIndex) => (
                    <motion.div
                      key={item.href}
                      variants={itemVariants}
                      custom={itemIndex}
                    >
                      <NavItem
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                        isActive={pathname === item.href}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            ))}

            {/* Footer with subtle branding */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 1, duration: 0.5 }}
              className='mt-auto pt-6 px-4 text-xs text-muted-foreground/70 border-t border-border/50 mx-2'
            >
              <div className='flex items-center justify-between'>
                <span>Kind Setup v1.0</span>
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Server className='h-3 w-3 text-primary/70' />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </ScrollArea>
      </aside>
    </>
  );
}

// Export breadcrumb generator
export function getBreadcrumbs(pathname: string) {
  // Always include home
  const breadcrumbs = [{ href: '/', label: 'Home' }];

  // Add current page if not home
  if (pathname !== '/') {
    const currentPage = allNavItems.find(item => item.href === pathname);
    if (currentPage) {
      breadcrumbs.push({ href: currentPage.href, label: currentPage.label });
    }
  }

  return breadcrumbs;
}
