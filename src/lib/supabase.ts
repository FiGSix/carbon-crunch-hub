
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
  UserRole
} from './supabase/index'
