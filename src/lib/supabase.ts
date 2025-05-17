
// This file is kept for backward compatibility
// It re-exports all functionality from the refactored modules

export {
  supabase,
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getUserRole,
  refreshSession,
  getProfile,
  updateProfile,
} from '@/integrations/supabase/client'

// Re-export types using the proper 'export type' syntax
export type { UserRole } from '@/lib/supabase/types'
