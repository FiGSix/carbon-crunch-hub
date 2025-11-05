

import { ClientData } from '@/hooks/clients/types';
import { ClientsTableLoading } from './table/ClientsTableLoading';
import { ClientsTableError } from './table/ClientsTableError';
import { ClientsTableEmpty } from './table/ClientsTableEmpty';
import { ClientsTableContent } from './table/ClientsTableContent';

interface ClientsTableProps {
  clients: ClientData[];
  isLoading: boolean;
  isRefreshing?: boolean;
  totalCount?: number;
  error: string | null;
  isAdmin: boolean;
  onRefresh?: () => void;
}

export function ClientsTable({ 
  clients, 
  isLoading, 
  isRefreshing = false,
  totalCount = 0,
  error, 
  isAdmin,
  onRefresh
}: ClientsTableProps) {

  // Show loading skeleton only on initial load
  if (isLoading && clients.length === 0) {
    // Loading state
    return <ClientsTableLoading onRefresh={onRefresh} />;
  }

  // Show error state if there's an error and no cached data
  if (error && clients.length === 0) {
    // Error state
    return (
      <ClientsTableError 
        error={error} 
        isRefreshing={isRefreshing} 
        onRefresh={onRefresh} 
      />
    );
  }

  // Show empty state if no clients and no error
  if (clients.length === 0 && !error && !isLoading) {
    // Empty state
    return (
      <ClientsTableEmpty 
        isAdmin={isAdmin}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}
      />
    );
  }

  // Show content with data (this handles refreshing state while showing data)
  // Rendering content
  return (
    <ClientsTableContent 
      clients={clients}
      isAdmin={isAdmin}
      isRefreshing={isRefreshing}
      onRefresh={onRefresh}
      error={error} // Pass error for inline display
    />
  );
}
