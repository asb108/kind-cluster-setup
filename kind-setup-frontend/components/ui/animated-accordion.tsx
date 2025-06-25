import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Plus, Minus } from 'lucide-react';

interface AccordionItem {
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface AnimatedAccordionProps {
  items: AccordionItem[];
  defaultExpandedIds?: string[];
  allowMultiple?: boolean;
  variant?: 'default' | 'bordered' | 'separated' | 'minimal';
  iconVariant?: 'chevron' | 'plus' | 'arrow' | 'none';
  className?: string;
  itemClassName?: string;
  headerClassName?: string;
  contentClassName?: string;
  iconPosition?: 'left' | 'right';
  animated?: boolean;
  onChange?: (expandedIds: string[]) => void;
}

export function AnimatedAccordion({
  items,
  defaultExpandedIds = [],
  allowMultiple = false,
  variant = 'default',
  iconVariant = 'chevron',
  className = '',
  itemClassName = '',
  headerClassName = '',
  contentClassName = '',
  iconPosition = 'right',
  animated = true,
  onChange,
}: AnimatedAccordionProps) {
  const [expandedIds, setExpandedIds] = useState<string[]>(defaultExpandedIds);
  
  const toggleItem = (itemId: string) => {
    let newExpandedIds: string[];
    
    if (expandedIds.includes(itemId)) {
      // Collapse the item
      newExpandedIds = expandedIds.filter(id => id !== itemId);
    } else {
      // Expand the item
      if (allowMultiple) {
        newExpandedIds = [...expandedIds, itemId];
      } else {
        newExpandedIds = [itemId];
      }
    }
    
    setExpandedIds(newExpandedIds);
    
    if (onChange) {
      onChange(newExpandedIds);
    }
  };
  
  // Variant classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'bordered':
        return {
          container: 'border border-border rounded-lg overflow-hidden',
          item: 'border-b border-border last:border-b-0',
          header: 'px-4 py-3 bg-card hover:bg-muted/50 transition-colors',
          content: 'px-4 py-3 bg-card/50',
        };
      case 'separated':
        return {
          container: 'space-y-2',
          item: 'border border-border rounded-lg overflow-hidden',
          header: 'px-4 py-3 bg-card hover:bg-muted/50 transition-colors',
          content: 'px-4 py-3 border-t border-border bg-card/50',
        };
      case 'minimal':
        return {
          container: 'space-y-1',
          item: '',
          header: 'px-1 py-2 hover:text-primary transition-colors rounded-md',
          content: 'px-1 py-2',
        };
      case 'default':
      default:
        return {
          container: 'border-t border-border',
          item: 'border-b border-border',
          header: 'py-3',
          content: 'pb-3',
        };
    }
  };
  
  const variantClasses = getVariantClasses();
  
  // Icon component based on variant and state
  const getIcon = (itemId: string) => {
    const isExpanded = expandedIds.includes(itemId);
    
    switch (iconVariant) {
      case 'plus':
        return isExpanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />;
      case 'arrow':
        return (
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="h-4 w-4" />
          </motion.div>
        );
      case 'chevron':
        return (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        );
      case 'none':
      default:
        return null;
    }
  };
  
  return (
    <div className={`${variantClasses.container} ${className}`}>
      {items.map((item) => (
        <div 
          key={item.id}
          className={`${variantClasses.item} ${itemClassName}`}
        >
          <button
            className={`w-full text-left flex items-center justify-between ${variantClasses.header} ${headerClassName} ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => !item.disabled && toggleItem(item.id)}
            disabled={item.disabled}
            aria-expanded={expandedIds.includes(item.id)}
            aria-controls={`accordion-content-${item.id}`}
            id={`accordion-header-${item.id}`}
          >
            <div className={`flex items-center ${iconPosition === 'left' && iconVariant !== 'none' ? 'flex-row-reverse' : 'flex-row'}`}>
              {iconPosition === 'left' && iconVariant !== 'none' && (
                <span className={`${iconPosition === 'left' ? 'mr-2' : 'ml-2'} flex-shrink-0`}>
                  {getIcon(item.id)}
                </span>
              )}
              
              <div className="flex items-center">
                {item.icon && (
                  <span className="mr-2 flex-shrink-0">
                    {item.icon}
                  </span>
                )}
                <span>{item.title}</span>
              </div>
              
              {iconPosition === 'right' && iconVariant !== 'none' && (
                <span className="ml-2 flex-shrink-0">
                  {getIcon(item.id)}
                </span>
              )}
            </div>
          </button>
          
          <AnimatePresence initial={false}>
            {expandedIds.includes(item.id) && (
              <motion.div
                id={`accordion-content-${item.id}`}
                aria-labelledby={`accordion-header-${item.id}`}
                role="region"
                initial={animated ? { height: 0, opacity: 0 } : false}
                animate={animated ? { height: 'auto', opacity: 1 } : { opacity: 1 }}
                exit={animated ? { height: 0, opacity: 0 } : { opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className={`${variantClasses.content} ${contentClassName}`}>
                  {item.content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
