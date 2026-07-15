-- Apply SP recruit defaults to already-linked companies lacking an override
UPDATE public.companies c
   SET commission_override = sp.recruit_default_commission
  FROM public.profiles sp
 WHERE c.super_partner_id = sp.id
   AND sp.recruit_default_commission IS NOT NULL
   AND c.commission_override IS NULL;

-- Re-sync already-signed proposals for those companies so historical rows reflect the new rate
UPDATE public.proposals p
   SET agent_commission_percentage = c.commission_override
  FROM public.companies c
  JOIN public.company_members cm ON cm.company_id = c.id
 WHERE p.agent_id = cm.user_id
   AND c.commission_override IS NOT NULL
   AND p.signed_at IS NOT NULL
   AND p.agent_commission_percentage IS DISTINCT FROM c.commission_override;
