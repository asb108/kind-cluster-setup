'use client';

import React, { useEffect } from 'react';
import Menubar from './Menubar';
import Sidebar from './Sidebar';
import MobileNav from './mobile-nav';
import { useSidebar } from './sidebar-context';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

export default function LayoutWithSidebar({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useSidebar();

  // Close sidebar on route change for mobile
  useEffect(() => {
    if (isOpen && window.innerWidth < 768) {
      close();
    }
  }, [children, isOpen, close]);

  return (
    <div className="flex min-h-screen flex-col bg-background/50">
      <Menubar />

      <div className="flex flex-1 relative">
        {/* Overlay for mobile sidebar */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:hidden"
              onClick={close}
            />
          )}
        </AnimatePresence>

        {/* Sidebar: always visible on md+, slide-in on mobile */}
        <Sidebar />

        {/* Main content area with proper padding for sidebar */}
        <motion.main
          className={cn(
            "flex-1 transition-all duration-300",
            "md:pl-64" // Padding for desktop sidebar
          )}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <ScrollArea className="h-[calc(100vh-4rem)]">
            <div className="container mx-auto p-4 md:p-6 lg:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={typeof window !== 'undefined' ? window.location.pathname : undefined}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </ScrollArea>
        </motion.main>
      </div>
    </div>
  );
}