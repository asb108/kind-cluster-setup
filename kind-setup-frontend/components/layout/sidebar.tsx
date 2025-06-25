'use client';

import * as React from 'react';
import { cn } from '@/components/utils';
import {
  Home,
  Plus,
  AppWindow,
  Activity,
  Terminal,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import styles from '@/styles/app.module.css';

const sidebarItems = [
  {
    title: 'Dashboard',
    href: '/',
    Icon: Home,
    description: 'Overview of your clusters',
  },
  {
    title: 'Create Cluster',
    href: '/create-cluster',
    Icon: Plus,
    description: 'Set up a new Kind cluster',
  },
  {
    title: 'Manage Apps',
    href: '/manage-apps',
    Icon: AppWindow,
    description: 'Deploy and manage applications',
  },
  {
    title: 'Airflow',
    href: '/airflow',
    Icon: Activity,
    description: 'Access Apache Airflow',
  },
  {
    title: 'Cluster Status',
    href: '/cluster-status',
    Icon: Activity,
    description: 'Monitor cluster health',
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className={styles.sidebar}>
      {/* Main Navigation */}
      <div className={styles.sidebarLogo}>
        <Terminal className='h-5 w-5' />
        <span>Kind Setup</span>
      </div>

      <div className={styles.sidebarSection}>
        <div className={styles.sidebarSectionTitle}>Menu</div>
        <nav>
          {sidebarItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(styles.navItem, isActive && styles.navItemActive)}
              >
                <div
                  className={cn(
                    'rounded-md transition-all duration-200',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <item.Icon className='h-5 w-5' />
                </div>
                <div className='flex flex-col'>
                  <span className='font-medium'>{item.title}</span>
                  <span className='text-xs text-muted-foreground opacity-80'>
                    {item.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Settings Section */}
      <div className={styles.sidebarSection}>
        <div className={styles.sidebarSectionTitle}>Settings</div>
        <Link href='/settings' className={styles.navItem}>
          <Settings className='h-5 w-5' />
          <span>Settings</span>
        </Link>
      </div>
    </div>
  );
}
