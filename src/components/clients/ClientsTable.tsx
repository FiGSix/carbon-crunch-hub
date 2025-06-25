
import React from 'react';
import { ClientData } from '@/hooks/useMyClients';
import { ClientsTableLoading } from './table/ClientsTableLoading';
import { ClientsTableError } from './table/ClientsTableError';
import { ClientsTableEmpty } from './table/ClientsTableEmpty';
import { ClientsTableContent } from './table/ClientsTableContent';
import { LoadMoreButton } from './LoadMoreButton';

interface ClientsTableProps {
  clients: ClientData[];
  isLoading: boolean;
  isRefreshing?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  totalCount?: number;
  error: string | null;
  isAdmin: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
}

export function ClientsTable({ 
  clients, 
  isLoading, 
  isRefreshing = false,
  isLoadingMore = false,
  hasMore = false,
  totalCount = 0,
  error, 
  isAdmin,
  onRefresh,
  onLoadMore
}: ClientsTableProps) {
  console.log('=== ClientsTable Render ===');
  console.log('State - Loading:', isLoading, 'Refreshing:', isRefreshing, 'LoadingMore:', isLoadingMore);
  console.log('Data - Error:', error, 'Clients:', clients.length, 'HasMore:', hasMore, 'Total:', totalCount);
  console.log('Config - Is Admin:', isAdmin);

  // Show loading skeleton only on initial load
  if (isLoading && clients.length === 0) {
    console.log('Showing loading state (initial load)');
    return <ClientsTableLoading onRefresh={onRefresh} />;
  }

  // Show error state if there's an error and no cached data
  if (error && clients.length === 0) {
    console.log('Showing error state (no cached data)');
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
    console.log('Showing empty state');
    return (
      <ClientsTableEmpty 
        isAdmin={isAdmin}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}
      />
    );
  }

  // Show content with data (this handles refreshing state while showing data)
  console.log('Showing content with', clients.length, 'clients');
  return (
    <div className="space-y-4">
      <ClientsTableContent 
        clients={clients}
        isAdmin={isAdmin}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}
        error={error} // Pass error for inline display
      />
      
      {/* Load More Button */}
      {onLoadMore && (
        <LoadMoreButton
          onLoadMore={onLoadMore}
          isLoading={isLoadingMore}
          hasMore={hasMore}
          totalCount={totalCount}
          currentCount={clients.length}
        />
      )}
    </div>
  );
}
