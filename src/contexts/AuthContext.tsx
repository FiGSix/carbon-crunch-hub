
// This file exists for backward compatibility
// All new code should import from '@/contexts/auth' instead
import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './auth/useAuth';

export { AuthProvider, useAuth };
export default { AuthProvider, useAuth };
