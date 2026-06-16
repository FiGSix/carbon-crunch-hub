
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export type ProximityLevel = 'conflict' | 'warning' | 'notice' | null;

export interface AddressConflictResult {
  hasConflict: boolean;
  proximityLevel: ProximityLevel;
  distanceMeters?: number;
  matchMethod?: 'gps';
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
  excludeProposalId?: string;
}

// Proximity thresholds in meters
const CONFLICT_THRESHOLD = 50;
const WARNING_THRESHOLD = 200;
const NOTICE_THRESHOLD = 500;

function getProximityLevel(distanceMeters: number): ProximityLevel {
  if (distanceMeters <= CONFLICT_THRESHOLD) return 'conflict';
  if (distanceMeters <= WARNING_THRESHOLD) return 'warning';
  if (distanceMeters <= NOTICE_THRESHOLD) return 'notice';
  return null;
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 */
function calculateDistanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
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
 * Check if an address already exists in the proposals table.
 * Uses GPS-only matching with three proximity tiers:
 * - ≤50m: Conflict (blocks submission)
 * - ≤200m: Warning (advisory)
 * - ≤500m: Notice (advisory)
 */
export async function checkAddressConflict({
  gpsLat,
  gpsLng,
  excludeProposalId
}: AddressConflictCheck): Promise<AddressConflictResult> {
  const conflictLogger = logger.withContext({
    component: 'AddressConflictService',
    feature: 'conflict-detection'
  });

  // GPS coordinates are required for conflict detection
  if (!gpsLat || !gpsLng) {
    conflictLogger.info('No GPS coordinates provided, skipping conflict check');
    return { hasConflict: false, proximityLevel: null };
  }

  try {
    conflictLogger.info('Checking address conflict', { gpsLat, gpsLng, excludeProposalId });

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
      .neq('status', 'archived');

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
      return { hasConflict: false, proximityLevel: null };
    }

    // Find the nearest project within the notice threshold
    let nearestProposal: typeof existingProposals[0] | undefined;
    let nearestDistance = Infinity;

    for (const proposal of existingProposals) {
      const projectInfo = proposal.project_info as any;
      const existingLat = projectInfo?.gpsLat;
      const existingLng = projectInfo?.gpsLng;

      if (!existingLat || !existingLng) continue;

      const distance = calculateDistanceMeters(gpsLat, gpsLng, existingLat, existingLng);

      if (distance < nearestDistance && distance <= NOTICE_THRESHOLD) {
        nearestDistance = distance;
        nearestProposal = proposal;
      }
    }

    if (!nearestProposal) {
      conflictLogger.info('No nearby projects found within 500m');
      return { hasConflict: false, proximityLevel: null };
    }

    const roundedDistance = Math.round(nearestDistance);
    const proximityLevel = getProximityLevel(nearestDistance);

    const agentProfile = nearestProposal.profiles;
    const agentName = agentProfile 
      ? `${agentProfile.first_name || ''} ${agentProfile.last_name || ''}`.trim()
      : 'Unknown Agent';
    
    const clientData = nearestProposal.clients;
    const clientName = clientData
      ? clientData.company_name || `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim()
      : 'Unknown Client';

    conflictLogger.warn('Proximity match detected', {
      proximityLevel,
      distance: roundedDistance,
      conflictingProposalId: nearestProposal.id,
    });

    return {
      hasConflict: proximityLevel === 'conflict',
      proximityLevel,
      distanceMeters: roundedDistance,
      matchMethod: 'gps',
      conflictingProposal: {
        id: nearestProposal.id,
        agentName,
        clientName,
        createdAt: nearestProposal.created_at,
        status: nearestProposal.status
      }
    };
  } catch (error) {
    conflictLogger.error('Failed to check address conflict', { error });
    return { hasConflict: false, proximityLevel: null };
  }
}
