-- Add registration_number column to clients table
ALTER TABLE public.clients 
ADD COLUMN registration_number TEXT;