
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

    // Build the query to check for existing proposals with the same address in project_info JSON
    let query = supabase
      .from('proposals')
      .select(`
        id,
        project_info,
        status,
        created_at,
        profiles!proposals_agent_id_fkey (
          first_name,
          last_name
        ),
        clients!proposals_client_reference_id_fkey (
          company_name,
          first_name,
          last_name
        )
      `)
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
      conflictLogger.info('No proposals found to check');
      return { hasConflict: false };
    }

    // Filter proposals by matching address from project_info JSON
    const conflictingProposal = existingProposals.find(proposal => {
      const projectInfo = proposal.project_info as any;
      
      // Extract address components from the project_info JSON
      const proposalAddress = projectInfo?.address || '';
      
      // For now, we'll do a simple address string comparison
      // This could be enhanced with more sophisticated address parsing
      const inputAddress = `${street} ${city} ${state} ${zipCode}`.toLowerCase().trim();
      const existingAddress = proposalAddress.toLowerCase().trim();
      
      // Check if addresses are similar (contains all components)
      return inputAddress === existingAddress || 
             (proposalAddress.includes(street) && 
              proposalAddress.includes(city) && 
              proposalAddress.includes(state) && 
              proposalAddress.includes(zipCode));
    });

    if (!conflictingProposal) {
      conflictLogger.info('No address conflict found');
      return { hasConflict: false };
    }

    // Found a conflict - return details of the conflicting proposal
    const agentProfile = conflictingProposal.profiles;
    const agentName = agentProfile 
      ? `${agentProfile.first_name || ''} ${agentProfile.last_name || ''}`.trim()
      : 'Unknown Agent';
    
    const clientData = conflictingProposal.clients;
    const clientName = clientData
      ? clientData.company_name || `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim()
      : 'Unknown Client';

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
