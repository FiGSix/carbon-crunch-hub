import { useState } from 'react';
import { ClientData } from '@/hooks/clients/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Percent } from 'lucide-react';
import { EditClientDialog } from './EditClientDialog';
import { PortfolioClientShareDialog } from './PortfolioClientShareDialog';
import { useAuth } from '@/contexts/auth';

interface SimpleClientsTable2Props {
  clients: ClientData[];
  onRefresh: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  totalCount?: number;
  onLoadMore?: () => void;
}

export function SimpleClientsTable2({ 
  clients, 
  onRefresh,
  isLoadingMore = false,
  hasMore = false,
  totalCount = 0,
  onLoadMore
}: SimpleClientsTable2Props) {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [portfolioClient, setPortfolioClient] = useState<ClientData | null>(null);

  return (
    <>
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="overflow-x-auto lg:overflow-visible">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold text-sm">Client Name</th>
                <th className="text-left p-4 font-semibold text-sm">Company</th>
                {isAdmin && <th className="text-left p-4 font-semibold text-sm">Agent</th>}
                <th className="text-center p-4 font-semibold text-sm">Projects</th>
                <th className="text-right p-4 font-semibold text-sm">Total MWp</th>
                <th className="text-center p-4 font-semibold text-sm">Status</th>
                <th className="text-center p-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="text-center py-12 text-muted-foreground">
                    No clients found
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr
                    key={client.client_id}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    {/* Client Name */}
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{client.client_name}</span>
                        <span className="text-sm text-muted-foreground">{client.client_email}</span>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="p-4">
                      <span className="text-sm">
                        {client.company_name || <span className="text-muted-foreground italic">Private</span>}
                      </span>
                    </td>

                    {/* Agent (Admin only) */}
                    {isAdmin && (
                      <td className="p-4">
                        <span className="text-sm">
                          {client.agent_company_name || <span className="text-muted-foreground italic">No Agent</span>}
                        </span>
                      </td>
                    )}

                    {/* Projects */}
                    <td className="p-4 text-center">
                      <span className="text-sm font-medium">{client.project_count}</span>
                    </td>

                    {/* Total MWp */}
                    <td className="p-4 text-right">
                      <span className="text-sm font-medium">{client.total_mwp.toFixed(2)} MWp</span>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <div className="flex justify-center">
                        <Badge variant={client.is_active ? 'default' : 'secondary'}>
                          {client.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingClient(client)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Client Info
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem onClick={() => setPortfolioClient(client)}>
                                <Percent className="mr-2 h-4 w-4" />
                                Company Fee % for Portfolio
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Info & Load More */}
        {clients.length > 0 && (
          <div className="border-t p-4 flex items-center justify-between bg-muted/20">
            <div className="text-sm text-muted-foreground">
              Showing {clients.length} {totalCount > 0 ? `of ${totalCount}` : ''} client{clients.length !== 1 ? 's' : ''}
            </div>
            {hasMore && onLoadMore && (
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? 'Loading...' : 'Load More'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Edit Client Dialog */}
      <EditClientDialog
        open={!!editingClient}
        onOpenChange={(open) => !open && setEditingClient(null)}
        client={editingClient}
        onSuccess={onRefresh}
      />

      {/* Portfolio Client Share Dialog */}
      <PortfolioClientShareDialog
        open={!!portfolioClient}
        onOpenChange={(open) => !open && setPortfolioClient(null)}
        client={portfolioClient}
        onSuccess={onRefresh}
      />
    </>
  );
}
