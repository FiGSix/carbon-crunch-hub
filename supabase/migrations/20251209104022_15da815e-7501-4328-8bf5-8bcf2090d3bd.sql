-- Fix Shaun's client team access: create company and membership records
-- Step 1: Create company for Radiant Africa
INSERT INTO public.client_companies (company_name, email_domain, created_by)
VALUES ('Radiant Africa', 'radiant.africa', 'b8e5e997-ade1-4896-b652-558096a5351f')
ON CONFLICT DO NOTHING;

-- Step 2: Add Shaun as account admin
INSERT INTO public.client_company_members (
  client_company_id,
  user_id,
  role,
  status,
  can_sign_agreements
)
SELECT 
  cc.id,
  'b8e5e997-ade1-4896-b652-558096a5351f',
  'account_admin',
  'active',
  true
FROM client_companies cc
WHERE cc.email_domain = 'radiant.africa'
ON CONFLICT DO NOTHING;

-- Step 3: Create trigger function for automatic client company creation
CREATE OR REPLACE FUNCTION public.auto_create_client_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain TEXT;
  v_company_id UUID;
  v_company_name TEXT;
BEGIN
  -- Only process client role profiles
  IF NEW.role != 'client' THEN
    RETURN NEW;
  END IF;
  
  -- Check if user already has a company membership
  IF EXISTS (
    SELECT 1 FROM client_company_members 
    WHERE user_id = NEW.id AND status = 'active'
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Extract corporate domain from email
  v_domain := public.extract_corporate_domain(NEW.email);
  
  -- Use company_name from profile or derive from email domain
  v_company_name := COALESCE(
    NULLIF(TRIM(NEW.company_name), ''),
    INITCAP(REPLACE(SPLIT_PART(NEW.email, '@', 2), '.', ' '))
  );
  
  -- Check if a company with this domain already exists
  IF v_domain IS NOT NULL THEN
    SELECT id INTO v_company_id
    FROM client_companies
    WHERE email_domain = v_domain
    LIMIT 1;
  END IF;
  
  -- If no existing company found, create one
  IF v_company_id IS NULL THEN
    INSERT INTO client_companies (company_name, email_domain, created_by)
    VALUES (v_company_name, v_domain, NEW.id)
    RETURNING id INTO v_company_id;
  END IF;
  
  -- Add user as account_admin of the company
  INSERT INTO client_company_members (
    client_company_id,
    user_id,
    role,
    status,
    can_sign_agreements,
    invited_by
  ) VALUES (
    v_company_id,
    NEW.id,
    'account_admin',
    'active',
    true,
    NEW.id
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Step 4: Create trigger on profiles table
DROP TRIGGER IF EXISTS on_client_profile_created ON public.profiles;
CREATE TRIGGER on_client_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_client_company();

-- Step 5: Also handle updates (in case role changes to client)
DROP TRIGGER IF EXISTS on_profile_role_changed_to_client ON public.profiles;
CREATE TRIGGER on_profile_role_changed_to_client
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role != 'client' AND NEW.role = 'client')
  EXECUTE FUNCTION public.auto_create_client_company();