import React, { useEffect } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  LineChart as RechartsLineChart,
  Line,
  Area,
  AreaChart as RechartsAreaChart
} from 'recharts';

// Temporary suppress warnings for this component tree
const useWarningSuppress = () => {
  useEffect(() => {
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      const message = String(args[0] || '');
      const fullMessage = args.join(' ');
      
      // Suppress recharts defaultProps warnings
      if (
        message.includes('defaultProps') ||
        message.includes('Support for defaultProps') ||
        fullMessage.includes('XAxis') ||
        fullMessage.includes('YAxis') ||
        fullMessage.includes('recharts')
      ) {
        return;
      }
      
      return originalWarn.apply(console, args);
    };

    return () => {
      console.warn = originalWarn;
    };
  }, []);
};

// Warning-free wrapper components
export const BarChart: React.FC<any> = (props) => {
  useWarningSuppress();
  // Ensure all props are passed through properly
  return <RechartsBarChart {...props} />;
};

export const XAxis: React.FC<any> = (props) => {
  // Pass all props through without modification
  return <RechartsXAxis {...props} />;
};

export const YAxis: React.FC<any> = (props) => {
  // Pass all props through without modification
  return <RechartsYAxis {...props} />;
};

export const PieChart: React.FC<any> = (props) => {
  useWarningSuppress();
  return <RechartsPieChart {...props} />;
};

export const LineChart: React.FC<any> = (props) => {
  useWarningSuppress();
  return <RechartsLineChart {...props} />;
};

export const AreaChart: React.FC<any> = (props) => {
  useWarningSuppress();
  // Ensure proper prop forwarding for AreaChart
  const { children, ...chartProps } = props;
  return (
    <RechartsAreaChart {...chartProps}>
      {children}
    </RechartsAreaChart>
  );
};

// Re-export other components as-is
export {
  Bar,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Pie,
  Line,
  Area
};
