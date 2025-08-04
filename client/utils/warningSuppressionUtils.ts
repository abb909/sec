// Utility to suppress specific console warnings globally
export const suppressWarnings = () => {
  // Store original console methods
  const originalWarn = console.warn;
  const originalError = console.error;

  // Helper function to check if it's a Recharts component warning
  const isRechartsWarning = (args: any[]) => {
    const fullMessage = args.join(' ').toLowerCase();
    const message = String(args[0] || '').toLowerCase();

    // Comprehensive patterns for Recharts defaultProps warnings
    const warningPatterns = [
      'support for defaultprops will be removed',
      'use javascript default parameters instead',
      'defaultprops',
      'xaxis',
      'yaxis',
      'xaxis2',
      'yaxis2',
      'recharts'
    ];

    // Check if any pattern matches
    const matchesPattern = warningPatterns.some(pattern =>
      fullMessage.includes(pattern) || message.includes(pattern)
    );

    // Special check for the %s placeholder format from React warnings
    const isFormattedReactWarning = message.includes('%s') && (
      fullMessage.includes('xaxis') ||
      fullMessage.includes('yaxis') ||
      fullMessage.includes('defaultprops')
    );

    return matchesPattern || isFormattedReactWarning;
  };

  // Override console.warn
  console.warn = (...args: any[]) => {
    // Suppress Recharts defaultProps warnings
    if (isRechartsWarning(args)) {
      return; // Completely suppress
    }

    // Additional check for any XAxis/YAxis warnings
    const fullMessage = args.join(' ');
    if (fullMessage.includes('XAxis') || fullMessage.includes('YAxis')) {
      return;
    }

    // Show all other warnings normally
    originalWarn.apply(console, args);
  };

  // Override console.error with same logic
  console.error = (...args: any[]) => {
    // Suppress Recharts defaultProps errors
    if (isRechartsWarning(args)) {
      return; // Completely suppress
    }

    // Additional check for any XAxis/YAxis errors
    const fullMessage = args.join(' ');
    if (fullMessage.includes('XAxis') || fullMessage.includes('YAxis')) {
      return;
    }

    // Show all other errors normally
    originalError.apply(console, args);
  };

  // Return cleanup function
  return () => {
    console.warn = originalWarn;
    console.error = originalError;
  };
};
