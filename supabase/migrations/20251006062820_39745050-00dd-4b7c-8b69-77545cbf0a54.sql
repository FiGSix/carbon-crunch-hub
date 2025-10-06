-- Fix profiles table to prevent public access to sensitive PII
-- Add explicit denial for anonymous users and ensure only authenticated users can access

-- First, verify RLS is enabled (should already be, but confirming)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with proper PERMISSIVE type
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- Add explicit DENY policy for anonymous users (applies before other policies)
-- This blocks all access from unauthenticated users
CREATE POLICY "Block all anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Recreate SELECT policy - users can view their own profile, admins can view all
CREATE POLICY "Users can view own profile, admins view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR 
  is_current_user_admin()
);

-- Recreate INSERT policy - only allow creating own profile
CREATE POLICY "Users can create own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Recreate UPDATE policy - users can update own profile, admins can update any
CREATE POLICY "Users can update own profile, admins update all"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id OR 
  is_current_user_admin()
);

-- Recreate DELETE policy - users can delete own profile, admins can delete agents
CREATE POLICY "Users can delete own profile, admins delete agents"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  auth.uid() = id OR 
  (is_current_user_admin() AND role = 'agent')
);