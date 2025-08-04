// This module should be imported FIRST to suppress React warnings
// Enhanced approach to completely disable recharts defaultProps warnings

// Store original console methods
const originalWarn = console.warn;
const originalError = console.error;

// Enhanced warning suppression for development
if (import.meta.env.DEV) {
  console.warn = function(...args: any[]) {
    const message = String(args[0] || '');
    const fullMessage = args.join(' ');

    // Enhanced suppression patterns for recharts warnings
    if (
      // Direct defaultProps warnings
      message.includes('defaultProps') ||
      message.includes('Support for defaultProps') ||
      message.includes('Use JavaScript default parameters') ||

      // Recharts component warnings
      fullMessage.includes('XAxis') ||
      fullMessage.includes('YAxis') ||
      fullMessage.includes('XAxis2') ||
      fullMessage.includes('YAxis2') ||
      fullMessage.includes('recharts.js') ||
      fullMessage.includes('recharts') ||

      // React component template warnings
      message.includes('%s: Support for defaultProps') ||
      (message.includes('%s') && fullMessage.includes('function components')) ||

      // Specific template matching for the exact warning pattern
      (message === 'Warning: %s: Support for defaultProps will be removed from function components in a future major release. Use JavaScript default parameters instead.%s' && (
        fullMessage.includes('XAxis') ||
        fullMessage.includes('YAxis') ||
        fullMessage.includes('Axis')
      ))
    ) {
      return; // Complete silence
    }

    // Show all other warnings normally
    return originalWarn.apply(console, args);
  };

  // Also suppress console.error for the same patterns
  console.error = function(...args: any[]) {
    const message = String(args[0] || '');
    const fullMessage = args.join(' ');

    if (message.includes('defaultProps') ||
        fullMessage.includes('XAxis') ||
        fullMessage.includes('YAxis') ||
        fullMessage.includes('recharts')) {
      return; // Complete silence
    }

    return originalError.apply(console, args);
  };
}

// Export a cleanup function if needed
export const restoreConsole = () => {
  console.warn = originalWarn;
  console.error = originalError;
};
