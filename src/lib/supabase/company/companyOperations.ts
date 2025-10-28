import { supabase } from '../client';

export interface Company {
  id: string;
  company_name: string;
  email_domain: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: 'team_lead' | 'member';
  status: 'pending' | 'active' | 'declined';
  invited_by: string | null;
  approved_by: string | null;
  invited_at: string;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyMemberWithProfile extends CompanyMember {
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

/**
 * Get user's company information
 */
export async function getUserCompany(userId: string) {
  const { data, error } = await supabase
    .from('company_members')
    .select(`
      *,
      companies (*)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  return { data, error };
}

/**
 * Get all members of a company
 */
export async function getCompanyMembers(companyId: string) {
  // First get company members
  const { data: members, error: membersError } = await supabase
    .from('company_members')
    .select('*')
    .eq('company_id', companyId)
    .in('status', ['active', 'pending'])
    .order('created_at', { ascending: false });

  if (membersError || !members) {
    return { data: null, error: membersError };
  }

  // Then get profiles for all user IDs
  const userIds = members.map(m => m.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, avatar_url')
    .in('id', userIds);

  if (profilesError || !profiles) {
    return { data: null, error: profilesError };
  }

  // Combine the data
  const combined = members.map(member => ({
    ...member,
    profile: profiles.find(p => p.id === member.user_id) || null
  })) as CompanyMemberWithProfile[];

  return { data: combined, error: null };
}

/**
 * Get pending approval requests for team leads
 */
export async function getPendingApprovals(companyId: string) {
  // First get pending members
  const { data: members, error: membersError } = await supabase
    .from('company_members')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .order('invited_at', { ascending: true });

  if (membersError || !members) {
    return { data: null, error: membersError };
  }

  // Then get profiles for all user IDs
  const userIds = members.map(m => m.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, avatar_url')
    .in('id', userIds);

  if (profilesError || !profiles) {
    return { data: null, error: profilesError };
  }

  // Combine the data
  const combined = members.map(member => ({
    ...member,
    profile: profiles.find(p => p.id === member.user_id) || null
  })) as CompanyMemberWithProfile[];

  return { data: combined, error: null };
}

/**
 * Approve a pending member request
 */
export async function approveMember(memberId: string, userId: string) {
  const { data, error } = await supabase
    .from('company_members')
    .update({
      status: 'active',
      approved_by: userId,
      approved_at: new Date().toISOString()
    })
    .eq('id', memberId)
    .select()
    .single();

  return { data, error };
}

/**
 * Decline a pending member request
 */
export async function declineMember(memberId: string) {
  const { data, error } = await supabase
    .from('company_members')
    .update({
      status: 'declined'
    })
    .eq('id', memberId)
    .select()
    .single();

  return { data, error };
}

/**
 * Invite a new member to the company
 */
export async function inviteMember(
  companyId: string,
  userId: string,
  invitedBy: string
) {
  const { data, error } = await supabase
    .from('company_members')
    .insert({
      company_id: companyId,
      user_id: userId,
      role: 'member',
      status: 'pending',
      invited_by: invitedBy
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Create a new company and add the creator as team lead
 */
export async function createCompany(
  companyName: string,
  emailDomain: string | null,
  userId: string
) {
  // Create company
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({
      company_name: companyName,
      email_domain: emailDomain,
      created_by: userId
    })
    .select()
    .single();

  if (companyError || !company) {
    return { data: null, error: companyError };
  }

  // Add creator as team lead
  const { data: membership, error: memberError } = await supabase
    .from('company_members')
    .insert({
      company_id: company.id,
      user_id: userId,
      role: 'team_lead',
      status: 'active'
    })
    .select()
    .single();

  if (memberError) {
    return { data: null, error: memberError };
  }

  return { data: { company, membership }, error: null };
}

/**
 * Find existing company by domain
 */
export async function findCompanyByDomain(domain: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('email_domain', domain)
    .single();

  return { data, error };
}

/**
 * Find existing company by name (case-insensitive)
 */
export async function findCompanyByName(companyName: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .ilike('company_name', companyName)
    .single();

  return { data, error };
}

/**
 * Check if user is team lead of their company
 */
export async function isUserTeamLead(userId: string) {
  const { data } = await supabase
    .from('company_members')
    .select('role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('role', 'team_lead')
    .single();

  return !!data;
}

/**
 * Extract corporate domain from email (returns null for personal emails)
 */
export function extractCorporateDomain(email: string): string | null {
  const personalDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'me.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain || personalDomains.includes(domain)) {
    return null;
  }
  
  return domain;
}
