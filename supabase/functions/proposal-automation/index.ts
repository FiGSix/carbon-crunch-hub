import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProposalForAutomation {
  id: string;
  title: string;
  status: string;
  last_email_sent_at: string | null;
  last_engagement_at: string | null;
  last_email_event_type: string | null;
  automation_paused: boolean;
  client_email: string;
  client_name: string;
  agent_id: string;
  agent_email: string;
  invitation_token: string;
}

serve(async (req: Request) => {
  console.log("=== 🤖 PROPOSAL AUTOMATION TRIGGERED ===");
  console.log(`Timestamp: ${new Date().toISOString()}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch timing configuration and templates from system_settings
    const { data: timingData, error: timingError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'email_automation_timing')
      .single();

    const { data: templateData, error: templateError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'email_automation_templates')
      .single();

    if (timingError || templateError) {
      console.error("❌ Error fetching configuration:", timingError || templateError);
      throw timingError || templateError;
    }

    const timingConfig = timingData.setting_value as any;
    const emailTemplates = templateData.setting_value as any;

    console.log("📝 Using timing config:", timingConfig);

    // Fetch proposals that need automation
    const { data: proposals, error: fetchError } = await supabase
      .from('proposals')
      .select(`
        id, title, status,
        last_email_sent_at, last_engagement_at, last_email_event_type,
        automation_paused,
        invitation_token,
        agent_id,
        content
      `)
      .eq('automation_paused', false)
      .in('status', ['sent', 'delivered', 'opened'])
      .is('deleted_at', null)
      .is('archived_at', null);

    if (fetchError) {
      console.error("❌ Error fetching proposals:", fetchError);
      throw fetchError;
    }

    console.log(`📋 Found ${proposals?.length || 0} proposals to evaluate`);

    const now = new Date();
    const actions = {
      reminders_sent: 0,
      followups_sent: 0,
      marked_stale: 0,
      errors: 0
    };

    for (const proposal of proposals || []) {
      try {
        const clientInfo = proposal.content?.clientInfo || {};
        const clientEmail = clientInfo.email;
        const clientName = clientInfo.name || 'Client';
        
        if (!clientEmail) {
          console.log(`⚠️ Skipping proposal ${proposal.id} - no client email`);
          continue;
        }

        // Get agent email
        const { data: agentProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', proposal.agent_id)
          .single();

        const agentEmail = agentProfile?.email || 'support@crunchcarbon.com';

        const lastSent = proposal.last_email_sent_at ? new Date(proposal.last_email_sent_at) : null;
        const lastEngagement = proposal.last_engagement_at ? new Date(proposal.last_engagement_at) : null;
        
        const daysSinceLastSent = lastSent ? Math.floor((now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24)) : 999;
        const daysSinceLastEngagement = lastEngagement ? Math.floor((now.getTime() - lastEngagement.getTime()) / (1000 * 60 * 60 * 24)) : 999;

        // Check if we already sent a follow-up recently (within 2 days)
        const { data: recentLog } = await supabase
          .from('proposal_automation_log')
          .select('created_at')
          .eq('proposal_id', proposal.id)
          .eq('automation_type', 'follow_up_email')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const daysSinceLastFollowup = recentLog?.created_at 
          ? Math.floor((now.getTime() - new Date(recentLog.created_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        // Rule 1: Mark as stale after configured days with no engagement
        const staleDays = timingConfig.mark_stale_days || 14;
        if (daysSinceLastSent >= staleDays && daysSinceLastEngagement >= staleDays) {
          console.log(`⏰ Marking proposal ${proposal.id} as stale (${daysSinceLastSent} days inactive)`);
          
          await supabase.rpc('update_proposal_status_with_log', {
            proposal_id: proposal.id,
            new_status: 'stale',
            trigger_event: `auto_stale_after_${staleDays}_days`,
            is_automated: true
          });

          actions.marked_stale++;
          continue;
        }

        // Rule 2: Send follow-up for opened but not viewed
        const openedNotViewedInitial = timingConfig.opened_not_viewed_days || 2;
        const openedNotViewedRepeat = timingConfig.opened_not_viewed_repeat_days || 2;
        if (proposal.status === 'opened' && daysSinceLastSent >= openedNotViewedInitial && daysSinceLastFollowup >= openedNotViewedRepeat) {
          console.log(`📧 Sending follow-up for opened proposal ${proposal.id}`);
          
          await sendFollowUpEmail(
            clientEmail,
            clientName,
            proposal.title,
            proposal.invitation_token,
            agentEmail,
            'opened_not_viewed',
            emailTemplates
          );

          await supabase
            .from('proposal_automation_log')
            .insert({
              proposal_id: proposal.id,
              automation_type: 'follow_up_email',
              trigger_event: 'opened_not_viewed_2_days',
              old_status: proposal.status,
              new_status: proposal.status
            });

          await supabase
            .from('proposals')
            .update({ last_email_sent_at: now.toISOString() })
            .eq('id', proposal.id);

          actions.followups_sent++;
          continue;
        }

        // Rule 3: Send reminder for delivered but not opened
        const deliveredNotOpenedInitial = timingConfig.delivered_not_opened_days || 3;
        const deliveredNotOpenedRepeat = timingConfig.delivered_not_opened_repeat_days || 3;
        if (proposal.status === 'delivered' && daysSinceLastSent >= deliveredNotOpenedInitial && daysSinceLastFollowup >= deliveredNotOpenedRepeat) {
          console.log(`📧 Sending reminder for delivered proposal ${proposal.id}`);
          
          await sendFollowUpEmail(
            clientEmail,
            clientName,
            proposal.title,
            proposal.invitation_token,
            agentEmail,
            'delivered_not_opened',
            emailTemplates
          );

          await supabase
            .from('proposal_automation_log')
            .insert({
              proposal_id: proposal.id,
              automation_type: 'follow_up_email',
              trigger_event: 'delivered_not_opened_3_days',
              old_status: proposal.status,
              new_status: proposal.status
            });

          await supabase
            .from('proposals')
            .update({ last_email_sent_at: now.toISOString() })
            .eq('id', proposal.id);

          actions.reminders_sent++;
          continue;
        }

        // Rule 4: Send reminder for sent but not delivered
        const sentNotDeliveredInitial = timingConfig.sent_not_delivered_days || 3;
        const sentNotDeliveredRepeat = timingConfig.sent_not_delivered_repeat_days || 3;
        if (proposal.status === 'sent' && daysSinceLastSent >= sentNotDeliveredInitial && daysSinceLastFollowup >= sentNotDeliveredRepeat) {
          console.log(`📧 Sending reminder for sent proposal ${proposal.id}`);
          
          await sendFollowUpEmail(
            clientEmail,
            clientName,
            proposal.title,
            proposal.invitation_token,
            agentEmail,
            'sent_not_delivered',
            emailTemplates
          );

          await supabase
            .from('proposal_automation_log')
            .insert({
              proposal_id: proposal.id,
              automation_type: 'follow_up_email',
              trigger_event: 'sent_not_delivered_3_days',
              old_status: proposal.status,
              new_status: proposal.status
            });

          await supabase
            .from('proposals')
            .update({ last_email_sent_at: now.toISOString() })
            .eq('id', proposal.id);

          actions.reminders_sent++;
        }

      } catch (error) {
        console.error(`❌ Error processing proposal ${proposal.id}:`, error);
        actions.errors++;
      }
    }

    console.log("\n✅ AUTOMATION COMPLETE");
    console.log(`📊 Summary:
      - Reminders sent: ${actions.reminders_sent}
      - Follow-ups sent: ${actions.followups_sent}
      - Marked stale: ${actions.marked_stale}
      - Errors: ${actions.errors}
    `);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ...actions,
        timestamp: now.toISOString() 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error("❌ Automation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function sendFollowUpEmail(
  clientEmail: string,
  clientName: string,
  proposalTitle: string,
  invitationToken: string,
  agentEmail: string,
  followUpType: 'delivered_not_opened' | 'opened_not_viewed' | 'sent_not_delivered',
  emailTemplates: any
) {
  const proposalUrl = `https://crunchcarbon.app/proposals/${invitationToken}?token=${invitationToken}`;

  // Get template from config
  const template = emailTemplates[followUpType];
  if (!template) {
    console.error(`No template found for ${followUpType}`);
    throw new Error(`Template not found: ${followUpType}`);
  }

  // Replace placeholders in template
  let subject = template.subject
    .replace(/\{\{clientName\}\}/g, clientName)
    .replace(/\{\{proposalTitle\}\}/g, proposalTitle);

  let html = template.html
    .replace(/\{\{clientName\}\}/g, clientName)
    .replace(/\{\{proposalTitle\}\}/g, proposalTitle)
    .replace(/\{\{proposalUrl\}\}/g, proposalUrl)
    .replace(/\{\{agentEmail\}\}/g, agentEmail)
    .replace(/\{\{systemSize\}\}/g, 'N/A')
    .replace(/\{\{annualEnergy\}\}/g, 'N/A')
    .replace(/\{\{agentName\}\}/g, 'Your Agent');

  const emailResponse = await resend.emails.send({
    from: 'Crunch Carbon <proposals@crunchcarbon.com>',
    to: [clientEmail],
    cc: [agentEmail],
    subject: subject,
    html: html
  });

  console.log(`✅ Follow-up email sent to ${clientEmail}:`, emailResponse);
  return emailResponse;
}
