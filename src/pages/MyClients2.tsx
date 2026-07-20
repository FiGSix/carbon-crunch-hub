import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SimpleClientsTable2 } from '@/components/clients/SimpleClientsTable2';
import { ClientsTableSkeleton } from '@/components/clients/ClientsTableSkeleton';
import { useClients } from '@/hooks/clients';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { AlertCircle, Search, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { AccessNotEnabled } from '@/components/common/AccessNotEnabled';

export default function MyClients2() {
  const { userRole, profile } = useAuth();

  if (profile?.role === 'super_partner' && !profile?.can_create_proposals) {
    return (
      <DashboardLayout>
        <AccessNotEnabled
          title="Access not enabled"
          description="Direct client management is not enabled on your account. Please contact your administrator to request access."
        />
      </DashboardLayout>
    );
  }

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const {
    clients,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    refresh,
    loadMore,
    totalCount,
  } = useClients({ paginated: true, pageSize: 50, search: debouncedSearch });

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Clients</h1>
            <p className="text-muted-foreground mt-2">
              Manage your client relationships and projects
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search all clients by name, email, or company…"
            className="pl-9 pr-9"
            aria-label="Search clients"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <ClientsTableSkeleton rows={10} isAdmin={userRole === 'admin'} />
        ) : (
          <SimpleClientsTable2
            clients={clients}
            onRefresh={refresh}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            totalCount={totalCount}
            onLoadMore={loadMore}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
