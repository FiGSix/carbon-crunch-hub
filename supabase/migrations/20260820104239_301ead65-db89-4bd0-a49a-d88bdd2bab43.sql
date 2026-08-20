ALTER TABLE public.broadcast_campaigns
  ALTER COLUMN from_email SET DEFAULT 'hello@updates.crunchcarbon.com',
  ALTER COLUMN reply_to SET DEFAULT 'hello@crunchcarbon.com';

UPDATE public.broadcast_campaigns
SET from_email = 'hello@updates.crunchcarbon.com'
WHERE status = 'draft' AND from_email = 'partners@updates.crunchcarbon.com';

UPDATE public.broadcast_campaigns
SET reply_to = 'hello@crunchcarbon.com'
WHERE status = 'draft' AND reply_to = 'partners@crunchcarbon.com';