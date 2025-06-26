import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { AnimatedText } from '@/components/ui/animated-text';
import { AnimatedCounter } from '@/components/ui/animated-counter';

interface DonutChartItem {
  value: number;
  label: string;
  color?: string;
}

interface DonutChartProps {
  data: DonutChartItem[];
  size?: number;
  thickness?: number;
  className?: string;
  animate?: boolean;
  animationDuration?: number;
  showLabels?: boolean;
  showValues?: boolean;
  showTotal?: boolean;
  showPercentages?: boolean;
  centerContent?: React.ReactNode;
  interactive?: boolean;
  onItemClick?: (item: DonutChartItem, index: number) => void;
  startAngle?: number;
  endAngle?: number;
  rounded?: boolean;
  gap?: number;
  colorScheme?: 'default' | 'pastel' | 'vibrant' | 'monochrome';
}

export function DonutChart({
  data,
  size = 200,
  thickness = 30,
  className = '',
  animate = true,
  animationDuration = 1.5,
  showLabels = true,
  showValues = true,
  showTotal = true,
  showPercentages = true,
  centerContent,
  interactive = true,
  onItemClick,
  startAngle = 0,
  endAngle = 360,
  rounded = true,
  gap = 1,
  colorScheme = 'default',
}: DonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Calculate total value
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Calculate angles for each segment
  const angleRange = endAngle - startAngle;
  let currentAngle = startAngle;
  const segments = data.map((item, index) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const angle = total > 0 ? (item.value / total) * angleRange : 0;

    // Calculate SVG arc parameters
    const startAngleRad = (currentAngle - 90) * (Math.PI / 180);
    const endAngleRad = (currentAngle + angle - 90) * (Math.PI / 180);

    const innerRadius = size / 2 - thickness;
    const outerRadius = size / 2;

    // Calculate start and end points
    const startX = outerRadius + outerRadius * Math.cos(startAngleRad);
    const startY = outerRadius + outerRadius * Math.sin(startAngleRad);
    const endX = outerRadius + outerRadius * Math.cos(endAngleRad);
    const endY = outerRadius + outerRadius * Math.sin(endAngleRad);

    // Calculate inner points
    const innerStartX = outerRadius + innerRadius * Math.cos(startAngleRad);
    const innerStartY = outerRadius + innerRadius * Math.sin(startAngleRad);
    const innerEndX = outerRadius + innerRadius * Math.cos(endAngleRad);
    const innerEndY = outerRadius + innerRadius * Math.sin(endAngleRad);

    // Determine if the arc is large or small
    const largeArcFlag = angle > 180 ? 1 : 0;

    // Create path
    let path;

    if (angle >= 359.99) {
      // For full circle
      path = [
        `M ${startX} ${startY}`,
        `A ${outerRadius} ${outerRadius} 0 1 1 ${startX - 0.01} ${startY}`,
        `A ${outerRadius} ${outerRadius} 0 1 1 ${startX} ${startY}`,
        `L ${innerStartX} ${innerStartY}`,
        `A ${innerRadius} ${innerRadius} 0 1 0 ${innerStartX - 0.01} ${innerStartY}`,
        `A ${innerRadius} ${innerRadius} 0 1 0 ${innerStartX} ${innerStartY}`,
        'Z',
      ].join(' ');
    } else {
      // For arc segments
      path = [
        `M ${startX} ${startY}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
        `L ${innerEndX} ${innerEndY}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY}`,
        'Z',
      ].join(' ');
    }

    // Get color based on index and color scheme
    const getColor = () => {
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
      };

      return colors[colorScheme][index % colors[colorScheme].length];
    };

    const segmentInfo = {
      path,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      percentage,
      color: getColor(),
      item,
      index,
    };

    // Update current angle for next segment
    currentAngle += angle + (gap > 0 ? (angleRange * gap) / 360 : 0);

    return segmentInfo;
  });

  // Calculate label positions
  const getLabelPosition = (segment: (typeof segments)[0]) => {
    const midAngle = (segment.startAngle + segment.endAngle) / 2;
    const midAngleRad = (midAngle - 90) * (Math.PI / 180);
    const labelRadius = size / 2 + 20; // Position labels outside the chart

    return {
      x: size / 2 + labelRadius * Math.cos(midAngleRad),
      y: size / 2 + labelRadius * Math.sin(midAngleRad),
    };
  };

  return (
    <div
      className={cn('relative', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((segment, index) => (
          <motion.path
            key={index}
            d={segment.path}
            fill={segment.color}
            strokeLinecap={rounded ? 'round' : 'butt'}
            strokeLinejoin={rounded ? 'round' : 'miter'}
            initial={
              animate
                ? { pathLength: 0, opacity: 0 }
                : { pathLength: 1, opacity: 1 }
            }
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              duration: animationDuration,
              delay: index * 0.1,
              ease: 'easeInOut',
            }}
            onMouseEnter={() => interactive && setHoveredIndex(index)}
            onMouseLeave={() => interactive && setHoveredIndex(null)}
            onClick={() =>
              interactive && onItemClick && onItemClick(segment.item, index)
            }
            style={{
              cursor: interactive && onItemClick ? 'pointer' : 'default',
              transform: hoveredIndex === index ? 'scale(1.03)' : 'scale(1)',
              transformOrigin: 'center',
              transition: 'transform 0.2s ease-out',
            }}
          />
        ))}
      </svg>

      {/* Center content */}
      {(showTotal || centerContent) && (
        <div
          className='absolute inset-0 flex flex-col items-center justify-center text-center'
          style={{ padding: thickness + 10 }}
        >
          {centerContent || (
            <>
              <AnimatedText
                text='Total'
                animation='fade'
                className='text-sm text-muted-foreground'
                animateOnView={animate}
                delay={0.2}
              />
              <AnimatedCounter
                value={total}
                className='text-2xl font-bold'
                duration={1.5}
                delay={0.4}
              />
            </>
          )}
        </div>
      )}

      {/* Labels */}
      {showLabels && (
        <div className='absolute inset-0 pointer-events-none'>
          {segments.map((segment, index) => {
            if (segment.percentage < 5) return null; // Skip small segments

            const { x, y } = getLabelPosition(segment);
            const isRightSide = x > size / 2;

            return (
              <motion.div
                key={index}
                className='absolute whitespace-nowrap text-xs'
                style={{
                  left: x,
                  top: y,
                  transform: `translate(${isRightSide ? '0' : '-100%'}, -50%)`,
                }}
                initial={animate ? { opacity: 0 } : { opacity: 1 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: 0.5,
                  delay: animationDuration + index * 0.1,
                }}
              >
                <div className='flex items-center gap-1'>
                  {!isRightSide && (
                    <>
                      {showValues && (
                        <span className='font-medium'>
                          {segment.item.value}
                        </span>
                      )}
                      {showPercentages && (
                        <span className='text-muted-foreground'>
                          ({segment.percentage.toFixed(1)}%)
                        </span>
                      )}
                      <span>{segment.item.label}</span>
                    </>
                  )}
                  {isRightSide && (
                    <>
                      <span>{segment.item.label}</span>
                      {showValues && (
                        <span className='font-medium'>
                          {segment.item.value}
                        </span>
                      )}
                      {showPercentages && (
                        <span className='text-muted-foreground'>
                          ({segment.percentage.toFixed(1)}%)
                        </span>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
