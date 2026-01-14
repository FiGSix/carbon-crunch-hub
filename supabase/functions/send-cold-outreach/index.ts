import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const BOOKING_LINK = "https://outlook.office.com/bookwithme/user/9d260efd86dd40d586655ba9b9a3b4c1@crunchcarbon.com/meetingtype/NFYHu93970W7f_fhSJejcg2?anonymous&ismsaljsauthenabled&ep=mlink";

interface Lead {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  website: string | null;
  location: string | null;
  notes: string | null;
}

interface OutreachRequest {
  leadIds: string[];
  templateType: 'introduction' | 'follow_up_1' | 'follow_up_2';
  useAiPersonalization?: boolean;
}

const emailTemplates = {
  introduction: {
    subject: "Partner with CrunchCarbon - Earn from Solar Carbon Credits",
    getBody: (lead: Lead, aiPersonalization: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <p>Hi ${lead.contact_name || 'there'},</p>
  
  ${aiPersonalization ? `<p>${aiPersonalization}</p>` : ''}
  
  <p>I'm reaching out because CrunchCarbon helps solar companies like <strong>${lead.company_name}</strong> earn additional revenue through carbon credits — with zero upfront costs.</p>
  
  <p><strong>Here's how it works:</strong></p>
  <ul>
    <li>Register solar installations on our platform</li>
    <li>We handle all the carbon credit certification</li>
    <li>You earn commission on every verified credit</li>
  </ul>
  
  <p>Our agent partners typically add <strong>R2,000–R5,000 per project</strong> to their bottom line.</p>
  
  <p>Would you be open to a quick 15-minute call to explore if this makes sense for ${lead.company_name}?</p>
  
  <p style="margin: 24px 0;">
    <a href="${BOOKING_LINK}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Schedule a Meeting</a>
  </p>
  
  <p>
    Best regards,<br>
    <strong>Shaun Slabber</strong><br>
    CrunchCarbon<br>
    <a href="mailto:shaun@crunchcarbon.com">shaun@crunchcarbon.com</a>
  </p>
</body>
</html>
`,
  },
  follow_up_1: {
    subject: "Quick follow-up - Carbon credit opportunity for {{company_name}}",
    getBody: (lead: Lead, _aiPersonalization: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <p>Hi ${lead.contact_name || 'there'},</p>
  
  <p>I wanted to follow up on my previous email about earning from carbon credits.</p>
  
  <p>Many solar installers are leaving money on the table — we make it easy to capture this additional revenue stream for <strong>${lead.company_name}</strong>.</p>
  
  <p>Would 15 minutes this week work for a quick call?</p>
  
  <p style="margin: 24px 0;">
    <a href="${BOOKING_LINK}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Schedule a Meeting</a>
  </p>
  
  <p>
    Best,<br>
    <strong>Shaun Slabber</strong><br>
    CrunchCarbon
  </p>
</body>
</html>
`,
  },
  follow_up_2: {
    subject: "Last chance: Solar carbon credits for {{company_name}}",
    getBody: (lead: Lead, _aiPersonalization: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <p>Hi ${lead.contact_name || 'there'},</p>
  
  <p>I'll keep this brief — I've reached out twice about helping <strong>${lead.company_name}</strong> earn from carbon credits.</p>
  
  <p>If the timing isn't right, no worries. But if you're curious, I'd love to show you how easy it is.</p>
  
  <p>Just reply "interested" and I'll send over more details, or book a quick call:</p>
  
  <p style="margin: 24px 0;">
    <a href="${BOOKING_LINK}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Schedule a Meeting</a>
  </p>
  
  <p>
    <strong>Shaun Slabber</strong><br>
    CrunchCarbon
  </p>
</body>
</html>
`,
  },
};

async function generateAiPersonalization(lead: Lead): Promise<string> {
  if (!LOVABLE_API_KEY) {
    console.log("No LOVABLE_API_KEY configured, skipping AI personalization");
    return "";
  }

  try {
    const prompt = `You are writing a personalized opening sentence for a cold outreach email to a solar installation company.

Company details:
- Company Name: ${lead.company_name}
- Location: ${lead.location || 'South Africa'}
- Website: ${lead.website || 'Not provided'}
- Notes: ${lead.notes || 'None'}

Write ONE sentence (max 30 words) that:
1. Shows you researched their company
2. Creates a connection to carbon credits or sustainability
3. Feels genuine and personal, not salesy

Examples of good openers:
- "I noticed ${lead.company_name} has been making waves in the ${lead.location || 'local'} solar market, and I thought you'd appreciate a new revenue opportunity."
- "With your focus on renewable energy solutions, I wanted to share how other installers are adding passive income through carbon credits."

Just return the one sentence, nothing else.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return "";
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    console.log("AI personalization generated:", content);
    return content;
  } catch (error) {
    console.error("Error generating AI personalization:", error);
    return "";
  }
}

async function checkDuplicateOutreach(
  supabase: ReturnType<typeof createClient>,
  leadId: string,
  templateType: string
): Promise<boolean> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('lead_outreach_history')
    .select('id')
    .eq('lead_id', leadId)
    .eq('template_type', templateType)
    .gte('sent_at', twentyFourHoursAgo)
    .limit(1);

  if (error) {
    console.error("Error checking duplicate outreach:", error);
    return false;
  }

  return (data?.length || 0) > 0;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { leadIds, templateType, useAiPersonalization = false }: OutreachRequest = await req.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return new Response(JSON.stringify({ error: "leadIds array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!templateType || !emailTemplates[templateType]) {
      return new Response(JSON.stringify({ error: "Invalid templateType" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch leads
    const { data: leads, error: leadsError } = await supabase
      .from('agent_leads')
      .select('id, company_name, contact_name, email, website, location, notes')
      .in('id', leadIds);

    if (leadsError) {
      throw new Error(`Failed to fetch leads: ${leadsError.message}`);
    }

    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ error: "No leads found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { leadId: string; success: boolean; error?: string; messageId?: string }[] = [];

    for (const lead of leads) {
      try {
        // Check if lead has email
        if (!lead.email) {
          results.push({ leadId: lead.id, success: false, error: "No email address" });
          continue;
        }

        // Check for duplicate outreach within 24 hours
        const isDuplicate = await checkDuplicateOutreach(supabase, lead.id, templateType);
        if (isDuplicate) {
          results.push({ leadId: lead.id, success: false, error: "Already contacted with this template in last 24 hours" });
          continue;
        }

        // Generate AI personalization if requested
        let aiPersonalization = "";
        if (useAiPersonalization && templateType === 'introduction') {
          aiPersonalization = await generateAiPersonalization(lead);
        }

        // Get template
        const template = emailTemplates[templateType];
        const subject = template.subject.replace("{{company_name}}", lead.company_name);
        const htmlBody = template.getBody(lead, aiPersonalization);
        const bodyPreview = htmlBody.replace(/<[^>]*>/g, '').substring(0, 200);

        // Send email via Resend
        const emailResponse = await resend.emails.send({
          from: "Shaun Slabber <shaun@crunchcarbon.com>",
          to: [lead.email],
          subject: subject,
          html: htmlBody,
        });

        console.log(`Email sent to ${lead.email}:`, emailResponse);

        // Record outreach in history
        const { error: historyError } = await supabase
          .from('lead_outreach_history')
          .insert({
            lead_id: lead.id,
            template_type: templateType,
            subject: subject,
            body_preview: bodyPreview,
            sent_by: user.id,
            resend_message_id: emailResponse.data?.id || null,
            status: 'sent',
          });

        if (historyError) {
          console.error("Error recording outreach history:", historyError);
        }

        // Update lead status and outreach count
        const { error: updateError } = await supabase
          .from('agent_leads')
          .update({
            status: 'contacted',
            last_outreach_at: new Date().toISOString(),
            outreach_count: supabase.rpc ? undefined : 1, // Will use raw SQL increment
          })
          .eq('id', lead.id);

        // Increment outreach_count using raw update
        await supabase.rpc('increment_outreach_count', { lead_id: lead.id }).catch(() => {
          // If RPC doesn't exist, manually update
          return supabase
            .from('agent_leads')
            .update({ 
              outreach_count: 1,
              last_outreach_at: new Date().toISOString(),
            })
            .eq('id', lead.id)
            .eq('outreach_count', 0);
        });

        if (updateError) {
          console.error("Error updating lead:", updateError);
        }

        results.push({ 
          leadId: lead.id, 
          success: true, 
          messageId: emailResponse.data?.id 
        });

        // Rate limiting: wait 500ms between emails
        if (leads.indexOf(lead) < leads.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`Error sending to ${lead.email}:`, error);
        results.push({ 
          leadId: lead.id, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({
      message: `Sent ${successCount} emails, ${failCount} failed`,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in send-cold-outreach:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
