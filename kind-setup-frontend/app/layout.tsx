import React from 'react';
import './globals.css'
import '../styles/custom.css'
import '../styles/enhanced-ui.css'
import '../styles/themes.css'
import type { Metadata, Viewport } from 'next'
import LayoutWithSidebar from '../components/app-layout'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/context/theme-context'
import { SidebarProvider } from '../components/sidebar-context'
import { inter, jetbrainsMono, getFontVariables } from '@/lib/fonts'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' }
  ],
}

export const metadata: Metadata = {
  title: {
    template: '%s | Kind Cluster Management',
    default: 'Kind Cluster Management',
  },
  description: 'A modern interface for managing Kind Kubernetes clusters',
  applicationName: 'Kind Setup',
  authors: [{ name: 'Kind Setup Team' }],
  keywords: ['kubernetes', 'kind', 'cluster', 'management', 'k8s', 'container'],
  creator: 'Kind Setup Team',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // Performance optimizations
  metadataBase: new URL('https://kind-setup.local'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://kind-setup.local',
    title: 'Kind Cluster Management',
    description: 'A modern interface for managing Kind Kubernetes clusters',
    siteName: 'Kind Setup',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kind Cluster Management',
    description: 'A modern interface for managing Kind Kubernetes clusters',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kind Setup',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'mobile-web-app-capable': 'yes',
    'msapplication-tap-highlight': 'no',
  },
}



export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={getFontVariables()}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <SidebarProvider>
            <LayoutWithSidebar>{children}</LayoutWithSidebar>
            <Toaster />
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}