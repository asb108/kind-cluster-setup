'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Menu,
  X,
  Server,
  LayersIcon,
  Home,
  Activity,
  Terminal,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '@/styles/app.module.css';
import { cn } from '@/components/utils';

const navItems = [
  { name: 'Dashboard', path: '/', icon: Home },
  { name: 'Create Cluster', path: '/create-cluster', icon: Server },
  { name: 'Manage Apps', path: '/manage-apps', icon: LayersIcon },
  { name: 'Cluster Status', path: '/cluster-status', icon: Activity },
];

interface NavigationProps {
  onMenuClick?: () => void;
  sidebarOpen?: boolean;
}

export default function Navigation({
  onMenuClick,
  sidebarOpen,
}: NavigationProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  // Add scroll effect for navigation bar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(styles.header, scrolled && 'shadow-md backdrop-blur-md')}
    >
      <div className={styles.flexBetween}>
        {/* Logo and Menu Button */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className='flex items-center gap-2'
        >
          <Button
            variant='ghost'
            size='icon'
            className='lg:hidden mr-1 hover:bg-primary/10 focus:ring-0 rounded-lg shadow-sm hover:shadow-md transition-all duration-200'
            onClick={onMenuClick}
          >
            {sidebarOpen ? (
              <X className='h-5 w-5 text-primary' />
            ) : (
              <Menu className='h-5 w-5 text-primary' />
            )}
          </Button>
          <Link href='/' className={styles.headerTitle}>
            <div className='bg-primary/10 p-1.5 rounded-md shadow-sm'>
              <Terminal className='h-5 w-5 text-primary' />
            </div>
            <span>Kind Setup</span>
          </Link>
        </motion.div>

        {/* Desktop Navigation */}
        <div className='hidden md:flex items-center space-x-3'>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(styles.navItem, isActive && styles.navItemActive)}
              >
                <Icon className='h-4 w-4 mr-1.5' />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* User Profile and Settings */}
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='icon'
            className='rounded-full hover:bg-primary/10 focus:ring-0 shadow-sm hover:shadow-md transition-all duration-200'
          >
            <Settings className='h-5 w-5 text-muted-foreground hover:text-primary transition-colors' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            className='rounded-full bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200'
          >
            <User className='h-5 w-5 text-primary' />
          </Button>
        </div>
      </div>
    </header>
  );
}
