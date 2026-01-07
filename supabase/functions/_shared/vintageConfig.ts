import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface VintageDeadlines {
  [year: string]: string; // ISO 8601 date string
}

/**
 * Get vintage deadlines from system settings
 */
export async function getVintageDeadlines(supabase: ReturnType<typeof createClient>): Promise<VintageDeadlines> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'vintage_deadlines')
      .maybeSingle();

    if (error) {
      console.error("Error fetching vintage deadlines:", error);
      return {};
    }

    return (data?.setting_value as VintageDeadlines) || {};
  } catch (error) {
    console.error("Failed to fetch vintage deadlines:", error);
    return {};
  }
}

/**
 * Get the minimum vintage year that is still open for submissions
 * Returns the earliest year whose deadline hasn't passed, or current year
 */
export async function getMinimumVintageYear(supabase: ReturnType<typeof createClient>): Promise<number> {
  const currentYear = new Date().getFullYear();
  const deadlines = await getVintageDeadlines(supabase);
  const now = new Date();

  // Check all configured deadlines
  for (const [yearStr, deadlineStr] of Object.entries(deadlines)) {
    const year = parseInt(yearStr);
    const deadline = new Date(deadlineStr);

    // If deadline is in the future and year is less than current year
    if (deadline > now && year < currentYear) {
      return year;
    }
  }

  // Default to current year
  return currentYear;
}

/**
 * Check if a specific vintage year is still open for submissions
 */
export function isVintageOpen(deadlines: VintageDeadlines, year: number): boolean {
  const now = new Date();
  const deadlineStr = deadlines[year.toString()];
  
  if (deadlineStr) {
    const deadline = new Date(deadlineStr);
    return deadline > now;
  }

  // If no deadline configured, vintage is open if year >= current year
  return year >= new Date().getFullYear();
}

/**
 * Get the next open vintage deadline (for countdown display)
 */
export function getNextVintageDeadline(deadlines: VintageDeadlines): { year: number; deadline: Date } | null {
  const now = new Date();
  let earliest: { year: number; deadline: Date } | null = null;

  for (const [yearStr, deadlineStr] of Object.entries(deadlines)) {
    const deadline = new Date(deadlineStr);
    if (deadline > now) {
      if (!earliest || deadline < earliest.deadline) {
        earliest = { year: parseInt(yearStr), deadline };
      }
    }
  }

  return earliest;
}
