'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronRight, Server } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useSidebar } from './sidebar-context';
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import { navSections } from './Sidebar';
import { AnimatedNavItem } from './ui/animated-nav-item';

export default function MobileNav() {
  const { isOpen, toggle, close } = useSidebar();
  const pathname = usePathname();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (title: string) => {
    setExpandedSection(expandedSection === title ? null : title);
  };

  // Animation variants
  const menuVariants = {
    closed: {
      opacity: 0,
      x: "-100%",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.05,
        staggerDirection: -1,
        when: "afterChildren"
      }
    },
    open: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.05,
        delayChildren: 0.1,
        when: "beforeChildren"
      }
    }
  };

  const itemVariants = {
    closed: { opacity: 0, x: -20 },
    open: { opacity: 1, x: 0 }
  };

  const backdropVariants = {
    closed: { opacity: 0 },
    open: { opacity: 1 }
  };

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden rounded-full hover:bg-primary/5"
        onClick={toggle}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        <motion.div
          animate={isOpen ? "open" : "closed"}
          variants={{
            open: { rotate: 180, scale: 1.1 },
            closed: { rotate: 0, scale: 1 }
          }}
          transition={{ duration: 0.3 }}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </motion.div>
      </Button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
            initial="closed"
            animate="open"
            exit="closed"
            variants={backdropVariants}
            onClick={close}
          />
        )}
      </AnimatePresence>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-y-0 left-0 w-[280px] bg-background border-r shadow-lg z-50 md:hidden overflow-hidden"
            initial="closed"
            animate="open"
            exit="closed"
            variants={menuVariants}
          >
            {/* Header */}
            <motion.div
              className="flex items-center justify-between p-4 border-b"
              variants={itemVariants}
            >
              <Link href="/" className="flex items-center gap-2" onClick={close}>
                <div className="bg-primary/10 p-1.5 rounded-md">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <span className="font-bold text-lg bg-clip-text text-transparent bg-primary-gradient">
                  Kind Setup
                </span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-primary/5"
                onClick={close}
              >
                <X className="h-5 w-5" />
              </Button>
            </motion.div>

            {/* Menu items */}
            <div className="overflow-y-auto h-[calc(100vh-4rem)]">
              <div className="p-4 space-y-6">
                {navSections.map((section) => (
                  <motion.div key={section.title} variants={itemVariants}>
                    <div 
                      className="flex items-center justify-between mb-2 px-2"
                      onClick={() => toggleSection(section.title)}
                    >
                      <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                        {section.title}
                      </h3>
                      <motion.div
                        animate={{ rotate: expandedSection === section.title ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    </div>
                    
                    <AnimatePresence initial={false}>
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ 
                          height: expandedSection === section.title || expandedSection === null ? "auto" : 0,
                          opacity: expandedSection === section.title || expandedSection === null ? 1 : 0
                        }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-1 pl-2">
                          {section.items.map((item) => (
                            <AnimatedNavItem
                              key={item.href}
                              href={item.href}
                              label={item.label}
                              icon={item.icon}
                              isActive={pathname === item.href}
                              onClick={close}
                              variant="subtle"
                              indicatorPosition="left"
                            />
                          ))}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
