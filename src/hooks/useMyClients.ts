
import { useSimplifiedClients } from './clients/useSimplifiedClients';
import { ClientData, UseMyClientsResult } from './clients/types';

export function useMyClients(): UseMyClientsResult {
  console.log('=== useMyClients: Using simplified client hook ===');
  
  // Use the simplified hook without auto-refresh features
  const result = useSimplifiedClients();

  console.log('=== useMyClients: Returning result ===');
  console.log('Loading:', result.isLoading, 'Refreshing:', result.isRefreshing);
  console.log('Clients count:', result.clients.length, 'Error:', result.error);

  return result;
}

// Re-export types for backward compatibility
export type { ClientData } from './clients/types';
