
/**
 * @fileoverview Main entry point for auth context
 * All components should import from '@/contexts/auth'
 */

export { AuthProvider } from './AuthProvider';
export { useAuth } from './useAuth';
export type { AuthContextType, UserProfile, UserRole } from './types';
