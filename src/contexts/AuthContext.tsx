
// This file exists for backward compatibility
// All new code should import from '@/contexts/auth' instead
import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './auth/useAuth';
import type { AuthContextType, UserProfile, UserRole } from './auth/types';

export { AuthProvider, useAuth };
export type { AuthContextType, UserProfile, UserRole };
export default { AuthProvider, useAuth };
