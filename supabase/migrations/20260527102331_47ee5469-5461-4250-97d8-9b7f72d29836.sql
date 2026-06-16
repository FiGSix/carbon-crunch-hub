
UPDATE public.clients
SET first_name = 'Robert', company_name = 'Abendruhe Plaas'
WHERE id = '6104faa8-03f3-41a5-bf51-6c1724045f53';

UPDATE public.proposals
SET client_reference_id = '6104faa8-03f3-41a5-bf51-6c1724045f53'
WHERE id = '6e9a34e3-34d4-4640-96a4-f4db75a7d6ae';

DELETE FROM public.email_events WHERE proposal_id = 'd6493bc9-8798-478a-8340-7ef311907910';
DELETE FROM public.proposal_automation_log WHERE proposal_id = 'd6493bc9-8798-478a-8340-7ef311907910';
DELETE FROM public.proposal_engagement_buckets WHERE proposal_id = 'd6493bc9-8798-478a-8340-7ef311907910';
DELETE FROM public.proposals WHERE id = 'd6493bc9-8798-478a-8340-7ef311907910';

DELETE FROM public.clients WHERE id = '878c9f68-d4fe-4661-ab08-767dbcce99eb';
