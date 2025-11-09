-- Add last_activity_at column to project_onboarding for idle tracking
ALTER TABLE project_onboarding 
ADD COLUMN IF NOT EXISTS last_activity_at timestamp with time zone DEFAULT now();

-- Set initial value for existing records
UPDATE project_onboarding 
SET last_activity_at = updated_at 
WHERE last_activity_at IS NULL;

-- Create trigger function to auto-update last_activity_at
CREATE OR REPLACE FUNCTION update_onboarding_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if actual data changed (not just timestamp updates)
  IF (OLD.onboarding_complete IS DISTINCT FROM NEW.onboarding_complete
      OR OLD.data_access_verified IS DISTINCT FROM NEW.data_access_verified
      OR OLD.audit_ready IS DISTINCT FROM NEW.audit_ready) THEN
    NEW.last_activity_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on project_onboarding updates
DROP TRIGGER IF EXISTS trigger_update_onboarding_activity ON project_onboarding;
CREATE TRIGGER trigger_update_onboarding_activity
  BEFORE UPDATE ON project_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_activity();

-- Update timing configuration defaults
UPDATE system_settings
SET setting_value = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            setting_value,
            '{delivered_not_opened_days}', '2'::jsonb
          ),
          '{opened_not_clicked_days}', '4'::jsonb
        ),
        '{opened_not_clicked_repeat_days}', '4'::jsonb
      ),
      '{clicked_not_signed_days}', '6'::jsonb
    ),
    '{clicked_not_signed_repeat_days}', '6'::jsonb
  ),
  '{mark_stale_days}', '10'::jsonb
)
WHERE setting_key = 'email_automation_timing';

-- Add new post-signature timing fields
UPDATE system_settings
SET setting_value = jsonb_set(
  jsonb_set(
    jsonb_set(
      setting_value,
      '{accepted_thank_you_delay_hours}', '0'::jsonb
    ),
    '{cession_reminder_days}', '2'::jsonb
  ),
  '{onboarding_idle_days}', '5'::jsonb
)
WHERE setting_key = 'email_automation_timing';

-- Rename old template keys and add new ones
UPDATE system_settings
SET setting_value = 
  -- Remove old key and add new ones
  setting_value - 'opened_not_viewed'
  || jsonb_build_object(
    'opened_not_clicked', COALESCE(setting_value->'opened_not_viewed', jsonb_build_object(
      'subject', 'Need any clarity on {{proposalTitle}}?',
      'html', '<h2>Hi {{clientName}},</h2><p>I noticed you opened our proposal but haven''t had a chance to review it in detail yet.</p><p><strong>Need any clarification?</strong> I''m here to help answer any questions.</p><p><a href="{{proposalUrl}}">View Proposal</a></p><p>Best regards,<br>{{agentName}}</p>'
    )),
    'clicked_not_signed', jsonb_build_object(
      'subject', 'Want to schedule a quick call about {{proposalTitle}}?',
      'html', '<h2>Hi {{clientName}},</h2><p>I see you''ve reviewed the proposal - thank you!</p><p>Would you like to schedule a quick call to discuss any questions or next steps?</p><p>Feel free to reply to this email or call me directly.</p><p><a href="{{proposalUrl}}">View Proposal Again</a></p><p>Best regards,<br>{{agentName}}<br>{{agentEmail}}</p>'
    ),
    'graceful_exit', jsonb_build_object(
      'subject', 'We''ll close this for now — you''re always welcome back',
      'html', '<h2>Hi {{clientName}},</h2><p>I wanted to reach out one last time about {{proposalTitle}}.</p><p>I understand timing might not be right, and that''s completely okay. We''ll close this proposal for now, but please know <strong>you''re always welcome to reconnect</strong> whenever you''re ready.</p><p>Thank you for considering us!</p><p>Best regards,<br>{{agentName}}<br>{{agentEmail}}</p>'
    ),
    'accepted_thank_you', jsonb_build_object(
      'subject', 'Welcome aboard! Your onboarding next steps for {{proposalTitle}}',
      'html', '<h2>Congratulations {{clientName}}! 🎉</h2><p>Thank you for accepting our proposal. We''re excited to work with you on {{proposalTitle}}.</p><p><strong>Next Steps:</strong></p><ol><li>Complete your onboarding form</li><li>Submit required documents</li><li>Our team will guide you through the rest</li></ol><p><a href="{{onboardingUrl}}">Start Onboarding</a></p><p>Welcome to the journey!<br>{{agentName}}</p>'
    ),
    'cession_reminder', jsonb_build_object(
      'subject', 'Action Required: Complete onboarding for {{proposalTitle}}',
      'html', '<h2>Hi {{clientName}},</h2><p>This is a friendly reminder to complete your onboarding form for {{proposalTitle}}.</p><p>We need this information to move forward with your project.</p><p><a href="{{onboardingUrl}}">Complete Onboarding Form</a></p><p>If you have any questions, please don''t hesitate to reach out.</p><p>Best regards,<br>{{agentName}}</p>'
    ),
    'onboarding_idle_help', jsonb_build_object(
      'subject', 'Need any help completing onboarding for {{proposalTitle}}?',
      'html', '<h2>Hi {{clientName}},</h2><p>I noticed your onboarding for {{proposalTitle}} is still in progress.</p><p><strong>Need any help?</strong> I''m here to assist with:</p><ul><li>Answering questions about the forms</li><li>Helping with document uploads</li><li>Clarifying any requirements</li></ul><p><a href="{{onboardingUrl}}">Continue Onboarding</a></p><p>Let me know how I can help!<br>{{agentName}}</p>'
    )
  )
WHERE setting_key = 'email_automation_templates';

-- Update automation logs to use new template name
UPDATE proposal_automation_log
SET email_type = 'opened_not_clicked'
WHERE email_type = 'opened_not_viewed';