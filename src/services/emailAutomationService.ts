import { supabase } from "@/integrations/supabase/client";

export interface TimingConfig {
  sent_not_delivered_days: number;
  sent_not_delivered_repeat_days: number;
  delivered_not_opened_days: number;
  delivered_not_opened_repeat_days: number;
  opened_not_viewed_days: number;
  opened_not_viewed_repeat_days: number;
  mark_stale_days: number;
  proposal_validity_hours: number;
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

export interface EmailTemplates {
  sent_not_delivered: EmailTemplate;
  delivered_not_opened: EmailTemplate;
  opened_not_viewed: EmailTemplate;
}

export class EmailAutomationService {
  async getTimingConfig(): Promise<TimingConfig> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'email_automation_timing')
      .single();

    if (error) throw error;
    return data.setting_value as unknown as TimingConfig;
  }

  async updateTimingConfig(config: TimingConfig): Promise<void> {
    const { error } = await supabase
      .from('system_settings')
      .update({ 
        setting_value: config as unknown as any,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', 'email_automation_timing');

    if (error) throw error;
  }

  async getEmailTemplates(): Promise<EmailTemplates> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'email_automation_templates')
      .single();

    if (error) throw error;
    return data.setting_value as unknown as EmailTemplates;
  }

  async updateEmailTemplate(
    templateType: keyof EmailTemplates,
    template: EmailTemplate
  ): Promise<void> {
    const templates = await this.getEmailTemplates();
    templates[templateType] = template;

    const { error } = await supabase
      .from('system_settings')
      .update({ 
        setting_value: templates as unknown as any,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', 'email_automation_templates');

    if (error) throw error;
  }

  async testEmailTemplates(emailAddress: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('test-proposal-emails', {
      body: { testEmail: emailAddress }
    });

    if (error) throw error;
    return data;
  }
}

export const emailAutomationService = new EmailAutomationService();
