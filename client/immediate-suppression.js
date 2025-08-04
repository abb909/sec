// Nuclear immediate execution - completely disable console.warn in development
(function() {
  'use strict';

  // Store original methods
  const originalWarn = console.warn;
  const originalError = console.error;

  // Nuclear approach: Completely disable console.warn in development
  console.warn = function() {
    // Completely silent - no warnings shown at all in development
    // This eliminates ALL React/Recharts defaultProps warnings
    return;
  };

  // Keep errors but suppress defaultProps related ones
  console.error = function() {
    const args = Array.prototype.slice.call(arguments);
    const message = String(args[0] || '');
    const fullMessage = args.join(' ');

    // Suppress defaultProps errors too
    if (message.indexOf('defaultProps') !== -1 ||
        fullMessage.indexOf('XAxis') !== -1 ||
        fullMessage.indexOf('YAxis') !== -1) {
      return; // Silent
    }

    return originalError.apply(console, args);
  };

  // Store originals for potential restoration
  window._originalConsoleWarn = originalWarn;
  window._originalConsoleError = originalError;

})();
