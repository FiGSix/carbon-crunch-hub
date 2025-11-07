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

        // Rule 1: Mark as stale after 14 days with no engagement
        if (daysSinceLastSent >= 14 && daysSinceLastEngagement >= 14) {
          console.log(`⏰ Marking proposal ${proposal.id} as stale (${daysSinceLastSent} days inactive)`);
          
          await supabase.rpc('update_proposal_status_with_log', {
            proposal_id: proposal.id,
            new_status: 'stale',
            trigger_event: 'auto_stale_after_14_days',
            is_automated: true
          });

          actions.marked_stale++;
          continue;
        }

        // Rule 2: Send follow-up for opened but not viewed (after 2 days, max once per 2 days)
        if (proposal.status === 'opened' && daysSinceLastSent >= 2 && daysSinceLastFollowup >= 2) {
          console.log(`📧 Sending follow-up for opened proposal ${proposal.id}`);
          
          await sendFollowUpEmail(
            clientEmail,
            clientName,
            proposal.title,
            proposal.invitation_token,
            agentEmail,
            'opened_not_viewed'
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

        // Rule 3: Send reminder for delivered but not opened (after 3 days, max once per 3 days)
        if (proposal.status === 'delivered' && daysSinceLastSent >= 3 && daysSinceLastFollowup >= 3) {
          console.log(`📧 Sending reminder for delivered proposal ${proposal.id}`);
          
          await sendFollowUpEmail(
            clientEmail,
            clientName,
            proposal.title,
            proposal.invitation_token,
            agentEmail,
            'delivered_not_opened'
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

        // Rule 4: Send reminder for sent but not delivered (after 3 days, max once per 3 days)
        if (proposal.status === 'sent' && daysSinceLastSent >= 3 && daysSinceLastFollowup >= 3) {
          console.log(`📧 Sending reminder for sent proposal ${proposal.id}`);
          
          await sendFollowUpEmail(
            clientEmail,
            clientName,
            proposal.title,
            proposal.invitation_token,
            agentEmail,
            'sent_not_delivered'
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
  followUpType: 'delivered_not_opened' | 'opened_not_viewed' | 'sent_not_delivered'
) {
  const proposalUrl = `https://crunchcarbon.app/proposals/${invitationToken}?token=${invitationToken}`;

  const emailTemplates = {
    sent_not_delivered: {
      subject: `Action Required: Review Your Carbon Credit Proposal`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Hi ${clientName},</h2>
          
          <p>We wanted to make sure you received your carbon credit proposal for <strong>${proposalTitle}</strong>.</p>
          
          <p>We noticed you haven't opened it yet. This proposal contains important information about your potential carbon credit revenue.</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${proposalUrl}" 
               style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              View Your Proposal
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">This is an automated reminder. If you have any questions, please reply to this email.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">Crunch Carbon | Carbon Credit Solutions</p>
        </div>
      `
    },
    delivered_not_opened: {
      subject: `Reminder: Your Carbon Credit Proposal Awaits`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Hi ${clientName},</h2>
          
          <p>Just a friendly reminder that your carbon credit proposal for <strong>${proposalTitle}</strong> is ready to review.</p>
          
          <p><strong>Why review now?</strong></p>
          <ul style="color: #555;">
            <li>See your projected carbon credit revenue</li>
            <li>Understand your environmental impact</li>
            <li>Get started on your carbon credit journey</li>
          </ul>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${proposalUrl}" 
               style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              View Your Proposal Now
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">Have questions? Simply reply to this email and we'll be happy to help.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">Crunch Carbon | Carbon Credit Solutions</p>
        </div>
      `
    },
    opened_not_viewed: {
      subject: `Still interested in ${proposalTitle}?`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Hi ${clientName},</h2>
          
          <p>We noticed you opened your proposal for <strong>${proposalTitle}</strong>, but haven't had a chance to review all the details yet.</p>
          
          <p>Your proposal includes:</p>
          <ul style="color: #555;">
            <li>📊 Detailed financial projections</li>
            <li>🌱 Environmental impact analysis</li>
            <li>📋 Next steps and timeline</li>
          </ul>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${proposalUrl}" 
               style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Continue Reading
            </a>
          </div>
          
          <p>Need more information or have questions? We're here to help - just reply to this email.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">Crunch Carbon | Carbon Credit Solutions</p>
        </div>
      `
    }
  };

  const template = emailTemplates[followUpType];

  const emailResponse = await resend.emails.send({
    from: 'Crunch Carbon <proposals@crunchcarbon.com>',
    to: [clientEmail],
    cc: [agentEmail],
    subject: template.subject,
    html: template.html
  });

  console.log(`✅ Follow-up email sent to ${clientEmail}:`, emailResponse);
  return emailResponse;
}
