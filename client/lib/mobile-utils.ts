/**
 * Mobile-specific utility functions for better dialog and modal management
 */

/**
 * Checks if the device is mobile based on screen size and user agent
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check screen size
  const isMobileScreen = window.innerWidth <= 768;
  
  // Check user agent for mobile devices
  const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  return isMobileScreen || isMobileUserAgent;
};

/**
 * Gets appropriate dialog classes for mobile optimization
 */
export const getMobileDialogClasses = (size: 'sm' | 'md' | 'lg' | 'xl' = 'md'): string => {
  const baseClasses = 'mobile-dialog-container';
  
  const sizeClasses = {
    sm: 'w-[95vw] max-w-md mx-2 sm:mx-auto',
    md: 'w-[95vw] max-w-lg mx-2 sm:mx-auto', 
    lg: 'w-[98vw] max-w-2xl mx-1 sm:mx-auto',
    xl: 'w-[98vw] max-w-4xl mx-1 sm:mx-auto'
  };
  
  return `${sizeClasses[size]} ${baseClasses}`;
};

/**
 * Gets mobile-optimized header classes
 */
export const getMobileHeaderClasses = (): string => {
  return 'mobile-dialog-header';
};

/**
 * Handles mobile-specific dialog opening behavior
 */
export const handleMobileDialogOpen = (): void => {
  if (!isMobileDevice()) return;
  
  // Prevent body scroll on mobile when dialog is open
  document.body.style.overflow = 'hidden';
  
  // Add mobile viewport meta adjustments if needed
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    );
  }
};

/**
 * Handles mobile-specific dialog closing behavior
 */
export const handleMobileDialogClose = (): void => {
  if (!isMobileDevice()) return;
  
  // Restore body scroll
  document.body.style.overflow = '';
  
  // Restore viewport meta
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover'
    );
  }
};

/**
 * Optimizes form inputs for mobile devices
 */
export const optimizeFormForMobile = (formElement: HTMLFormElement): void => {
  if (!isMobileDevice()) return;
  
  const inputs = formElement.querySelectorAll('input, select, textarea');
  
  inputs.forEach((input) => {
    const element = input as HTMLInputElement;
    
    // Prevent zoom on focus for iOS
    if (element.style) {
      element.style.fontSize = '16px';
    }
    
    // Add touch-friendly attributes
    element.setAttribute('autocapitalize', 'off');
    element.setAttribute('autocorrect', 'off');
    element.setAttribute('spellcheck', 'false');
    
    // For numeric inputs, add inputmode
    if (element.type === 'number' || element.type === 'tel') {
      element.setAttribute('inputmode', 'numeric');
    }
  });
};

/**
 * Gets device-specific touch target size
 */
export const getTouchTargetSize = (): string => {
  return isMobileDevice() ? 'min-h-[48px] min-w-[48px]' : 'min-h-[40px] min-w-[40px]';
};

/**
 * Gets responsive text size classes
 */
export const getResponsiveTextSize = (size: 'sm' | 'base' | 'lg' | 'xl'): string => {
  const sizeMap = {
    sm: 'text-xs sm:text-sm',
    base: 'text-sm sm:text-base', 
    lg: 'text-base sm:text-lg',
    xl: 'text-lg sm:text-xl'
  };
  
  return sizeMap[size];
};
