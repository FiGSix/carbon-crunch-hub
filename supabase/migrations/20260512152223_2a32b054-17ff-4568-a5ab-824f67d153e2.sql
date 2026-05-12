UPDATE public.proposals
SET carbon_credits = system_size_kwp * 1642.5 * 1.0334 / 1000
WHERE id IN (
  'b49bf320-e13b-4d28-9df0-785e64de8a8d',
  '075adcea-231e-4f2c-92d5-17c435822679',
  '0a0f26c5-0ac4-4aa9-a527-63c2fe76707c',
  '5dead156-98ef-49d3-afd5-71889a1901ab'
);