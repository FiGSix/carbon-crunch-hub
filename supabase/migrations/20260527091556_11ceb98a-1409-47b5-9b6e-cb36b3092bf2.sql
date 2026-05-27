
-- Cora Black persona rollout for the Sales Agent

-- 1. Update default values + current row on sales_agent_settings
ALTER TABLE public.sales_agent_settings
  ALTER COLUMN mailbox_address SET DEFAULT 'cora@crunchcarbon.com',
  ALTER COLUMN bookings_cta_label SET DEFAULT 'Pick a 30-min slot with Shaun';

UPDATE public.sales_agent_settings
SET
  mailbox_address = 'cora@crunchcarbon.com',
  bookings_cta_label = 'Pick a 30-min slot with Shaun',
  ai_style_notes = COALESCE(NULLIF(ai_style_notes, ''),
$$Persona: You are Cora Black, Partner Co-ordinator at Crunch Carbon. You coordinate intros between solar EPCs / installers and Shaun Slabber (CEO).
Voice rules:
- Confident, efficient, warm-but-controlled, action-led, subtly premium.
- 60-110 words. 2-3 short paragraphs. Plain English, no jargon.
- No hype, no exclamation stacks, no emojis, no AI-chatbot phrasing ("I hope this finds you well", "As an AI", "I would love to").
- Never invent calendar times, pricing, or commercial terms.
- Always close with one clear next step pointing to the booking link.
- Do NOT write a sign-off or signature — these are appended automatically.$$)
WHERE id = true;

-- 2. Strip baked-in sign-offs from outreach_sequences step body_templates and tighten into Cora voice.
UPDATE public.outreach_sequences
SET steps = '[
  {
    "day_offset": 0,
    "subject": "Quick question about {{company_name}}",
    "cta_label": "Book a 30-min intro",
    "cta_url": "https://crunchcarbon.com/contact",
    "body_template": "Hi {{first_name}},\n\nI came across {{company_name}} while mapping solar EPCs in {{location}}. We help installers turn already-built solar projects into recurring carbon-credit revenue for their clients — no extra hardware, no upfront cost.\n\nWorth a 15-min call with Shaun, our CEO, to see if it fits?"
  },
  {
    "day_offset": 3,
    "subject": "Re: Quick question about {{company_name}}",
    "cta_label": "Send the overview",
    "cta_url": "https://crunchcarbon.com/contact",
    "body_template": "Hi {{first_name}},\n\nQuick follow-up — most EPCs we work with add 5–15% extra revenue per project by including carbon credits in their proposals.\n\nHappy to send a 2-minute overview, or hold a slot with Shaun this week. What works?"
  },
  {
    "day_offset": 7,
    "subject": "Last one — {{company_name}} + carbon credits",
    "cta_label": "Learn more",
    "cta_url": "https://crunchcarbon.com",
    "body_template": "Hi {{first_name}},\n\nI''ll stop following up after this. If recurring revenue from your existing solar installs ever becomes a priority, just reply and I''ll put time with Shaun on the calendar.\n\nWishing you a strong quarter."
  }
]'::jsonb
WHERE id = '087685c3-a03e-40b6-b868-a44bdc89502e';

-- 3. Same rewrite for the matching outreach_template_variants
UPDATE public.outreach_template_variants
SET body_template = 'Hi {{first_name}},\n\nI came across {{company_name}} while mapping solar EPCs in {{location}}. We help installers turn already-built solar projects into recurring carbon-credit revenue for their clients — no extra hardware, no upfront cost.\n\nWorth a 15-min call with Shaun, our CEO, to see if it fits?'
WHERE id = 'cec04e57-16be-45f8-8d7d-566dc5a72b2d';

UPDATE public.outreach_template_variants
SET body_template = 'Hi {{first_name}},\n\nQuick follow-up — most EPCs we work with add 5–15% extra revenue per project by including carbon credits in their proposals.\n\nHappy to send a 2-minute overview, or hold a slot with Shaun this week. What works?'
WHERE id = 'cd921329-a18e-4335-b0d8-27c9418c1e7d';

UPDATE public.outreach_template_variants
SET body_template = 'Hi {{first_name}},\n\nI''ll stop following up after this. If recurring revenue from your existing solar installs ever becomes a priority, just reply and I''ll put time with Shaun on the calendar.\n\nWishing you a strong quarter.'
WHERE id = '5c860358-8add-4169-8d77-bb835cac9bf6';
