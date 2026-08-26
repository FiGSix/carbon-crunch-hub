import type { UserRole } from '@/contexts/auth/types';

/**
 * Single source of truth for where each role lands after login,
 * and where to bounce a user when a route denies them access.
 */
export function roleLandingPath(role: UserRole | undefined | null): string {
  return role === 'super_partner' ? '/super-partner/dashboard' : '/dashboard';
}
