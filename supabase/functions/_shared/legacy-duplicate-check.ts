// Shared duplicate guard for legacy project imports.
//
// The same legacy project used to be importable any number of times (one
// project was imported 7 times in a 10-minute session), and every copy created
// its own onboarding record. This guard blocks a second import of the same
// project for the same client and site.

type MinimalClient = {
  from: (table: string) => any;
};

/** Normalise a site address for comparison: lowercase, strip punctuation, collapse whitespace. */
export function normaliseAddress(address: string | null | undefined): string {
  return (address ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface LegacyDuplicateMatch {
  id: string;
  title: string;
  signed_at: string | null;
}

/**
 * Returns an existing, non-archived, non-deleted proposal for this client that
 * represents the same site (same normalised address, or same title when no
 * address is available) — or null when the project has not been imported yet.
 */
export async function findExistingLegacyProject(
  supabase: MinimalClient,
  params: { clientId: string; systemAddress?: string | null; projectTitle: string },
): Promise<LegacyDuplicateMatch | null> {
  const { clientId, systemAddress, projectTitle } = params;

  const { data, error } = await supabase
    .from('proposals')
    .select('id, title, signed_at, content')
    .eq('client_reference_id', clientId)
    .is('archived_at', null)
    .is('deleted_at', null);

  if (error) {
    console.error('Legacy duplicate check failed:', error);
    return null; // never block an import because the check itself broke
  }

  const targetAddress = normaliseAddress(systemAddress);
  const targetTitle = (projectTitle ?? '').trim().toLowerCase();

  for (const row of data ?? []) {
    const rowAddress = normaliseAddress(row?.content?.projectInfo?.address);
    const rowTitle = (row?.title ?? '').trim().toLowerCase();

    const sameSite = targetAddress.length > 0 && rowAddress === targetAddress;
    const sameTitle = targetTitle.length > 0 && rowTitle === targetTitle;

    if (sameSite || sameTitle) {
      return { id: row.id, title: row.title, signed_at: row.signed_at };
    }
  }

  return null;
}

export function duplicateLegacyProjectError(match: LegacyDuplicateMatch): Error {
  return new Error(
    `Already imported: "${match.title}" already exists for this client (proposal ${match.id}). ` +
      `Archive or delete the existing project first if you need to re-import it.`,
  );
}
