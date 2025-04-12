
// This file is kept for backward compatibility
// It re-exports all functionality from the refactored modules

export {
  supabase,
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getUserRole,
  getProfile,
  updateProfile,
} from './supabase/index'

// Re-export types using the proper 'export type' syntax
export type { UserRole } from './supabase/types'
