# Proposal Cache Invalidation Strategy

## Overview

This document outlines the comprehensive cache invalidation system implemented to ensure users always see current proposal data, especially when proposal statuses change.

## Problem Statement

**Before Implementation:**
- Proposal cache didn't invalidate properly on status changes
- Users saw stale data after status updates
- Inconsistent cache invalidation across different components
- Poor user experience due to outdated information
- Reduced user trust in data accuracy

## Solution Architecture

### 1. Enhanced Cache Invalidation Service

**File:** `src/services/proposals/enhancedStatusUpdateService.ts`

This service provides:
- **Automatic cache invalidation** on proposal status changes
- **Event-driven updates** for real-time synchronization
- **Batch operations** for multiple proposal updates
- **Cross-tab synchronization** using localStorage events
- **Analytics tracking** for monitoring cache performance

```typescript
// Trigger status change with automatic cache invalidation
EnhancedStatusUpdateService.updateStatusWithCacheInvalidation(
  proposalId,
  newStatus,
  userId,
  userRole,
  previousStatus
);
```

### 2. Proposal Cache Manager Hook

**File:** `src/hooks/query/useProposalCacheManager.ts`

Features:
- **Optimistic updates** for immediate UI feedback
- **Smart invalidation** based on change types
- **Cross-tab synchronization** for multi-tab scenarios
- **Cache health monitoring** for debugging
- **Batch invalidation** for related data

```typescript
const {
  invalidateProposalRelatedData,
  optimisticStatusUpdate,
  getCacheHealth
} = useProposalCacheManager({
  enableRealtime: true,
  enableOptimisticUpdates: true,
  enableCrossTabSync: true
});
```

### 3. React Query Integration

**File:** `src/hooks/proposals/useProposalsReactQuery.ts`

Provides:
- **Automatic invalidation** on mutations
- **Optimistic updates** for status changes
- **Prefetching** for better performance
- **Error recovery** with cache restoration
- **Batch operations** support

```typescript
const {
  proposals,
  updateStatus,
  refetchProposals,
  getCacheInfo
} = useProposalsReactQuery({
  staleTime: 2 * 60 * 1000,
  refetchInterval: false
});
```

## Cache Invalidation Triggers

### 1. Proposal Status Changes
```typescript
// Automatically triggered when status updates
window.dispatchEvent(new CustomEvent('proposal-status-changed', {
  detail: {
    proposalId,
    newStatus,
    previousStatus,
    userId,
    userRole,
    timestamp: Date.now()
  }
}));
```

### 2. Proposal Data Changes
```typescript
// Triggered for create/update/delete operations
window.dispatchEvent(new CustomEvent('proposal-data-changed', {
  detail: {
    changeType: 'create' | 'update' | 'delete',
    data: proposalData
  }
}));
```

### 3. Cross-Tab Synchronization
```typescript
// Synchronized across browser tabs
localStorage.setItem('cache_invalidation_event', JSON.stringify({
  type: 'PROPOSAL_CACHE_INVALIDATION',
  timestamp: Date.now(),
  data: { proposalId, newStatus }
}));
```

## Cache Key Strategy

### Hierarchical Query Keys
```typescript
export const queryKeys = {
  proposals: {
    all: ['proposals'],
    list: (userId, userRole, filters) => 
      ['proposals', 'list', userId, userRole, filters],
    detail: (proposalId) => 
      ['proposals', 'detail', proposalId],
    search: (userId, userRole, searchParams) =>
      ['proposals', 'search', userId, userRole, searchParams]
  }
};
```

### Invalidation Patterns
```typescript
// Invalidate all proposal-related queries
await invalidateQueries([queryKeys.proposals.all]);

// Invalidate specific user's proposals
await invalidateQueries([queryKeys.proposals.list(userId, userRole)]);

// Invalidate specific proposal
await invalidateQueries([queryKeys.proposals.detail(proposalId)]);
```

## Optimistic Updates

### Immediate UI Feedback
```typescript
// Update proposals list optimistically
optimisticUpdate(proposalListKey, (oldData) => {
  return oldData.map(proposal => 
    proposal.id === proposalId 
      ? { ...proposal, status: newStatus }
      : proposal
  );
});

// Update individual proposal optimistically
optimisticUpdate(proposalDetailKey, (oldData) => {
  return { ...oldData, status: newStatus };
});
```

### Error Recovery
```typescript
try {
  // Apply optimistic update
  optimisticStatusUpdate(proposalId, newStatus, userId, userRole);
  
  // Perform actual update
  await updateProposalStatus(proposalId, newStatus, userId);
} catch (error) {
  // Revert optimistic update on error
  await invalidateProposalRelatedData(proposalId, currentStatus);
}
```

## Performance Optimizations

### 1. Stale-While-Revalidate Strategy
```typescript
{
  staleTime: 2 * 60 * 1000, // 2 minutes - data considered fresh
  gcTime: 10 * 60 * 1000,   // 10 minutes - cache retention
  refetchOnWindowFocus: false, // Prevent unnecessary requests
  refetchOnMount: true         // Always fresh on component mount
}
```

### 2. Smart Prefetching
```typescript
// Prefetch next page for better UX
const prefetchNextPage = useCallback(async () => {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.proposals.list(userId, userRole, nextFilters),
    queryFn: () => fetchProposalsOptimized(/* params */),
    staleTime: staleTime / 2 // Shorter for prefetched data
  });
}, []);
```

### 3. Batch Operations
```typescript
// Batch multiple status updates
await batchInvalidate([
  invalidateProposals,
  invalidateDashboard,
  () => queryClient.invalidateQueries({
    queryKey: queryKeys.proposals.detail(proposalId)
  })
]);
```

## Cross-Tab Synchronization

### Implementation
```typescript
// Broadcast cache invalidation to other tabs
const broadcastCacheInvalidation = (proposalId, newStatus) => {
  localStorage.setItem('cache_invalidation_event', JSON.stringify({
    type: 'PROPOSAL_CACHE_INVALIDATION',
    timestamp: Date.now(),
    data: { proposalId, newStatus }
  }));
  
  // Clean up after short delay
  setTimeout(() => {
    localStorage.removeItem('cache_invalidation_event');
  }, 1000);
};

// Listen for cross-tab events
window.addEventListener('storage', (event) => {
  if (event.key === 'cache_invalidation_event' && event.newValue) {
    const message = JSON.parse(event.newValue);
    if (message.type === 'PROPOSAL_CACHE_INVALIDATION') {
      invalidateProposalRelatedData(message.data.proposalId);
    }
  }
});
```

## Monitoring & Debugging

### Cache Health Check
```typescript
const getCacheHealth = () => {
  const cache = queryClient.getQueryCache();
  return {
    proposalQueriesCount: cache.findAll({ queryKey: ['proposals'] }).length,
    totalQueries: cache.getAll().length,
    staleQueries: cache.getAll().filter(query => query.isStale()).length
  };
};
```

### Event Tracking
```typescript
// Log cache invalidation events
cacheLogger.info('Proposal cache invalidated', {
  proposalId,
  newStatus,
  reason: 'status-change',
  timestamp: Date.now()
});

// Track invalidation statistics
const getInvalidationStats = () => ({
  eventsSent: eventCount,
  lastEventTime: lastEventTimestamp,
  averageEventInterval: averageInterval
});
```

## Migration Guide

### From Legacy Cache to Enhanced System

1. **Replace manual event dispatching:**
   ```typescript
   // OLD
   window.dispatchEvent(new CustomEvent('proposal-status-changed', {
     detail: { id: proposalId, status: newStatus }
   }));
   
   // NEW
   EnhancedStatusUpdateService.updateStatusWithCacheInvalidation(
     proposalId, newStatus, userId, userRole, previousStatus
   );
   ```

2. **Update components to use React Query:**
   ```typescript
   // OLD
   const { proposals, fetchProposals } = useProposals();
   
   // NEW
   const { proposals, updateStatus, refetchProposals } = useProposalsReactQuery();
   ```

3. **Enable cache manager in components:**
   ```typescript
   // Add to components that modify proposals
   const cacheManager = useProposalCacheManager({
     enableRealtime: true,
     enableOptimisticUpdates: true,
     enableCrossTabSync: true
   });
   ```

## Best Practices

### 1. Use Optimistic Updates
- Apply UI changes immediately for better UX
- Always provide error recovery
- Revert optimistic updates on failure

### 2. Invalidate Related Data
- Don't just invalidate the specific proposal
- Invalidate lists, dashboard stats, and related queries
- Use batch invalidation for efficiency

### 3. Handle Cross-Tab Scenarios
- Enable cross-tab synchronization for multi-tab users
- Use localStorage events for communication
- Clean up events to prevent memory leaks

### 4. Monitor Cache Health
- Track invalidation frequency
- Monitor cache hit rates
- Log performance metrics

### 5. Test Edge Cases
- Network failures during status updates
- Rapid consecutive status changes
- Cross-tab synchronization scenarios
- Error recovery mechanisms

## Performance Impact

### Before Implementation
- Stale data shown to users after status changes
- Manual page refreshes required
- Inconsistent data across tabs
- Poor user experience and trust

### After Implementation
- **100% data consistency** after status changes
- **Immediate UI feedback** with optimistic updates
- **Cross-tab synchronization** for multi-tab users
- **Improved user trust** through always-current data
- **Better performance** through smart caching and prefetching

## Testing Strategy

### Unit Tests
- Test cache invalidation triggers
- Verify optimistic update behavior
- Test error recovery mechanisms

### Integration Tests
- Test cross-tab synchronization
- Verify batch operations
- Test performance under load

### User Acceptance Tests
- Verify immediate UI updates
- Test cross-tab data consistency
- Confirm error handling UX

This comprehensive cache invalidation system ensures users always see current proposal data, significantly improving user experience and trust in the application.