'use client';

import { IconButton, Badge, Box } from '@chakra-ui/react';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * NotificationBell Component
 * A reusable notification bell icon with badge count
 * 
 * @param {number} count - The number of unread notifications
 * @param {string} size - Icon size ('sm', 'md', 'lg') or number for pixel size
 * @param {string} variant - Chakra UI button variant
 * @param {string} colorScheme - Badge color scheme
 * @param {boolean} showCount - Whether to show the count number or just a dot
 * @param {string} badgePosition - Badge position ('top-right', 'top-left', 'bottom-right', 'bottom-left')
 * @param {function} onClick - Custom click handler (optional)
 */
export default function NotificationBell({
  count = 0,
  size = 20,
  variant = 'ghost',
  colorScheme = 'red',
  showCount = true,
  badgePosition = 'top-right',
  onClick,
  ...props
}) {
  const router = useRouter();
  
  // Ensure count is a number and greater than 0
  const numericCount = Number(count) || 0;
  const hasNotifications = numericCount > 0;
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push('/notifications');
    }
  };

  // Calculate badge position
  const getBadgePosition = () => {
    switch (badgePosition) {
      case 'top-left':
        return { top: '-2px', left: '-2px' };
      case 'bottom-right':
        return { bottom: '-2px', right: '-2px' };
      case 'bottom-left':
        return { bottom: '-2px', left: '-2px' };
      case 'top-right':
      default:
        return { top: '-2px', right: '-2px' };
    }
  };

  // Format count display
  const formatCount = (num) => {
    if (num > 99) return '99+';
    return num.toString();
  };

  return (
    <Box position="relative" display="inline-block">
      <IconButton
        icon={<Bell size={typeof size === 'number' ? size : size === 'sm' ? 18 : size === 'lg' ? 24 : 20} />}
        variant={variant}
        aria-label={`Notifications${hasNotifications ? ` (${numericCount} unread)` : ''}`}
        onClick={handleClick}
        {...props}
      />
      {hasNotifications && (
        <Badge
          colorScheme={colorScheme}
          borderRadius="full"
          position="absolute"
          {...getBadgePosition()}
          fontSize="xs"
          fontWeight="bold"
          minW={showCount ? '18px' : '10px'}
          h={showCount ? '18px' : '10px'}
          display="flex"
          alignItems="center"
          justifyContent="center"
          px={showCount ? 1 : 0}
          boxShadow="0 2px 4px rgba(0,0,0,0.2)"
        >
          {showCount ? formatCount(numericCount) : ''}
        </Badge>
      )}
    </Box>
  );
}

