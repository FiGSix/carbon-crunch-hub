UPDATE public.outreach_template_variants
SET body_template = replace(replace(body_template, '\r\n', E'\n'), '\n', E'\n')
WHERE body_template LIKE '%\n%' AND position(E'\n' in body_template) = 0;