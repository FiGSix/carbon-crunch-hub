
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// These environment variables are set automatically in Lovable
// when you connect to Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Types for our user roles
export type UserRole = 'client' | 'agent' | 'admin'

// Auth related functions
export async function signUp(email: string, password: string, role: UserRole, metadata: Record<string, any> = {}) {
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  return { user: data.user, error }
}

export async function getUserRole() {
  const { user, error } = await getCurrentUser()
  if (error || !user) {
    return { role: null, error }
  }
  
  const role = user.user_metadata?.role as UserRole
  return { role, error: null }
}
