import { useState, useMemo, useCallback, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, MoreVertical, Shield, UserCog, Building2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/services/unified/utils/withTimeout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RoleManagementDialog } from './RoleManagementDialog';
import { CompanyManagementDialog } from '@/components/admin/companies/CompanyManagementDialog';
import { LinkUserToCompanyDialog } from './LinkUserToCompanyDialog';
import { DeleteUserDialog } from './DeleteUserDialog';
import { ExportUsersButton } from './ExportUsersButton';
import { useDeleteUser } from '@/hooks/admin/useDeleteUser';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/auth/AuthContext';

interface UserWithRoles {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  created_at: string;
  agent_status: string | null;
  company_id?: string | null;
  company_name?: string | null;
  company_role?: string | null;
  is_legacy_company?: boolean;
  company_type?: 'agent' | 'client' | null;
  source?: 'profile' | 'client_record';
}

// ── Helper functions (stable, no hooks) ──
function getRoleBadgeVariant(role: string) {
  switch (role) {
    case 'admin': return 'destructive';
    case 'agent': return 'default';
    case 'client': return 'secondary';
    case 'potential_client': return 'outline';
    default: return 'outline';
  }
}

function getRoleLabel(role: string) {
  if (role === 'potential_client') return 'Potential Client';
  return role;
}

function getStatusBadge(user: UserWithRoles) {
  if (user.source === 'client_record') {
    return <Badge variant="outline" className="text-xs">Not Signed Up</Badge>;
  }
  if (!user.agent_status) return null;
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    pending_approval: 'secondary',
    inactive: 'outline',
    suspended: 'destructive',
  };
  return (
    <Badge variant={variants[user.agent_status] || 'outline'}>
      {user.agent_status.replace('_', ' ')}
    </Badge>
  );
}

// ── Memoized row component defined OUTSIDE parent ──
const UserRow = memo(function UserRow({
  user,
  currentUserId,
  onManageRoles,
  onDeleteUser,
  onLinkToCompany,
  onViewCompany,
}: {
  user: UserWithRoles;
  currentUserId: string | undefined;
  onManageRoles: (user: UserWithRoles) => void;
  onDeleteUser: (user: UserWithRoles) => void;
  onLinkToCompany: (user: UserWithRoles) => void;
  onViewCompany: (companyId: string) => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        {user.first_name || user.last_name
          ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
          : 'N/A'}
      </TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>
        <Badge variant={getRoleBadgeVariant(user.role)}>
          {getRoleLabel(user.role)}
        </Badge>
      </TableCell>
      <TableCell className="text-left">
        {user.company_name ? (
          user.company_id ? (
            <button
              onClick={() => onViewCompany(user.company_id!)}
              className="text-primary hover:underline text-sm"
            >
              {user.company_name}
            </button>
          ) : (
            <span className="text-muted-foreground text-sm">
              {user.company_name}
            </span>
          )
        ) : (
          <Badge variant="outline" className="text-xs">No Company</Badge>
        )}
      </TableCell>
      <TableCell>
        {user.company_role === 'team_lead' && user.company_id ? (
          <Badge variant="default" className="text-xs">Team Lead</Badge>
        ) : user.company_role === 'member' && user.company_id ? (
          <Badge variant="secondary" className="text-xs">Member</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell>{getStatusBadge(user)}</TableCell>
      <TableCell>
        {format(new Date(user.created_at), 'MMM d, yyyy')}
      </TableCell>
      <TableCell className="text-right">
        {user.source === 'client_record' ? (
           <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeleteUser(user)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Record
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onManageRoles(user)}>
                <UserCog className="h-4 w-4 mr-2" />
                Manage Roles
              </DropdownMenuItem>
              {!user.company_id && user.role !== 'client' && (
                <DropdownMenuItem onClick={() => onLinkToCompany(user)}>
                  <Building2 className="h-4 w-4 mr-2" />
                  Link to Company
                </DropdownMenuItem>
              )}
              {user.company_id && (
                <DropdownMenuItem onClick={() => onViewCompany(user.company_id!)}>
                  <Building2 className="h-4 w-4 mr-2" />
                  View Team
                </DropdownMenuItem>
              )}
              {user.role !== 'admin' && (
                <DropdownMenuItem onClick={() => onManageRoles(user)}>
                  <Shield className="h-4 w-4 mr-2" />
                  Promote to Admin
                </DropdownMenuItem>
              )}
              {currentUserId !== user.id && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDeleteUser(user)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete User
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
});

interface CompanyOption {
  id: string;
  company_name: string;
  type: 'agent' | 'client';
}

export function UserManagementTable() {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  
  const deleteUserMutation = useDeleteUser();

  const { data: allUsers, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', roleFilter, companyFilter, userTypeFilter],
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: () => withTimeout((async () => {
      // 1. Fetch profiles (existing logic)
      let profileQuery = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (roleFilter !== 'all' && roleFilter !== 'potential_client') {
        profileQuery = profileQuery.eq('role', roleFilter);
      }

      const { data: profiles, error: profileError } = await profileQuery;
      if (profileError) throw profileError;

      const profileIds = profiles?.map(p => p.id) || [];

      const { data: agentMemberships } = await supabase
        .from('company_members')
        .select('user_id, company_id, role, status')
        .eq('status', 'active')
        .in('user_id', profileIds);

      const { data: clientMemberships } = await supabase
        .from('client_company_members')
        .select('user_id, client_company_id, role, status')
        .eq('status', 'active')
        .in('user_id', profileIds);

      const agentCompanyIds = [...new Set(agentMemberships?.map(m => m.company_id) || [])];
      const { data: agentCompanies } = await supabase
        .from('companies')
        .select('id, company_name')
        .in('id', agentCompanyIds);

      const clientCompanyIds = [...new Set(clientMemberships?.map(m => m.client_company_id) || [])];
      const { data: clientCompanies } = await supabase
        .from('client_companies')
        .select('id, company_name')
        .in('id', clientCompanyIds);

      const usersFromProfiles: UserWithRoles[] = (profiles || []).map(profile => {
        const isClient = profile.role === 'client';
        let companyId: string | null = null;
        let companyName: string | null = null;
        let companyRole: string | null = null;
        let companyType: 'agent' | 'client' | null = null;
        let isLegacyCompany = false;

        if (isClient) {
          const clientMembership = clientMemberships?.find(m => m.user_id === profile.id);
          const clientCompany = clientCompanies?.find(c => c.id === clientMembership?.client_company_id);
          if (clientMembership && clientCompany) {
            companyId = clientMembership.client_company_id;
            companyName = clientCompany.company_name;
            companyRole = clientMembership.role === 'account_admin' ? 'team_lead' : clientMembership.role;
            companyType = 'client';
          } else if (profile.company_name) {
            companyName = profile.company_name;
            isLegacyCompany = true;
          }
        } else {
          const agentMembership = agentMemberships?.find(m => m.user_id === profile.id);
          const agentCompany = agentCompanies?.find(c => c.id === agentMembership?.company_id);
          if (agentMembership && agentCompany) {
            companyId = agentMembership.company_id;
            companyName = agentCompany.company_name;
            companyRole = agentMembership.role;
            companyType = 'agent';
          } else if (profile.company_name) {
            companyName = profile.company_name;
            isLegacyCompany = true;
          }
        }

        return {
          id: profile.id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          role: profile.role,
          created_at: profile.created_at,
          agent_status: profile.agent_status,
          company_id: companyId,
          company_name: companyName,
          company_role: companyRole,
          is_legacy_company: isLegacyCompany,
          company_type: companyType,
          source: 'profile' as const,
        };
      });

      let potentialClients: UserWithRoles[] = [];
      if (roleFilter === 'all' || roleFilter === 'potential_client') {
        const { data: unlinkedClients, error: clientError } = await supabase
          .from('clients')
          .select('id, email, first_name, last_name, company_name, created_at')
          .is('user_id', null)
          .order('created_at', { ascending: false });

        if (clientError) throw clientError;

        const profileEmails = new Set((profiles || []).map(p => p.email.toLowerCase()));

        potentialClients = (unlinkedClients || [])
          .filter(c => c.email && !profileEmails.has(c.email.toLowerCase()))
          .map(client => ({
            id: client.id,
            email: client.email,
            first_name: client.first_name,
            last_name: client.last_name,
            role: 'potential_client',
            created_at: client.created_at,
            agent_status: null,
            company_id: null,
            company_name: client.company_name,
            company_role: null,
            is_legacy_company: false,
            company_type: null,
            source: 'client_record' as const,
          }));
      }

      let merged: UserWithRoles[];
      if (userTypeFilter === 'signed_up') {
        merged = usersFromProfiles;
      } else if (userTypeFilter === 'potential') {
        merged = potentialClients;
      } else {
        merged = [...usersFromProfiles, ...potentialClients];
      }

      if (roleFilter === 'potential_client') {
        merged = merged.filter(u => u.source === 'client_record');
      }

      if (companyFilter === 'none') {
        merged = merged.filter(u => !u.company_id && !u.is_legacy_company && !u.company_name);
      } else if (companyFilter !== 'all') {
        merged = merged.filter(u => u.company_id === companyFilter);
      }

      return merged;
    })(), 15000),
  });

  const { data: allCompanies } = useQuery({
    queryKey: ['all-companies-filter'],
    queryFn: async () => {
      const { data: agentCompanies, error: agentError } = await supabase
        .from('companies')
        .select('id, company_name')
        .order('company_name');
      if (agentError) throw agentError;

      const { data: clientCompanies, error: clientError } = await supabase
        .from('client_companies')
        .select('id, company_name')
        .order('company_name');
      if (clientError) throw clientError;

      const combined: CompanyOption[] = [
        ...(agentCompanies || []).map(c => ({ ...c, type: 'agent' as const })),
        ...(clientCompanies || []).map(c => ({ ...c, type: 'client' as const })),
      ];

      return combined.sort((a, b) => a.company_name.localeCompare(b.company_name));
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Stable callbacks for row actions
  const handleManageRoles = useCallback((user: UserWithRoles) => {
    setSelectedUser(user);
    setRoleDialogOpen(true);
  }, []);

  const handleDeleteUser = useCallback((user: UserWithRoles) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  }, []);

  const handleLinkToCompany = useCallback((user: UserWithRoles) => {
    setSelectedUser(user);
    setLinkDialogOpen(true);
  }, []);

  const handleViewCompany = useCallback((companyId: string) => {
    setSelectedCompanyId(companyId);
    setCompanyDialogOpen(true);
  }, []);

  const handleDeleteConfirm = async (userId: string) => {
    await deleteUserMutation.mutateAsync(userId);
  };

  const users = useMemo(() => {
    if (!allUsers) return [];
    if (!searchTerm.trim()) return allUsers;
    
    const search = searchTerm.toLowerCase().trim();
    return allUsers.filter(user => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
      return (
        user.email.toLowerCase().includes(search) ||
        fullName.includes(search) ||
        (user.first_name && user.first_name.toLowerCase().includes(search)) ||
        (user.last_name && user.last_name.toLowerCase().includes(search))
      );
    });
  }, [allUsers, searchTerm]);

  if (isLoading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="User type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="signed_up">Signed Up</SelectItem>
            <SelectItem value="potential">Potential Clients</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="client">Client</SelectItem>
            <SelectItem value="potential_client">Potential Client</SelectItem>
          </SelectContent>
        </Select>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            <SelectItem value="none">No Company</SelectItem>
            {allCompanies?.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.company_name} ({company.type === 'client' ? 'Client' : 'Agent'})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ExportUsersButton users={users || []} />
      </div>

      {(userTypeFilter === 'potential' || roleFilter === 'potential_client') && (
        <div className="text-sm text-muted-foreground border-l-2 border-primary/40 pl-3">
          Portfolio fees and company-level settings for these clients are managed
          under <strong>My Clients</strong> and <strong>Company Management</strong>.
        </div>
      )}


      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-left">Company Name</TableHead>
              <TableHead>Company Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users && users.length > 0 ? (
              users.map((user) => (
                <UserRow
                  key={`${user.source}-${user.id}`}
                  user={user}
                  currentUserId={currentUser?.id}
                  onManageRoles={handleManageRoles}
                  onDeleteUser={handleDeleteUser}
                  onLinkToCompany={handleLinkToCompany}
                  onViewCompany={handleViewCompany}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedUser && selectedUser.source !== 'client_record' && (
        <>
          <RoleManagementDialog
            open={roleDialogOpen}
            onOpenChange={setRoleDialogOpen}
            user={selectedUser}
            onSuccess={() => {
              refetch();
              setRoleDialogOpen(false);
            }}
          />
          <LinkUserToCompanyDialog
            open={linkDialogOpen}
            onOpenChange={setLinkDialogOpen}
            user={selectedUser}
            onSuccess={() => {
              refetch();
              setLinkDialogOpen(false);
            }}
          />
        </>
      )}

      {selectedUser && (
        <DeleteUserDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          user={selectedUser}
          onDelete={handleDeleteConfirm}
          isDeleting={deleteUserMutation.isPending}
        />
      )}

      <CompanyManagementDialog
        companyId={selectedCompanyId}
        open={companyDialogOpen}
        onOpenChange={(open) => {
          setCompanyDialogOpen(open);
          if (!open) {
            refetch();
          }
        }}
      />
    </div>
  );
}
