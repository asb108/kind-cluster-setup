import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

interface AnimatedTabsProps {
  tabs: Tab[];
  defaultTabId?: string;
  onChange?: (tabId: string) => void;
  variant?: 'underline' | 'pills' | 'enclosed' | 'soft' | 'minimal';
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  tabsClassName?: string;
  contentClassName?: string;
  animated?: boolean;
  animationVariant?: 'fade' | 'slide' | 'scale' | 'none';
  fullWidth?: boolean;
  iconPosition?: 'left' | 'top';
}

export function AnimatedTabs({
  tabs,
  defaultTabId,
  onChange,
  variant = 'underline',
  orientation = 'horizontal',
  size = 'md',
  className = '',
  tabsClassName = '',
  contentClassName = '',
  animated = true,
  animationVariant = 'fade',
  fullWidth = false,
  iconPosition = 'left',
}: AnimatedTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTabId || (tabs.length > 0 ? tabs[0].id : ''));
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, top: 0, height: 0 });
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // Create a callback ref function
  const setTabRef = useCallback((id: string) => (el: HTMLButtonElement | null) => {
    tabRefs.current[id] = el;
  }, []);

  // Update the active tab when defaultTabId changes
  useEffect(() => {
    if (defaultTabId) {
      setActiveTab(defaultTabId);
    }
  }, [defaultTabId]);

  // Update the indicator position when the active tab changes
  useEffect(() => {
    const activeTabElement = tabRefs.current[activeTab];

    if (activeTabElement) {
      if (orientation === 'horizontal') {
        setIndicatorStyle({
          left: activeTabElement.offsetLeft,
          width: activeTabElement.offsetWidth,
          top: 0,
          height: 0,
        });
      } else {
        setIndicatorStyle({
          left: 0,
          width: 0,
          top: activeTabElement.offsetTop,
          height: activeTabElement.offsetHeight,
        });
      }
    }
  }, [activeTab, orientation, tabs]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (onChange) {
      onChange(tabId);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'text-xs py-1 px-2',
    md: 'text-sm py-2 px-3',
    lg: 'text-base py-3 px-4',
  };

  // Variant classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'pills':
        return {
          tabs: 'bg-muted/30 p-1 rounded-lg',
          tab: 'rounded-md font-medium transition-colors',
          activeTab: 'bg-card shadow-sm text-foreground',
          inactiveTab: 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          indicator: 'hidden',
        };
      case 'enclosed':
        return {
          tabs: 'border-b border-border',
          tab: 'font-medium transition-colors border-b-2 border-transparent -mb-px',
          activeTab: 'border-primary text-primary',
          inactiveTab: 'text-muted-foreground hover:text-foreground hover:border-border',
          indicator: 'hidden',
        };
      case 'soft':
        return {
          tabs: 'gap-2',
          tab: 'font-medium transition-colors rounded-md',
          activeTab: 'bg-primary/10 text-primary',
          inactiveTab: 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          indicator: 'hidden',
        };
      case 'minimal':
        return {
          tabs: 'gap-4',
          tab: 'font-medium transition-colors',
          activeTab: 'text-primary',
          inactiveTab: 'text-muted-foreground hover:text-foreground',
          indicator: 'hidden',
        };
      case 'underline':
      default:
        return {
          tabs: 'border-b border-border',
          tab: 'font-medium transition-colors',
          activeTab: 'text-primary',
          inactiveTab: 'text-muted-foreground hover:text-foreground',
          indicator: 'bg-primary',
        };
    }
  };

  const variantClasses = getVariantClasses();

  // Animation variants for tab content
  const getContentAnimationVariants = () => {
    switch (animationVariant) {
      case 'slide':
        return {
          hidden: { opacity: 0, x: 20 },
          visible: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -20 },
        };
      case 'scale':
        return {
          hidden: { opacity: 0, scale: 0.95 },
          visible: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.95 },
        };
      case 'fade':
      default:
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
          exit: { opacity: 0 },
        };
    }
  };

  const contentAnimationVariants = getContentAnimationVariants();

  return (
    <div className={`${className}`}>
      {/* Tab list */}
      <div
        className={`relative flex ${orientation === 'vertical' ? 'flex-col' : 'flex-row'} ${variantClasses.tabs} ${tabsClassName}`}
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={setTabRef(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={`
              ${sizeClasses[size]}
              ${variantClasses.tab}
              ${activeTab === tab.id ? variantClasses.activeTab : variantClasses.inactiveTab}
              ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${fullWidth ? 'flex-1 text-center' : ''}
              ${iconPosition === 'top' ? 'flex flex-col items-center' : 'flex items-center'}
            `}
            onClick={() => !tab.disabled && handleTabChange(tab.id)}
            disabled={tab.disabled}
          >
            {tab.icon && (
              <span className={`${iconPosition === 'left' ? 'mr-2' : 'mb-1'}`}>
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
          </button>
        ))}

        {/* Animated indicator */}
        {variant === 'underline' && (
          <motion.div
            className={`absolute ${orientation === 'vertical' ? 'w-0.5' : 'h-0.5'} ${variantClasses.indicator}`}
            style={
              orientation === 'vertical'
                ? { top: indicatorStyle.top, height: indicatorStyle.height, right: 0 }
                : { left: indicatorStyle.left, width: indicatorStyle.width, bottom: 0 }
            }
            layout
            transition={{ duration: 0.2 }}
          />
        )}
      </div>

      {/* Tab content */}
      <div className={`mt-4 ${contentClassName}`}>
        {animated ? (
          <AnimatePresence mode="wait">
            {tabs.map((tab) => (
              activeTab === tab.id && (
                <motion.div
                  key={tab.id}
                  role="tabpanel"
                  aria-labelledby={`tab-${tab.id}`}
                  id={`panel-${tab.id}`}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={contentAnimationVariants}
                  transition={{ duration: 0.2 }}
                >
                  {tab.content}
                </motion.div>
              )
            ))}
          </AnimatePresence>
        ) : (
          tabs.map((tab) => (
            activeTab === tab.id && (
              <div
                key={tab.id}
                role="tabpanel"
                aria-labelledby={`tab-${tab.id}`}
                id={`panel-${tab.id}`}
              >
                {tab.content}
              </div>
            )
          ))
        )}
      </div>
    </div>
  );
}
