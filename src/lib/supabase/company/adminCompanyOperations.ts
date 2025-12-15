import { supabase } from "@/integrations/supabase/client";
import { CompanyMemberWithProfile } from "./companyOperations";

export interface CompanyWithStats {
  id: string;
  company_name: string;
  email_domain: string | null;
  created_at: string;
  created_by: string | null;
  total_members: number;
  team_leads: number;
  pending: number;
}

export interface CompanyDetails extends CompanyWithStats {
  members: CompanyMemberWithProfile[];
  pendingApprovals: CompanyMemberWithProfile[];
  companyType: 'agent' | 'client';
}

/**
 * Get all companies with member statistics (admin only)
 */
export async function getAllCompaniesForAdmin(): Promise<CompanyWithStats[]> {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('*')
    .order('company_name');

  if (error) throw error;
  if (!companies) return [];

  // Get member counts for each company
  const companiesWithStats = await Promise.all(
    companies.map(async (company) => {
      const { data: members } = await supabase
        .from('company_members')
        .select('role, status')
        .eq('company_id', company.id);

      const activemembers = members?.filter(m => m.status === 'active') || [];
      const pendingMembers = members?.filter(m => m.status === 'pending') || [];
      const teamLeads = activemembers.filter(m => m.role === 'team_lead');

      return {
        ...company,
        total_members: activemembers.length,
        team_leads: teamLeads.length,
        pending: pendingMembers.length,
      };
    })
  );

  return companiesWithStats;
}

/**
 * Get detailed company information including all members (admin only)
 * Supports BOTH agent companies (companies table) and client companies (client_companies table)
 */
export async function getCompanyDetailsForAdmin(companyId: string): Promise<CompanyDetails | null> {
  // First try agent companies table
  const { data: agentCompany } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .maybeSingle();

  if (agentCompany) {
    return buildAgentCompanyDetails(agentCompany);
  }

  // If not found, try client companies table
  const { data: clientCompany } = await supabase
    .from('client_companies')
    .select('*')
    .eq('id', companyId)
    .maybeSingle();

  if (clientCompany) {
    return buildClientCompanyDetails(clientCompany);
  }

  return null;
}

/**
 * Build company details for agent companies
 */
async function buildAgentCompanyDetails(company: any): Promise<CompanyDetails> {
  // Get all company members
  const { data: members, error: membersError } = await supabase
    .from('company_members')
    .select('*')
    .eq('company_id', company.id);

  if (membersError) throw membersError;

  // Get profiles for all members
  const userIds = members?.map(m => m.user_id) || [];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);

  const membersWithProfiles: CompanyMemberWithProfile[] = (members || []).map(member => {
    const profile = profiles?.find(p => p.id === member.user_id);
    return {
      ...member,
      role: member.role as 'team_lead' | 'member',
      status: member.status as 'pending' | 'active' | 'declined',
      profile: profile ? {
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        avatar_url: profile.avatar_url
      } : null,
    };
  });

  const activeMembers = membersWithProfiles.filter(m => m.status === 'active');
  const pendingApprovals = membersWithProfiles.filter(m => m.status === 'pending');

  return {
    ...company,
    total_members: activeMembers.length,
    team_leads: activeMembers.filter(m => m.role === 'team_lead').length,
    pending: pendingApprovals.length,
    members: activeMembers,
    pendingApprovals,
    companyType: 'agent',
  };
}

/**
 * Build company details for client companies
 */
async function buildClientCompanyDetails(company: any): Promise<CompanyDetails> {
  // Get all client company members
  const { data: members, error: membersError } = await supabase
    .from('client_company_members')
    .select('*')
    .eq('client_company_id', company.id);

  if (membersError) throw membersError;

  // Get profiles for all members
  const userIds = members?.map(m => m.user_id) || [];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);

  // Map client company member structure to the common interface
  // account_admin -> team_lead for UI consistency
  const membersWithProfiles: CompanyMemberWithProfile[] = (members || []).map(member => {
    const profile = profiles?.find(p => p.id === member.user_id);
    return {
      id: member.id,
      company_id: member.client_company_id,
      user_id: member.user_id,
      role: member.role === 'account_admin' ? 'team_lead' : 'member',
      status: member.status as 'pending' | 'active' | 'declined',
      invited_by: member.invited_by,
      approved_by: member.approved_by,
      invited_at: member.invited_at,
      approved_at: member.approved_at,
      created_at: member.created_at,
      updated_at: member.updated_at,
      // Extra client-specific field
      can_sign_agreements: member.can_sign_agreements,
      profile: profile ? {
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        avatar_url: profile.avatar_url
      } : null,
    };
  });

  const activeMembers = membersWithProfiles.filter(m => m.status === 'active');
  const pendingApprovals = membersWithProfiles.filter(m => m.status === 'pending');

  return {
    ...company,
    total_members: activeMembers.length,
    team_leads: activeMembers.filter(m => m.role === 'team_lead').length,
    pending: pendingApprovals.length,
    members: activeMembers,
    pendingApprovals,
    companyType: 'client',
  };
}

/**
 * Promote a member to team lead (admin only) - AGENT companies
 */
export async function promoteToTeamLead(memberId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('company_members')
    .update({ 
      role: 'team_lead',
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (error) throw error;
}

/**
 * Demote a team lead to regular member (admin only) - AGENT companies
 */
export async function demoteFromTeamLead(memberId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('company_members')
    .update({ 
      role: 'member',
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (error) throw error;
}

/**
 * Remove a member from company (admin only) - AGENT companies
 */
export async function removeMemberFromCompany(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('company_members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
}

/**
 * Update company details (admin only) - AGENT companies
 */
export async function updateCompanyDetails(
  companyId: string,
  updates: { company_name?: string; email_domain?: string | null }
): Promise<void> {
  const { error } = await supabase
    .from('companies')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', companyId);

  if (error) throw error;
}

/**
 * Update client company details (admin only) - CLIENT companies
 */
export async function updateClientCompanyDetails(
  companyId: string,
  updates: { company_name?: string; email_domain?: string | null }
): Promise<void> {
  const { error } = await supabase
    .from('client_companies')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', companyId);

  if (error) throw error;
}

// ============ CLIENT COMPANY OPERATIONS (admin only) ============

/**
 * Promote a member to account admin (admin only) - CLIENT companies
 */
export async function promoteToAccountAdmin(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('client_company_members')
    .update({ 
      role: 'account_admin',
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (error) throw error;
}

/**
 * Demote an account admin to regular member (admin only) - CLIENT companies
 */
export async function demoteFromAccountAdmin(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('client_company_members')
    .update({ 
      role: 'member',
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (error) throw error;
}

/**
 * Remove a member from client company (admin only) - CLIENT companies
 */
export async function removeClientMemberFromCompany(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('client_company_members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
}

/**
 * Update signing permission for client company member (admin only)
 */
export async function updateClientSigningPermission(memberId: string, canSign: boolean): Promise<void> {
  const { error } = await supabase
    .from('client_company_members')
    .update({ 
      can_sign_agreements: canSign,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (error) throw error;
}

/**
 * Approve a client member (admin only)
 */
export async function approveClientMemberAdmin(memberId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('client_company_members')
    .update({
      status: 'active',
      approved_by: userId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (error) throw error;
}

/**
 * Decline a client member (admin only)
 */
export async function declineClientMemberAdmin(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('client_company_members')
    .update({
      status: 'declined',
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (error) throw error;
}
