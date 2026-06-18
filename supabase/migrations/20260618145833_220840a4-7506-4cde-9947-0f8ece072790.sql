
-- Backfill incorrect client share on unsigned referral proposals
UPDATE public.proposals p
SET client_share_percentage = CASE
  WHEN COALESCE(t.total_kwp, p.system_size_kwp) < 5000 THEN 60.20
  WHEN COALESCE(t.total_kwp, p.system_size_kwp) < 10000 THEN 63.00
  WHEN COALESCE(t.total_kwp, p.system_size_kwp) < 20000 THEN 66.50
  WHEN COALESCE(t.total_kwp, p.system_size_kwp) < 30000 THEN 68.25
  ELSE 70.00
END
FROM (
  SELECT client_reference_id, SUM(system_size_kwp) AS total_kwp
  FROM public.proposals
  WHERE deleted_at IS NULL AND client_reference_id IS NOT NULL
  GROUP BY client_reference_id
) t
WHERE p.client_reference_id = t.client_reference_id
  AND p.signed_at IS NULL
  AND p.deleted_at IS NULL
  AND (p.content ? 'referral_created' OR (p.content->>'referral_created')::boolean IS TRUE);

-- Seed default installer commission % (idempotent)
INSERT INTO public.system_settings (setting_key, setting_value, description)
SELECT 'installer_commission_percentage',
       to_jsonb(4.0),
       'Default annuity commission % paid to installers on referral-sourced projects'
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_settings WHERE setting_key = 'installer_commission_percentage'
);
