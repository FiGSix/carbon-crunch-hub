
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface AddressConflictResult {
  hasConflict: boolean;
  distanceMeters?: number; // Distance from conflicting project (if GPS-based)
  matchMethod?: 'gps' | 'address'; // How the conflict was detected
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
  gpsLat?: number;
  gpsLng?: number;
  excludeProposalId?: string; // Exclude current proposal when editing
}

// Distance threshold in meters - projects within this distance are considered conflicts
const CONFLICT_DISTANCE_THRESHOLD_METERS = 50;

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if an address already exists in the proposals table
 */
export async function checkAddressConflict({
  street,
  city,
  state,
  zipCode,
  gpsLat,
  gpsLng,
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
      gpsLat,
      gpsLng,
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

    // Filter proposals by matching - GPS-based (primary) or address-based (fallback)
    let conflictingProposal: typeof existingProposals[0] | undefined;
    let conflictDistance: number | undefined;
    let matchMethod: 'gps' | 'address' | undefined;

    for (const proposal of existingProposals) {
      const projectInfo = proposal.project_info as any;
      const existingLat = projectInfo?.gpsLat;
      const existingLng = projectInfo?.gpsLng;

      // GPS-based check (primary method) - most accurate
      if (gpsLat && gpsLng && existingLat && existingLng) {
        const distance = calculateDistanceMeters(
          gpsLat, gpsLng, existingLat, existingLng
        );

        if (distance <= CONFLICT_DISTANCE_THRESHOLD_METERS) {
          conflictingProposal = proposal;
          conflictDistance = Math.round(distance);
          matchMethod = 'gps';
          conflictLogger.info('GPS-based conflict detected', { distance, threshold: CONFLICT_DISTANCE_THRESHOLD_METERS });
          break;
        }
        // If both have GPS but are far apart, they're NOT conflicts
        // (even if address strings look similar)
        continue;
      }

      // Fallback to address string matching (only if GPS unavailable on either side)
      const proposalAddress = projectInfo?.address || '';
      if (proposalAddress && street && city) {
        const inputAddress = `${street} ${city} ${state} ${zipCode}`.toLowerCase().trim();
        const existingAddress = proposalAddress.toLowerCase().trim();

        const isAddressMatch = inputAddress === existingAddress ||
          (street && proposalAddress.toLowerCase().includes(street.toLowerCase()) &&
           city && proposalAddress.toLowerCase().includes(city.toLowerCase()) &&
           state && proposalAddress.toLowerCase().includes(state.toLowerCase()) &&
           zipCode && proposalAddress.toLowerCase().includes(zipCode.toLowerCase()));

        if (isAddressMatch) {
          conflictingProposal = proposal;
          matchMethod = 'address';
          conflictLogger.info('Address-based conflict detected (GPS unavailable)');
          break;
        }
      }
    }

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
      distanceMeters: conflictDistance,
      matchMethod,
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
