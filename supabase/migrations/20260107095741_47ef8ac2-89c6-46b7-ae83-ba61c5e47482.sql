-- Add vintage_deadlines to system_settings
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'vintage_deadlines',
  '{"2025": "2026-01-20T12:00:00+02:00"}',
  'Vintage year closing deadlines (ISO 8601 format with timezone). Projects must be submitted before this deadline to be included in the vintage year.'
)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();