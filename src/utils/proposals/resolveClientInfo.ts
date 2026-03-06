
import { ClientInformation } from "@/types/proposals";

/**
 * Represents live client data from the clients table
 */
export interface LiveClientRecord {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  registration_number?: string | null;
}

/**
 * Resolves client information by merging live client data with the proposal snapshot.
 * Live client data takes precedence over the snapshot to ensure current information is displayed.
 * The original snapshot is preserved in proposal.content.clientInfo for audit purposes.
 * 
 * @param snapshotClientInfo - The client info snapshot stored in proposal.content.clientInfo
 * @param clientRecord - Live client data from the clients table (optional)
 * @returns Merged client information with live data taking precedence
 */
export function resolveClientInfo(
  snapshotClientInfo: Partial<ClientInformation>,
  clientRecord?: LiveClientRecord | null
): Partial<ClientInformation> {
  // If no linked client record, return snapshot as-is
  if (!clientRecord) {
    return snapshotClientInfo;
  }

  // Build the live name from first_name and last_name
  const liveName = [clientRecord.first_name, clientRecord.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  // Live client data takes precedence over snapshot to ensure current information is displayed
  return {
    // Preserve extra snapshot fields (existingClient, address, etc.) first
    ...Object.fromEntries(
      Object.entries(snapshotClientInfo).filter(
        ([k]) => !['name','email','phone','companyName','registrationNumber'].includes(k)
      )
    ),
    // Live data wins over snapshot for core fields
    name: liveName || snapshotClientInfo.name || '',
    email: clientRecord.email || snapshotClientInfo.email || '',
    phone: clientRecord.phone || snapshotClientInfo.phone || '',
    companyName: clientRecord.company_name || snapshotClientInfo.companyName || '',
    registrationNumber: clientRecord.registration_number || snapshotClientInfo.registrationNumber,
  };
}
