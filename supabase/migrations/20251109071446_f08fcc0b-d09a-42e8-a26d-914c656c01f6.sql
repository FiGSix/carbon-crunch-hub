-- Add email automation configuration to system_settings
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'email_automation_timing',
  '{
    "sent_not_delivered_days": 3,
    "sent_not_delivered_repeat_days": 3,
    "delivered_not_opened_days": 3,
    "delivered_not_opened_repeat_days": 3,
    "opened_not_viewed_days": 2,
    "opened_not_viewed_repeat_days": 2,
    "mark_stale_days": 14,
    "proposal_validity_hours": 240
  }'::jsonb,
  'Email automation timing configuration in days/hours'
),
(
  'email_automation_templates',
  '{
    "sent_not_delivered": {
      "subject": "Action Required: Review Your Carbon Credit Proposal",
      "html": "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\"><h2 style=\"color: #2c5530;\">Hello {{clientName}},</h2><p>We noticed you haven''t received your carbon credit proposal yet. This could be due to a temporary email delivery issue.</p><p><strong>Proposal:</strong> {{proposalTitle}}</p><p><strong>System Size:</strong> {{systemSize}} kWp</p><p>Please click the button below to view your proposal:</p><a href=\"{{proposalUrl}}\" style=\"display: inline-block; background-color: #2c5530; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;\">View Proposal</a><p>If you have any questions, please contact your agent:</p><p><strong>{{agentName}}</strong><br>{{agentEmail}}</p><p>Best regards,<br>Crunch Carbon Team</p></div>"
    },
    "delivered_not_opened": {
      "subject": "Reminder: Your Carbon Credit Proposal Awaits",
      "html": "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\"><h2 style=\"color: #2c5530;\">Hi {{clientName}},</h2><p>We sent you a carbon credit proposal a few days ago, but we noticed you haven''t had a chance to open it yet.</p><p><strong>Proposal:</strong> {{proposalTitle}}</p><p><strong>Annual Energy Production:</strong> {{annualEnergy}} kWh</p><p>This proposal contains important information about your potential carbon credit earnings and revenue opportunities.</p><a href=\"{{proposalUrl}}\" style=\"display: inline-block; background-color: #2c5530; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;\">Open Proposal Now</a><p>Your agent {{agentName}} is available to answer any questions at {{agentEmail}}</p><p>Best regards,<br>Crunch Carbon Team</p></div>"
    },
    "opened_not_viewed": {
      "subject": "Still interested in {{proposalTitle}}?",
      "html": "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\"><h2 style=\"color: #2c5530;\">Hello {{clientName}},</h2><p>Thank you for opening your carbon credit proposal. We noticed you haven''t fully reviewed all the details yet.</p><p><strong>Proposal:</strong> {{proposalTitle}}</p><p>This proposal includes:</p><ul><li>Detailed carbon credit projections</li><li>Revenue distribution breakdown</li><li>Project timeline and milestones</li><li>Terms and conditions</li></ul><a href=\"{{proposalUrl}}\" style=\"display: inline-block; background-color: #2c5530; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;\">Continue Reviewing</a><p>Have questions? Your agent {{agentName}} is here to help.<br>Contact: {{agentEmail}}</p><p>Best regards,<br>Crunch Carbon Team</p></div>"
    }
  }'::jsonb,
  'Email automation templates with dynamic placeholders'
)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();