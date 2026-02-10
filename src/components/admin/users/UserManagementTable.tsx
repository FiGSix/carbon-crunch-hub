import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, MoreVertical, Shield, UserCog, Building2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
}

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
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  
  const deleteUserMutation = useDeleteUser();

  const { data: allUsers, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', roleFilter, companyFilter],
    queryFn: async () => {
      // First get profiles - fetch all users (search is done client-side for instant performance)
      let profileQuery = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (roleFilter !== 'all') {
        profileQuery = profileQuery.eq('role', roleFilter);
      }

      const { data: profiles, error: profileError } = await profileQuery;
      if (profileError) throw profileError;

      const profileIds = profiles?.map(p => p.id) || [];

      // Get AGENT company memberships (companies table)
      const { data: agentMemberships } = await supabase
        .from('company_members')
        .select('user_id, company_id, role, status')
        .eq('status', 'active')
        .in('user_id', profileIds);

      // Get CLIENT company memberships (client_companies table)
      const { data: clientMemberships } = await supabase
        .from('client_company_members')
        .select('user_id, client_company_id, role, status')
        .eq('status', 'active')
        .in('user_id', profileIds);

      // Get agent company names
      const agentCompanyIds = [...new Set(agentMemberships?.map(m => m.company_id) || [])];
      const { data: agentCompanies } = await supabase
        .from('companies')
        .select('id, company_name')
        .in('id', agentCompanyIds);

      // Get client company names
      const clientCompanyIds = [...new Set(clientMemberships?.map(m => m.client_company_id) || [])];
      const { data: clientCompanies } = await supabase
        .from('client_companies')
        .select('id, company_name')
        .in('id', clientCompanyIds);

      const usersWithCompanies: UserWithRoles[] = (profiles || []).map(profile => {
        // For agents: use company_members -> companies
        // For clients: use client_company_members -> client_companies
        const isClient = profile.role === 'client';
        
        let companyId: string | null = null;
        let companyName: string | null = null;
        let companyRole: string | null = null;
        let companyType: 'agent' | 'client' | null = null;
        let isLegacyCompany = false;

        if (isClient) {
          // Check client company membership
          const clientMembership = clientMemberships?.find(m => m.user_id === profile.id);
          const clientCompany = clientCompanies?.find(c => c.id === clientMembership?.client_company_id);
          
          if (clientMembership && clientCompany) {
            companyId = clientMembership.client_company_id;
            companyName = clientCompany.company_name;
            // Map account_admin to team_lead for display consistency
            companyRole = clientMembership.role === 'account_admin' ? 'team_lead' : clientMembership.role;
            companyType = 'client';
          } else if (profile.company_name) {
            // Fallback to legacy company_name on profile
            companyName = profile.company_name;
            isLegacyCompany = true;
          }
        } else {
          // Check agent company membership
          const agentMembership = agentMemberships?.find(m => m.user_id === profile.id);
          const agentCompany = agentCompanies?.find(c => c.id === agentMembership?.company_id);
          
          if (agentMembership && agentCompany) {
            companyId = agentMembership.company_id;
            companyName = agentCompany.company_name;
            companyRole = agentMembership.role;
            companyType = 'agent';
          } else if (profile.company_name) {
            // Fallback to legacy company_name on profile
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
        };
      });

      // Apply company filter
      if (companyFilter === 'none') {
        return usersWithCompanies.filter(u => !u.company_id && !u.is_legacy_company);
      } else if (companyFilter !== 'all') {
        return usersWithCompanies.filter(u => u.company_id === companyFilter);
      }

      return usersWithCompanies;
    },
  });

  // Get unique companies for filter (both agent and client companies)
  const { data: allCompanies } = useQuery({
    queryKey: ['all-companies-filter'],
    queryFn: async () => {
      // Fetch agent companies
      const { data: agentCompanies, error: agentError } = await supabase
        .from('companies')
        .select('id, company_name')
        .order('company_name');
      if (agentError) throw agentError;

      // Fetch client companies
      const { data: clientCompanies, error: clientError } = await supabase
        .from('client_companies')
        .select('id, company_name')
        .order('company_name');
      if (clientError) throw clientError;

      const combined: CompanyOption[] = [
        ...(agentCompanies || []).map(c => ({ ...c, type: 'agent' as const })),
        ...(clientCompanies || []).map(c => ({ ...c, type: 'client' as const })),
      ];

      // Sort combined by name
      return combined.sort((a, b) => a.company_name.localeCompare(b.company_name));
    },
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'agent':
        return 'default';
      case 'client':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      pending_approval: 'secondary',
      inactive: 'outline',
      suspended: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const handleManageRoles = (user: UserWithRoles) => {
    setSelectedUser(user);
    setRoleDialogOpen(true);
  };

  const handleDeleteUser = (user: UserWithRoles) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (userId: string) => {
    await deleteUserMutation.mutateAsync(userId);
  };

  // Client-side search filtering for instant search performance
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
      <div className="flex gap-4">
        <div className="relative flex-1">

          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="client">Client</SelectItem>
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
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.first_name || user.last_name
                      ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                      : 'N/A'}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-left">
                    {user.company_name ? (
                      user.company_id ? (
                        <button
                          onClick={() => {
                            setSelectedCompanyId(user.company_id!);
                            setCompanyDialogOpen(true);
                          }}
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
                  <TableCell>{getStatusBadge(user.agent_status)}</TableCell>
                  <TableCell>
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleManageRoles(user)}>
                          <UserCog className="h-4 w-4 mr-2" />
                          Manage Roles
                        </DropdownMenuItem>
                        {!user.company_id && user.role !== 'client' && (
                          <DropdownMenuItem onClick={() => {
                            setSelectedUser(user);
                            setLinkDialogOpen(true);
                          }}>
                            <Building2 className="h-4 w-4 mr-2" />
                            Link to Company
                          </DropdownMenuItem>
                        )}
                        {user.company_id && (
                          <DropdownMenuItem onClick={() => {
                            setSelectedCompanyId(user.company_id!);
                            setCompanyDialogOpen(true);
                          }}>
                            <Building2 className="h-4 w-4 mr-2" />
                            View Team
                          </DropdownMenuItem>
                        )}
                        {user.role !== 'admin' && (
                          <DropdownMenuItem onClick={() => handleManageRoles(user)}>
                            <Shield className="h-4 w-4 mr-2" />
                            Promote to Admin
                          </DropdownMenuItem>
                        )}
                        {currentUser?.id !== user.id && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(user)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
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

      {selectedUser && (
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
          <DeleteUserDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            user={selectedUser}
            onDelete={handleDeleteConfirm}
            isDeleting={deleteUserMutation.isPending}
          />
        </>
      )}

      <CompanyManagementDialog
        companyId={selectedCompanyId}
        open={companyDialogOpen}
        onOpenChange={(open) => {
          setCompanyDialogOpen(open);
          if (!open) {
            // Refresh user table when dialog closes after operations
            refetch();
          }
        }}
      />
    </div>
  );
}
