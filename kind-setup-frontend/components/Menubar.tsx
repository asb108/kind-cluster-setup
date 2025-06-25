'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, Search, Bell, ChevronDown, X } from 'lucide-react';
import { useSidebar } from './sidebar-context';
import ThemeSwitcher from './ThemeSwitcher';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePathname } from 'next/navigation';
import { getBreadcrumbs } from './Sidebar';
import { motion, AnimatePresence } from 'framer-motion';

export default function Menubar() {
  const { isOpen, toggle } = useSidebar();
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname || '');
  const [scrolled, setScrolled] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Add scroll effect for enhanced visual feedback
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animation variants
  const menuIconVariants = {
    open: { rotate: 90, scale: 1.1 },
    closed: { rotate: 0, scale: 1 },
  };

  const navItemVariants = {
    hover: { y: -2, transition: { duration: 0.2 } },
    tap: { scale: 0.95, transition: { duration: 0.1 } },
  };

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-all duration-200",
        scrolled
          ? "bg-background/85 backdrop-blur-md shadow-md supports-[backdrop-filter]:bg-background/60"
          : "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70"
      )}
    >
      <div className="flex h-14 md:h-16 items-center px-4 md:px-6">
        <div className="flex items-center gap-2 md:gap-0 flex-1">
          <motion.div
            whileHover="hover"
            whileTap="tap"
            variants={{
              hover: { scale: 1.05 },
              tap: { scale: 0.95 }
            }}
          >
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "md:hidden rounded-full transition-all duration-200",
                isOpen ? "bg-primary/10 text-primary" : "hover:bg-primary/5"
              )}
              onClick={toggle}
              aria-label={isOpen ? "Close sidebar menu" : "Open sidebar menu"}
            >
              <motion.div
                animate={isOpen ? "open" : "closed"}
                variants={menuIconVariants}
                transition={{ duration: 0.2 }}
              >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </motion.div>
            </Button>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.2 }}
          >
            <Link href="/" className="hidden md:block">
              <div className="text-xl font-bold bg-clip-text text-transparent bg-primary-gradient tracking-tight mr-6 px-2 py-1 rounded-md hover:shadow-sm transition-all duration-200">
                Kind Setup
              </div>
            </Link>
          </motion.div>

          {/* Enhanced Breadcrumbs */}
          <nav className="hidden md:flex items-center text-sm">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.href}>
                {i > 0 && (
                  <motion.div
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className="h-4 w-4 mx-1 rotate-[-90deg] text-muted-foreground" />
                  </motion.div>
                )}
                <motion.div
                  whileHover="hover"
                  whileTap="tap"
                  variants={navItemVariants}
                >
                  <Link
                    href={crumb.href}
                    className={cn(
                      "hover:text-primary transition-colors px-2 py-1 rounded-md",
                      i === breadcrumbs.length - 1
                        ? "font-medium text-foreground hover:bg-primary/5"
                        : "text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {crumb.label}
                  </Link>
                </motion.div>
              </React.Fragment>
            ))}
          </nav>

          {/* Mobile title with animation */}
          <AnimatePresence mode="wait">
            {!showMobileSearch && (
              <motion.div
                key="mobile-title"
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 5 }}
                transition={{ duration: 0.2 }}
                className="md:hidden text-base font-medium ml-1"
              >
                {breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 1].label : 'Kind Setup'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop Search with enhanced styling */}
        <div className="hidden md:flex items-center gap-4 flex-1 justify-center">
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="relative w-full max-w-sm group"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 bg-background/50 border-muted group-hover:border-primary/50 transition-all duration-200 rounded-full focus-visible:ring-primary/20 focus-visible:ring-offset-0"
            />
          </motion.div>
        </div>

        {/* Mobile Search Toggle */}
        <AnimatePresence>
          {showMobileSearch && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "100%" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute left-0 top-0 w-full h-full bg-background/95 backdrop-blur-md flex items-center px-4 md:hidden"
            >
              <Button
                variant="ghost"
                size="icon"
                className="mr-2"
                onClick={() => setShowMobileSearch(false)}
              >
                <X className="h-5 w-5" />
              </Button>
              <Input
                type="search"
                placeholder="Search..."
                className="flex-1 bg-background/50"
                autoFocus
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3 flex-1 justify-end">
          {/* Mobile Search Button */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="md:hidden"
          >
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-primary/5"
              onClick={() => setShowMobileSearch(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
          </motion.div>

          <ThemeSwitcher />

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full hover:bg-primary/5 transition-all duration-200"
            >
              <Bell className="h-5 w-5" />
              <motion.span
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{
                  repeat: Infinity,
                  repeatType: "reverse",
                  duration: 1.5
                }}
                className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"
              />
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}
