# Fix: Company logo upload denied for Super Partners

## Root cause

The `company-logos` bucket has three RLS policies on `storage.objects` (INSERT/UPDATE/DELETE) that require the uploader's profile to have `role = 'agent'`:

```
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'agent')
```

When a Super Partner uploads, the row insert is rejected by RLS, and the frontend translates the storage 4xx into:
> "Storage permissions need to be configured. The bucket exists but you don't have upload access."

We recently enabled the Company Information card for Super Partners, but never widened the storage policies — that's the mismatch.

## Fix (migration only — no app code changes)

Replace the three role-gated policies so any authenticated user whose `profiles.role` is one of `agent`, `super_partner`, or `admin` can manage objects in their own `auth.uid()/...` folder of `company-logos`. SELECT policy ("Anyone can view company logos") stays unchanged.

```sql
-- Drop old agent-only policies
DROP POLICY "Agents can upload their company logos" ON storage.objects;
DROP POLICY "Agents can update their company logos" ON storage.objects;
DROP POLICY "Agents can delete their company logos" ON storage.objects;

-- Recreate for agent + super_partner + admin
CREATE POLICY "Partners can upload their company logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-logos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('agent', 'super_partner', 'admin')
  )
);

CREATE POLICY "Partners can update their company logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('agent', 'super_partner', 'admin')
  )
);

CREATE POLICY "Partners can delete their company logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('agent', 'super_partner', 'admin')
  )
);
```

## Out of scope

- No changes to `useFileUpload`, `CompanyLogoUpload`, or the profile form.
- Bucket itself is untouched (already exists, public read).
- Avatars bucket is unrelated and not modified.

## Verification

After the migration, sign in as a Super Partner → Profile → upload a logo. Expect success and the signed URL to render in the preview.
