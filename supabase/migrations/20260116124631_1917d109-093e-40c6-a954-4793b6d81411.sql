-- Fix Fettercairn proposal email from nash to andrew
UPDATE proposals
SET content = jsonb_set(
  content,
  '{clientInfo,email}',
  '"andrew@fettfarm.co.za"'
),
updated_at = now()
WHERE id = 'f78ee3fb-6245-4f42-88eb-aef9d25adf81';