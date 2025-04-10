
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// These environment variables are set automatically in Lovable
// when you connect to Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Create a dummy client when environment variables are not available
// This happens before the Supabase integration is connected
const isMissingCredentials = !supabaseUrl || !supabaseAnonKey

// Show a helpful error message in development
if (isMissingCredentials && import.meta.env.DEV) {
  console.warn(
    '⚠️ Supabase credentials are missing. Please connect to Supabase in Lovable by clicking the green Supabase button in the top right corner.'
  )
}

export const supabase = isMissingCredentials
  ? createClient('https://placeholder-url.supabase.co', 'placeholder-key')
  : createClient<Database>(supabaseUrl, supabaseAnonKey)

// Types for our user roles
export type UserRole = 'client' | 'agent' | 'admin'

// Auth related functions
export async function signUp(email: string, password: string, role: UserRole, metadata: Record<string, any> = {}) {
  if (isMissingCredentials) {
    console.warn('⚠️ Cannot sign up: Supabase is not connected')
    return { data: null, error: new Error('Supabase is not connected') }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        ...metadata,
      },
    },
  })
  
  return { data, error }
}

export async function signIn(email: string, password: string) {
  if (isMissingCredentials) {
    console.warn('⚠️ Cannot sign in: Supabase is not connected')
    return { data: null, error: new Error('Supabase is not connected') }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  return { data, error }
}

export async function signOut() {
  if (isMissingCredentials) {
    console.warn('⚠️ Cannot sign out: Supabase is not connected')
    return { error: new Error('Supabase is not connected') }
  }

  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getCurrentUser() {
  if (isMissingCredentials) {
    console.warn('⚠️ Cannot get current user: Supabase is not connected')
    return { user: null, error: new Error('Supabase is not connected') }
  }

  const { data, error } = await supabase.auth.getUser()
  return { user: data.user, error }
}

export async function getUserRole() {
  if (isMissingCredentials) {
    console.warn('⚠️ Cannot get user role: Supabase is not connected')
    return { role: null, error: new Error('Supabase is not connected') }
  }

  const { user, error } = await getCurrentUser()
  if (error || !user) {
    return { role: null, error }
  }
  
  const role = user.user_metadata?.role as UserRole
  return { role, error: null }
}
