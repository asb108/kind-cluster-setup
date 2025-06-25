'use client'

import React, { useEffect, useState, Suspense, useTransition } from 'react'
import Navigation from '@/components/navigation'
import { Toaster } from '@/components/ui/toaster'
import Sidebar from '@/components/layout/sidebar'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Providers from '@/components/providers'

// Loading fallback for client components
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}

// Create a client-side only component
export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLargeScreen, setIsLargeScreen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Fix for CSS not loading during navigation in Next.js 15.3
  useEffect(() => {
    // Fix for preload styles not converting to stylesheet
    const fixStylesheets = () => {
      document.querySelectorAll('link[rel="preload"][as="style"]')
        .forEach(link => {
          // @ts-ignore - property exists but TypeScript doesn't know about it
          link.rel = "stylesheet"
        })

      // Fix for styles with media="x" attribute
      document.querySelectorAll('style[media="x"]')
        .forEach(styleTag => {
          styleTag.removeAttribute('media')
        })
    }

    // Run once on mount
    fixStylesheets()

    // And whenever route changes
    const handleRouteChange = () => {
      // Small timeout to ensure DOM has updated
      setTimeout(fixStylesheets, 100)
    }

    // Setup listeners for any navigation
    window.addEventListener('load', fixStylesheets)
    document.addEventListener('DOMContentLoaded', fixStylesheets)

    // Next.js 15.3 specific fix for CSS modules
    const linkElements = document.querySelectorAll('link[rel="stylesheet"]');
    linkElements.forEach(link => {
      // Check if this is a Next.js generated stylesheet
      const href = link.getAttribute('href');
      if (href && (href.includes('_next/static/css') || href.includes('app-build-manifest'))) {
        // Force reload the stylesheet with cache-busting
        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = href + (href.includes('?') ? '&' : '?') + 'reload=' + Date.now();
        link.parentNode?.insertBefore(newLink, link.nextSibling);
        // Remove the old link after a delay
        setTimeout(() => {
          link.parentNode?.removeChild(link);
        }, 100);
      }
    });

    // Cleanup
    return () => {
      window.removeEventListener('load', fixStylesheets)
      document.removeEventListener('DOMContentLoaded', fixStylesheets)
    }
  }, [router])

  // Handle window resize and check media query
  useEffect(() => {
    function handleResize() {
      setIsLargeScreen(window.matchMedia("(min-width: 768px)").matches)
    }

    // Set initial value
    handleResize()

    // Add event listener
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close sidebar when route changes
  React.useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  return (
    <Providers>
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        <div className="flex-grow flex relative">
          {/* Improved overlay with smoother transition */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}
          </AnimatePresence>

          {/* Mobile sidebar - only shows when sidebarOpen is true */}
          {!isLargeScreen && (
            <motion.aside
              className="fixed top-[57px] bottom-0 left-0 w-64 z-50
                bg-background/95 backdrop-blur-md border-r border-border/40 shadow-md"
              initial={{ x: -320 }}
              animate={{ x: sidebarOpen ? 0 : -320 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <div className="h-full overflow-y-auto no-scrollbar">
                <Sidebar />
              </div>
            </motion.aside>
          )}

          {/* Desktop sidebar - fixed position, always visible on large screens */}
          {isLargeScreen && (
            <aside className="hidden md:block fixed top-[57px] bottom-0 left-0 w-64 z-40
              bg-background border-r border-border/40">
              <div className="h-full overflow-y-auto no-scrollbar">
                <Sidebar />
              </div>
            </aside>
          )}

          {/* Main content area with responsive padding and margin adjustments based on screen size */}
          <main className={`flex-grow p-3 sm:p-5 md:p-6 lg:p-8 w-full overflow-x-hidden transition-all duration-300 ${isLargeScreen ? 'md:ml-64' : 'ml-0'}`}>
            <motion.div
              className="max-w-7xl mx-auto w-full space-y-6 md:space-y-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              key={pathname}
            >
              <div className="animate-in fade-in duration-500">
                {!isPending ? children : <LoadingFallback />}
              </div>
            </motion.div>
          </main>
        </div>

        <Toaster />
      </div>
    </Providers>
  )
}