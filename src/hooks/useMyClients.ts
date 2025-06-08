
import { useSimplifiedClients } from './clients/useSimplifiedClients';

export function useMyClients() {
  console.log('=== useMyClients: Using simplified client management ===');
  
  // Use the simplified hook without complex features
  const result = useSimplifiedClients();

  console.log('=== useMyClients: Returning simplified result ===');
  console.log('Loading:', result.isLoading, 'Clients count:', result.clients.length);

  return result;
}

// Re-export types for backward compatibility
export type { ClientData } from './clients/types';
