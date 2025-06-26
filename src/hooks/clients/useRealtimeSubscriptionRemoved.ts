
// This file has been removed as part of optimization
// Real-time subscriptions have been consolidated into individual hooks
// to avoid redundant subscriptions and improve performance.

// If you need real-time functionality, implement it directly in the
// specific hooks where it's needed with proper cleanup.

export function useRealtimeSubscriptionDeprecated() {
  console.warn('useRealtimeSubscription has been deprecated. Use individual hook subscriptions instead.');
  return { cleanup: () => {} };
}
