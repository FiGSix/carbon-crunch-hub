
// This file is kept for backward compatibility
// It re-exports all functionality from the refactored modules

export {
  supabase,
} from '@/integrations/supabase/client'

export {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getUserRole,
  refreshSession,
} from '@/lib/supabase/auth'

export {
  getProfile,
  updateProfile,
} from '@/lib/supabase/profile'

// Re-export types using the proper 'export type' syntax
export type { UserRole } from '@/lib/supabase/types'
