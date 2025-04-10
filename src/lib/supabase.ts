
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Use the environment variables or direct values from the client.ts file if needed
const supabaseUrl = "https://uyjryuopuqgmsvayiccl.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5anJ5dW9wdXFnbXN2YXlpY2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNzU2MzgsImV4cCI6MjA1OTg1MTYzOH0.M828t6sJxh4lZAVACqpRosoRvW_VibHDAMSXV-3WrLo"

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

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
    console.log("Error getting user or user is null:", error)
    return { role: null, error }
  }
  
  // First check user_metadata which is the primary location
  let role = user.user_metadata?.role as UserRole
  
  // If not found in user_metadata, try to fetch from the profiles table
  if (!role) {
    console.log("Role not found in user_metadata, checking profiles table")
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.log("Error fetching profile:", profileError)
      return { role: null, error: profileError }
    }
    
    if (profile && profile.role) {
      role = profile.role as UserRole
      console.log("Found role in profiles table:", role)
    }
  } else {
    console.log("Found role in user_metadata:", role)
  }
  
  return { role, error: null }
}

// Profile related functions
export async function getProfile() {
  const { user, error: userError } = await getCurrentUser()
  if (userError || !user) {
    return { profile: null, error: userError }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { profile: data, error }
}

export async function updateProfile(updates: Partial<{
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  terms_accepted_at: string | null;
}>) {
  const { user, error: userError } = await getCurrentUser()
  if (userError || !user) {
    return { error: userError }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  return { data, error }
}
