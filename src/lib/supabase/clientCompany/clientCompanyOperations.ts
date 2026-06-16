import { supabase } from '../client';

export interface ClientCompany {
  id: string;
  company_name: string;
  registration_number: string | null;
  email_domain: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface ClientCompanyMember {
  id: string;
  client_company_id: string;
  user_id: string;
  role: 'account_admin' | 'member';
  status: 'pending' | 'active' | 'declined';
  can_sign_agreements: boolean;
  invited_by: string | null;
  approved_by: string | null;
  invited_at: string;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientCompanyMemberWithProfile extends ClientCompanyMember {
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

export interface ClientTeamInvitation {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  client_company_id: string;
  invitation_token: string;
  invited_by: string | null;
  inviter_name?: string;
  status: string;
  expires_at: string;
  created_at: string;
}

/**
 * Get user's client company information
 */
export async function getClientUserCompany(userId: string) {
  const { data, error } = await supabase
    .from('client_company_members')
    .select(`
      *,
      client_companies (*)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  return { data, error };
}

/**
 * Get all members of a client company with their profile info
 */
export async function getClientCompanyMembers(companyId: string) {
  if (!companyId) {
    return { data: null, error: new Error('Company ID is required') };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: new Error('User not authenticated') };
  }

  // Get company members
  const { data: members, error: membersError } = await supabase
    .from('client_company_members')
    .select('*')
    .eq('client_company_id', companyId)
    .in('status', ['active', 'pending'])
    .order('created_at', { ascending: false });

  if (membersError || !members) {
    return { data: null, error: membersError };
  }

  // Get profiles for all user IDs
  const userIds = members.map(m => m.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, avatar_url')
    .in('id', userIds);

  if (profilesError) {
    console.error('Error fetching member profiles:', profilesError);
    return { data: null, error: profilesError };
  }

  // Combine the data
  const combined = members.map(member => ({
    ...member,
    profile: profiles?.find(p => p.id === member.user_id) || null
  })) as ClientCompanyMemberWithProfile[];

  return { data: combined, error: null };
}

/**
 * Get pending approval requests for account admins
 */
export async function getClientPendingApprovals(companyId: string) {
  const { data: members, error: membersError } = await supabase
    .from('client_company_members')
    .select('*')
    .eq('client_company_id', companyId)
    .eq('status', 'pending')
    .order('invited_at', { ascending: true });

  if (membersError || !members) {
    return { data: null, error: membersError };
  }

  const userIds = members.map(m => m.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, avatar_url')
    .in('id', userIds);

  if (profilesError || !profiles) {
    return { data: null, error: profilesError };
  }

  const combined = members.map(member => ({
    ...member,
    profile: profiles.find(p => p.id === member.user_id) || null
  })) as ClientCompanyMemberWithProfile[];

  return { data: combined, error: null };
}

/**
 * Approve a pending member request
 */
export async function approveClientMember(memberId: string, userId: string) {
  const { data, error } = await supabase
    .from('client_company_members')
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
export async function declineClientMember(memberId: string) {
  const { data, error } = await supabase
    .from('client_company_members')
    .update({
      status: 'declined'
    })
    .eq('id', memberId)
    .select()
    .single();

  return { data, error };
}

/**
 * Create a new client company and add the creator as account admin
 */
export async function createClientCompany(
  companyName: string,
  emailDomain: string | null,
  userId: string
) {
  // Create company
  const { data: company, error: companyError } = await supabase
    .from('client_companies')
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

  // Add creator as account admin with signing rights
  const { data: membership, error: memberError } = await supabase
    .from('client_company_members')
    .insert({
      client_company_id: company.id,
      user_id: userId,
      role: 'account_admin',
      status: 'active',
      can_sign_agreements: true
    })
    .select()
    .single();

  if (memberError) {
    return { data: null, error: memberError };
  }

  return { data: { company, membership }, error: null };
}

/**
 * Check if user is account admin of their client company
 */
export async function isUserClientAccountAdmin(userId: string) {
  const { data } = await supabase
    .from('client_company_members')
    .select('role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('role', 'account_admin')
    .single();

  return !!data;
}

/**
 * Get pending client team invitations for a company
 */
export async function getPendingClientTeamInvitations(companyId: string) {
  const { data: invitations, error } = await supabase
    .from('client_team_invitations')
    .select('*')
    .eq('client_company_id', companyId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error };
  }

  // Get inviter names
  const inviterIds = invitations?.map(i => i.invited_by).filter(Boolean) || [];
  let profiles: any[] = [];
  
  if (inviterIds.length > 0) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', inviterIds);
    profiles = profileData || [];
  }

  const invitationsWithNames = invitations?.map(inv => ({
    ...inv,
    inviter_name: profiles.find(p => p.id === inv.invited_by)
      ? `${profiles.find(p => p.id === inv.invited_by)?.first_name || ''} ${profiles.find(p => p.id === inv.invited_by)?.last_name || ''}`.trim()
      : 'Unknown'
  })) || [];

  return { data: invitationsWithNames, error: null };
}

/**
 * Cancel a client team invitation
 */
export async function cancelClientTeamInvitation(invitationId: string) {
  const { data, error } = await supabase
    .from('client_team_invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId)
    .select()
    .single();

  return { data, error };
}

/**
 * Remove a client team member (account admins only)
 */
export async function removeClientTeamMember(memberId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: new Error('User not authenticated') };
  }

  // Get the member to be removed
  const { data: member, error: memberError } = await supabase
    .from('client_company_members')
    .select('*')
    .eq('id', memberId)
    .single();

  if (memberError || !member) {
    return { data: null, error: new Error('Member not found') };
  }

  // Check if requesting user is an account admin of the same company
  const { data: requesterMembership, error: requesterError } = await supabase
    .from('client_company_members')
    .select('*')
    .eq('user_id', user.id)
    .eq('client_company_id', member.client_company_id)
    .eq('role', 'account_admin')
    .eq('status', 'active')
    .single();

  if (requesterError || !requesterMembership) {
    return { data: null, error: new Error('Unauthorized: Only account admins can remove members') };
  }

  // Cannot remove yourself
  if (member.user_id === user.id) {
    return { data: null, error: new Error('Cannot remove yourself from the team') };
  }

  // Cannot remove other account admins
  if (member.role === 'account_admin') {
    return { data: null, error: new Error('Cannot remove other account admins') };
  }

  // Remove the member
  const { error: deleteError } = await supabase
    .from('client_company_members')
    .delete()
    .eq('id', memberId);

  if (deleteError) {
    return { data: null, error: deleteError };
  }

  return { data: { success: true }, error: null };
}

/**
 * Update member's can_sign_agreements permission
 */
export async function updateClientMemberSigningPermission(memberId: string, canSign: boolean) {
  const { data, error } = await supabase
    .from('client_company_members')
    .update({ can_sign_agreements: canSign })
    .eq('id', memberId)
    .select()
    .single();

  return { data, error };
}
