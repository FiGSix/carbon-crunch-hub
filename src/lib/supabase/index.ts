
// Re-export all Supabase functionality from respective files
export { supabase } from './client'
export { clearCache } from './cache'
export type { UserRole } from './types'
export { 
  signUp, 
  signIn, 
  signOut, 
  getCurrentUser, 
  getUserRole 
} from './auth'
export { 
  getProfile, 
  updateProfile 
} from './profile'
