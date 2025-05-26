
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface AddressConflictResult {
  hasConflict: boolean;
  conflictingProposal?: {
    id: string;
    agentName: string;
    clientName: string;
    createdAt: string;
    status: string;
  } | null;
}

export interface AddressConflictCheck {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  excludeProposalId?: string; // Exclude current proposal when editing
}

/**
 * Check if an address already exists in the proposals table
 */
export async function checkAddressConflict({
  street,
  city,
  state,
  zipCode,
  excludeProposalId
}: AddressConflictCheck): Promise<AddressConflictResult> {
  const conflictLogger = logger.withContext({
    component: 'AddressConflictService',
    feature: 'conflict-detection'
  });

  try {
    conflictLogger.info('Checking address conflict', {
      street,
      city,
      state,
      zipCode,
      excludeProposalId
    });

    // Build the query to check for existing proposals with the same address
    let query = supabase
      .from('proposals')
      .select(`
        id,
        project_street,
        project_city,
        project_state,
        project_zip_code,
        status,
        created_at,
        profiles!proposals_agent_id_fkey (
          first_name,
          last_name
        ),
        clients (
          client_name
        )
      `)
      .eq('project_street', street.trim())
      .eq('project_city', city.trim())
      .eq('project_state', state.trim())
      .eq('project_zip_code', zipCode.trim())
      .neq('status', 'archived'); // Don't check archived proposals

    // Exclude current proposal if editing
    if (excludeProposalId) {
      query = query.neq('id', excludeProposalId);
    }

    const { data: existingProposals, error } = await query;

    if (error) {
      conflictLogger.error('Error checking address conflict', { error });
      throw error;
    }

    if (!existingProposals || existingProposals.length === 0) {
      conflictLogger.info('No address conflict found');
      return { hasConflict: false };
    }

    // Found a conflict - return details of the first matching proposal
    const conflictingProposal = existingProposals[0];
    const agentName = conflictingProposal.profiles 
      ? `${conflictingProposal.profiles.first_name} ${conflictingProposal.profiles.last_name}`
      : 'Unknown Agent';
    
    const clientName = conflictingProposal.clients?.client_name || 'Unknown Client';

    conflictLogger.warn('Address conflict detected', {
      conflictingProposalId: conflictingProposal.id,
      agentName,
      clientName
    });

    return {
      hasConflict: true,
      conflictingProposal: {
        id: conflictingProposal.id,
        agentName,
        clientName,
        createdAt: conflictingProposal.created_at,
        status: conflictingProposal.status
      }
    };
  } catch (error) {
    conflictLogger.error('Failed to check address conflict', { error });
    // Return no conflict on error to avoid blocking users
    return { hasConflict: false };
  }
}
