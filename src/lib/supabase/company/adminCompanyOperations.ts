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
 */
export async function getCompanyDetailsForAdmin(companyId: string): Promise<CompanyDetails | null> {
  // Get company basic info
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  if (companyError) throw companyError;
  if (!company) return null;

  // Get all company members
  const { data: members, error: membersError } = await supabase
    .from('company_members')
    .select('*')
    .eq('company_id', companyId);

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
  };
}

/**
 * Promote a member to team lead (admin only)
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
 * Demote a team lead to regular member (admin only)
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
 * Remove a member from company (admin only)
 */
export async function removeMemberFromCompany(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('company_members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
}

/**
 * Update company details (admin only)
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
