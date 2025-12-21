// hooks/useBodyScrollLock.ts
'use client'

import { useEffect } from 'react';

export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    // Save original overflow style
    const originalStyle = window.getComputedStyle(document.body).overflow;

    if (isLocked) {
      // Lock scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      // Restore scroll on unmount or unlock
      document.body.style.overflow = originalStyle;
    };
  }, [isLocked]);
}
