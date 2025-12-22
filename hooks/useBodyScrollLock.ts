import { useEffect } from 'react';

export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    // Save original overflow style
    const originalStyle = window.getComputedStyle(document.body).overflow;

    if (isLocked) {
      // Lock scroll
      document.body.style.overflow = 'hidden';
      // Optional: Add padding-right to prevent layout shift if scrollbar disappears
      // document.body.style.paddingRight = 'var(--scrollbar-width, 0px)';
    }

    return () => {
      // Restore scroll on unmount or unlock
      document.body.style.overflow = originalStyle;
      // document.body.style.paddingRight = '0px';
    };
  }, [isLocked]);
}
