import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BarChartItem {
  label: string;
  value: number;
  color?: string;
  tooltip?: string;
}

interface BarChartProps {
  data: BarChartItem[];
  height?: number;
  className?: string;
  barClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
  animate?: boolean;
  animationDuration?: number;
  showValues?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
  gridLines?: number;
  horizontal?: boolean;
  maxValue?: number;
  rounded?: boolean;
  barWidth?: number | string;
  barGap?: number | string;
  colorScheme?: 'default' | 'pastel' | 'vibrant' | 'monochrome' | 'gradient';
  interactive?: boolean;
  onBarClick?: (item: BarChartItem, index: number) => void;
  valueFormatter?: (value: number) => string;
  labelFormatter?: (label: string) => string;
}

export function BarChart({
  data,
  height = 300,
  className = '',
  barClassName = '',
  labelClassName = '',
  valueClassName = '',
  animate = true,
  animationDuration = 0.8,
  showValues = true,
  showLabels = true,
  showGrid = true,
  gridLines = 5,
  horizontal = false,
  maxValue: customMaxValue,
  rounded = true,
  barWidth = '1fr',
  barGap = '0.5rem',
  colorScheme = 'default',
  interactive = true,
  onBarClick,
  valueFormatter = value => value.toString(),
  labelFormatter = label => label,
}: BarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Calculate max value for scaling
  const maxValue =
    customMaxValue || Math.max(...data.map(item => item.value), 0);

  // Generate grid lines
  const gridLineValues = Array.from({ length: gridLines }, (_, i) => {
    return maxValue * ((i + 1) / gridLines);
  });

  // Get color based on index and color scheme
  const getColor = (item: BarChartItem, index: number) => {
    if (item.color) return item.color;

    const colors = {
      default: [
        'var(--chart-1)',
        'var(--chart-2)',
        'var(--chart-3)',
        'var(--chart-4)',
        'var(--chart-5)',
      ],
      pastel: ['#FFD6E0', '#FFEFCF', '#D1F0E0', '#C7CEEA', '#E2BEF1'],
      vibrant: ['#FF5C8D', '#FFB800', '#00C2A8', '#5271FF', '#AF4BCE'],
      monochrome: [
        'hsl(267, 70%, 30%)',
        'hsl(267, 70%, 40%)',
        'hsl(267, 70%, 50%)',
        'hsl(267, 70%, 60%)',
        'hsl(267, 70%, 70%)',
      ],
      gradient: [
        'linear-gradient(to top, var(--primary), var(--primary-light))',
        'linear-gradient(to top, var(--secondary), var(--secondary-light))',
        'linear-gradient(to top, var(--tertiary), var(--tertiary-light))',
        'linear-gradient(to top, var(--success), var(--success-light))',
        'linear-gradient(to top, var(--info), var(--info-light))',
      ],
    };

    return colors[colorScheme][index % colors[colorScheme].length];
  };

  // Render horizontal bar chart
  if (horizontal) {
    return (
      <div
        className={cn('w-full', className)}
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        <div className='flex h-full'>
          {/* Labels column */}
          {showLabels && (
            <div className='flex flex-col justify-between py-1 pr-4'>
              {data.map((item, index) => (
                <div
                  key={index}
                  className={cn(
                    'text-sm text-muted-foreground',
                    labelClassName
                  )}
                >
                  {labelFormatter(item.label)}
                </div>
              ))}
            </div>
          )}

          {/* Chart area */}
          <div className='flex-1 relative'>
            {/* Grid lines */}
            {showGrid && (
              <div className='absolute inset-0 flex'>
                {gridLineValues.map((value, index) => (
                  <div
                    key={index}
                    className='border-l border-border h-full'
                    style={{
                      left: `${(value / maxValue) * 100}%`,
                      borderLeftStyle: index === 0 ? 'solid' : 'dashed',
                    }}
                  >
                    <div className='absolute -top-5 -translate-x-1/2 text-xs text-muted-foreground'>
                      {valueFormatter(value)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bars */}
            <div
              className='h-full flex flex-col justify-between'
              style={{
                gap: barGap,
              }}
            >
              {data.map((item, index) => {
                const percentage = (item.value / maxValue) * 100;

                return (
                  <div key={index} className='flex items-center h-8 relative'>
                    <motion.div
                      className={cn(
                        'h-full',
                        rounded && 'rounded-r-md',
                        barClassName
                      )}
                      style={{
                        width: `${percentage}%`,
                        background: getColor(item, index),
                        cursor:
                          interactive && onBarClick ? 'pointer' : 'default',
                      }}
                      initial={
                        animate ? { width: 0 } : { width: `${percentage}%` }
                      }
                      animate={{ width: `${percentage}%` }}
                      transition={{
                        duration: animationDuration,
                        delay: index * 0.1,
                        ease: 'easeOut',
                      }}
                      whileHover={
                        interactive
                          ? {
                              width: `${percentage + 2}%`,
                              transition: { duration: 0.2 },
                            }
                          : {}
                      }
                      onMouseEnter={() => interactive && setHoveredIndex(index)}
                      onMouseLeave={() => interactive && setHoveredIndex(null)}
                      onClick={() =>
                        interactive && onBarClick && onBarClick(item, index)
                      }
                    />

                    {/* Bar value */}
                    {showValues && (
                      <div
                        className={cn(
                          'absolute text-sm font-medium ml-2',
                          valueClassName
                        )}
                        style={{ left: `${percentage}%` }}
                      >
                        {valueFormatter(item.value)}
                      </div>
                    )}

                    {/* Tooltip */}
                    {item.tooltip && hoveredIndex === index && (
                      <div className='absolute left-0 -top-8 bg-popover text-popover-foreground text-xs p-1 rounded shadow-sm border border-border'>
                        {item.tooltip}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render vertical bar chart
  return (
    <div
      className={cn('w-full', className)}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <div className='flex flex-col h-full'>
        {/* Chart area */}
        <div className='flex-1 relative'>
          {/* Grid lines */}
          {showGrid && (
            <div className='absolute inset-0 flex flex-col justify-between'>
              {gridLineValues.map((value, index) => (
                <div
                  key={index}
                  className='border-t border-border w-full'
                  style={{
                    bottom: `${(value / maxValue) * 100}%`,
                    borderTopStyle: index === 0 ? 'solid' : 'dashed',
                  }}
                >
                  <div className='absolute -left-5 -translate-y-1/2 text-xs text-muted-foreground'>
                    {valueFormatter(value)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bars */}
          <div
            className='absolute inset-0 flex items-end'
            style={{
              gap: barGap,
              padding: '0.5rem 0',
            }}
          >
            {data.map((item, index) => {
              const percentage = (item.value / maxValue) * 100;

              return (
                <div
                  key={index}
                  className='flex flex-col items-center relative'
                  style={{
                    width: barWidth,
                  }}
                >
                  {/* Bar value */}
                  {showValues && (
                    <div
                      className={cn('text-xs font-medium mb-1', valueClassName)}
                    >
                      {valueFormatter(item.value)}
                    </div>
                  )}

                  <motion.div
                    className={cn(
                      'w-full',
                      rounded && 'rounded-t-md',
                      barClassName
                    )}
                    style={{
                      height: `${percentage}%`,
                      background: getColor(item, index),
                      cursor: interactive && onBarClick ? 'pointer' : 'default',
                    }}
                    initial={
                      animate ? { height: 0 } : { height: `${percentage}%` }
                    }
                    animate={{ height: `${percentage}%` }}
                    transition={{
                      duration: animationDuration,
                      delay: index * 0.1,
                      ease: 'easeOut',
                    }}
                    whileHover={
                      interactive
                        ? {
                            height: `${percentage + 2}%`,
                            transition: { duration: 0.2 },
                          }
                        : {}
                    }
                    onMouseEnter={() => interactive && setHoveredIndex(index)}
                    onMouseLeave={() => interactive && setHoveredIndex(null)}
                    onClick={() =>
                      interactive && onBarClick && onBarClick(item, index)
                    }
                  />

                  {/* Tooltip */}
                  {item.tooltip && hoveredIndex === index && (
                    <div className='absolute bottom-full mb-2 bg-popover text-popover-foreground text-xs p-1 rounded shadow-sm border border-border'>
                      {item.tooltip}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Labels row */}
        {showLabels && (
          <div
            className='flex pt-2'
            style={{
              gap: barGap,
            }}
          >
            {data.map((item, index) => (
              <div
                key={index}
                className={cn(
                  'text-xs text-muted-foreground text-center truncate',
                  labelClassName
                )}
                style={{
                  width: barWidth,
                }}
              >
                {labelFormatter(item.label)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
