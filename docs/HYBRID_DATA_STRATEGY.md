# Hybrid Firebase Data Fetching Strategy

## Overview

This document describes the implementation of a hybrid data fetching strategy designed to optimize Firebase reads while maintaining real-time updates for critical data. The strategy combines on-demand data loading with intelligent caching and selective real-time subscriptions.

## Architecture

### Core Components

1. **`useHybridFirestore` Hook** (`client/hooks/useHybridFirestore.ts`)
   - Main data fetching hook with configurable strategies
   - Handles caching, pagination, and real-time subscriptions
   - Automatic cleanup of subscriptions

2. **`DataContext`** (`client/contexts/DataContext.tsx`)
   - Global data management with pre-configured strategies
   - Permission-based data filtering
   - Centralized cache management

3. **`DataMonitoringDashboard`** (`client/components/DataMonitoringDashboard.tsx`)
   - Real-time monitoring of data fetching strategies
   - Cache status and performance insights
   - Manual cache control

## Data Fetching Strategies

### 1. Real-Time Strategy (Minimal Firebase Reads)

**Used for:**
- Notifications (last 50 items)
- New data alerts (last 24 hours only)

**Implementation:**
```typescript
// Real-time notifications with limited scope
const notifications = useRealtimeFirestore<Notification>('notifications', [
  where('recipientId', '==', user.uid),
  orderBy('createdAt', 'desc'),
  limit(50) // Only recent notifications
]);

// Real-time new workers (last 24 hours only)
const newWorkers = useRealtimeFirestore<Worker>('workers', [
  where('createdAt', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)),
  orderBy('createdAt', 'desc'),
  limit(10)
]);
```

**Benefits:**
- ✅ Instant updates for critical data
- ✅ Limited scope reduces Firebase reads
- ✅ Automatic subscription cleanup

### 2. Cached + On-Demand Strategy (Optimized Reads)

**Used for:**
- Workers list (30min cache, session storage)
- Farms list (60min cache, localStorage)
- Rooms list (45min cache, session storage)
- Stock inventory (15min cache, session storage)

**Implementation:**
```typescript
// Workers with pagination and caching
const workers = useHybridFirestore<Worker>('workers', {
  strategy: {
    useRealtime: false,
    onDemandFilter: [orderBy('createdAt', 'desc')],
    pagination: { enabled: true, pageSize: 50 },
    cache: { enabled: true, expiryMinutes: 30, storage: 'sessionStorage' }
  }
});
```

**Benefits:**
- ✅ Reduces redundant Firebase reads
- ✅ Faster page loads with cached data
- ✅ Pagination for large datasets
- ✅ Automatic cache expiration

### 3. Long-Term Cache Strategy (Minimal Reads)

**Used for:**
- Application settings (120min cache, localStorage)
- Configuration data

**Implementation:**
```typescript
const settings = useCachedFirestore<Settings>('settings', 120);
```

**Benefits:**
- ✅ Very infrequent Firebase reads
- ✅ Persistent across sessions
- ✅ Perfect for rarely changing data

## Cache Management

### Cache Types

1. **Memory Cache** - Cleared on page refresh
2. **Session Storage** - Cleared when tab closes
3. **Local Storage** - Persistent across sessions

### Cache Configuration

```typescript
interface CacheConfig {
  enabled: boolean;
  expiryMinutes: number;
  storage: 'memory' | 'localStorage' | 'sessionStorage';
}
```

### Cache Operations

```typescript
// Clear all cache
const { cache } = useData();
cache.clearAll();

// Clear specific collection
cache.clearCollection('workers');

// Get cache status
const status = cache.getCacheStatus();
```

## Pre-configured Strategies

### Critical Real-Time Data
```typescript
notifications: {
  useRealtime: true,
  realTimeFilter: [orderBy('createdAt', 'desc'), limit(50)],
  cache: { enabled: false, expiryMinutes: 0, storage: 'memory' }
}
```

### Large Datasets with Caching
```typescript
workers: {
  useRealtime: false,
  onDemandFilter: [orderBy('createdAt', 'desc')],
  pagination: { enabled: true, pageSize: 50 },
  cache: { enabled: true, expiryMinutes: 30, storage: 'sessionStorage' }
}
```

### Configuration Data
```typescript
settings: {
  useRealtime: false,
  cache: { enabled: true, expiryMinutes: 120, storage: 'localStorage' }
}
```

## Usage Examples

### Basic Usage with Context

```typescript
import { useWorkers, useFarms, useNotifications } from '@/contexts/DataContext';

function MyComponent() {
  const workers = useWorkers(); // Cached + on-demand
  const farms = useFarms();     // Cached + on-demand
  const notifications = useNotifications(); // Real-time

  return (
    <div>
      {/* Workers list with pagination */}
      {workers.data.map(worker => (
        <div key={worker.id}>{worker.nom}</div>
      ))}
      
      {/* Load more button */}
      {workers.hasMore && (
        <button onClick={workers.loadMore}>
          Load More
        </button>
      )}
      
      {/* Real-time notifications */}
      {notifications.data.map(notification => (
        <div key={notification.id}>{notification.message}</div>
      ))}
    </div>
  );
}
```

### Custom Strategy

```typescript
import { useHybridFirestore, createFetchStrategy } from '@/hooks/useHybridFirestore';

function CustomComponent() {
  const customStrategy = createFetchStrategy({
    useRealtime: true,
    realTimeFilter: [where('urgent', '==', true), limit(20)],
    cache: { enabled: true, expiryMinutes: 5, storage: 'memory' }
  });

  const urgentData = useHybridFirestore('urgent_data', {
    strategy: customStrategy
  });

  return <div>{/* Custom data rendering */}</div>;
}
```

### CRUD Operations with Cache Invalidation

```typescript
function WorkerForm() {
  const workers = useWorkers();

  const handleSubmit = async (data) => {
    try {
      // Add new worker - automatically invalidates cache
      const id = await workers.add(data);
      
      // Cache is cleared and data refreshed automatically
      console.log('Worker added:', id);
    } catch (error) {
      console.error('Error adding worker:', error);
    }
  };

  return <form onSubmit={handleSubmit}>{/* Form */}</form>;
}
```

## Performance Optimizations

### 1. Subscription Management
- ✅ Automatic cleanup on component unmount
- ✅ Single subscription per collection
- ✅ Filtered queries to minimize data transfer

### 2. Cache Strategy
- ✅ Intelligent expiration based on data volatility
- ✅ Different storage types for different use cases
- ✅ Automatic cache invalidation on mutations

### 3. Pagination
- ✅ Load data in chunks to reduce initial load time
- ✅ Infinite scroll support with `loadMore()`
- ✅ Cursor-based pagination for consistent results

### 4. Permission-Based Filtering
- ✅ Data pre-filtered based on user permissions
- ✅ Reduces data transfer and improves security
- ✅ Automatic constraint building

## Monitoring and Debugging

### Data Monitoring Dashboard

The `DataMonitoringDashboard` component provides:
- Real-time connection status
- Cache hit rates and status
- Performance metrics
- Manual cache control
- Strategy information

### Console Logging

The system provides comprehensive logging:
```
📦 Using cached data for workers (25 min remaining)
📡 Real-time update: 5 documents in notifications
🔄 Fetching initial data from workers
✅ Fetched 50 documents from workers
💾 Cached 50 items for workers
🧹 Clearing cache for workers
```

### Performance Metrics

Track key metrics:
- Cache hit rate
- Total Firebase reads
- Real-time connection count
- Data freshness

## Best Practices

### 1. Choose the Right Strategy
- **Real-time**: Only for critical, frequently changing data
- **Cached**: For large datasets that don't change often
- **Long-term cache**: For configuration data

### 2. Cache Expiration Guidelines
- **Real-time data**: No cache (always fresh)
- **User data**: 15-30 minutes
- **Reference data**: 45-60 minutes
- **Configuration**: 120+ minutes

### 3. Query Optimization
- Use specific filters to limit data size
- Implement pagination for large collections
- Index commonly queried fields in Firestore

### 4. Memory Management
- Choose appropriate cache storage type
- Clear cache when memory usage is high
- Monitor cache size in development

## Migration Guide

### From useFirestore to useHybridFirestore

**Before:**
```typescript
const { data: workers, loading, add, update, remove } = useFirestore<Worker>('workers');
```

**After:**
```typescript
const workers = useWorkers(); // Pre-configured strategy
// OR
const workers = useHybridFirestore<Worker>('workers', { 
  strategy: FETCH_STRATEGIES.workers 
});
```

### Update Component Usage

**Before:**
```typescript
{data?.map(item => ...)}
```

**After:**
```typescript
{workers.data?.map(item => ...)}
```

## Error Handling

The hybrid strategy includes comprehensive error handling:

### Network Errors
- Automatic retry with exponential backoff
- Fallback to cached data when available
- User-friendly error messages

### Permission Errors
- Clear indication of permission issues
- Graceful degradation of functionality
- Automatic retry after authentication

### Cache Errors
- Silent fallback to direct Firebase access
- Automatic cache clearing on corruption
- No impact on application functionality

## Security Considerations

### Data Filtering
- All data is filtered based on user permissions
- No client-side security bypass possible
- Server-side validation maintained

### Cache Security
- Sensitive data not cached in localStorage
- Session-based storage for temporary data
- Automatic cache clearing on logout

## Troubleshooting

### Common Issues

1. **Data not updating**
   - Check if real-time strategy is enabled
   - Verify subscription filters
   - Clear cache manually

2. **High Firebase reads**
   - Monitor cache hit rates
   - Adjust cache expiration times
   - Review real-time filter scope

3. **Performance issues**
   - Enable pagination for large datasets
   - Use appropriate cache storage type
   - Monitor memory usage

### Debug Commands

```typescript
// Log current cache status
console.log(cache.getCacheStatus());

// Force refresh all data
workers.refresh();
farms.refresh();

// Clear all cache
cache.clearAll();
```

## Future Enhancements

1. **Background Sync**
   - Sync data in background workers
   - Offline-first capability
   - Conflict resolution

2. **Advanced Caching**
   - LRU cache implementation
   - Compression for large datasets
   - Cache warming strategies

3. **Performance Analytics**
   - Detailed read/write metrics
   - Cache effectiveness tracking
   - Automated optimization suggestions

---

This hybrid strategy provides an optimal balance between real-time capabilities and Firebase read optimization, ensuring excellent user experience while minimizing costs.
