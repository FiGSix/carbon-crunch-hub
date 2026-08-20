import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyUnsubToken, signUnsubToken, policyFor } from "../_shared/broadcast.ts";

// Public endpoint (verify_jwt = false).
//  - POST (List-Unsubscribe one-click) -> category opt-out, immediate.
//  - GET  -> confirmation page; category opt-out applied, all-mail opt-out
//            requires a deliberate second click (POST with mode=all).
// Operational campaigns never mint a token, so they can never reach here.

const html = (title: string, bodyHtml: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#FAFAFA;margin:0;padding:40px 16px">
<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E6E6E6;border-radius:12px;padding:28px">
${bodyHtml}
<p style="font-size:12px;color:#5C5C5C;margin-top:24px">Crunch Carbon</p>
</div></body></html>`;

serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const payload = await verifyUnsubToken(token);

  if (!payload) {
    return new Response(
      html("Invalid link", `<h1 style="font-size:20px">This unsubscribe link is invalid or expired.</h1>`),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const email = payload.e.toLowerCase();
  const policy = policyFor(payload.k);

  const optOutCategory = async () => {
    await admin.from("broadcast_preferences").upsert(
      {
        email,
        category: payload.k,
        source: "unsubscribe_link",
        campaign_id: payload.c,
        opted_out_at: new Date().toISOString(),
      },
      { onConflict: "email,category" },
    );
  };

  if (req.method === "POST") {
    const form = await req.formData().catch(() => null);
    const mode = (form?.get("mode") as string) ?? url.searchParams.get("mode") ?? "category";

    if (mode === "all") {
      await admin.from("client_email_suppressions").upsert(
        { email, reason: "unsubscribe", source: "broadcast_unsubscribe", notes: `campaign ${payload.c}` },
        { onConflict: "email" },
      );
      await optOutCategory();
      return new Response(
        html(
          "Unsubscribed",
          `<h1 style="font-size:20px">You have been removed from all Crunch Carbon emails.</h1>
           <p style="color:#5C5C5C">${email} will no longer receive any mail from us.</p>`,
        ),
        { headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    await optOutCategory();
    return new Response("OK", { status: 200 });
  }

  // GET: apply the category opt-out and offer the deliberate all-mail option.
  await optOutCategory();
  const allToken = await signUnsubToken({ ...payload, m: "all" });

  return new Response(
    html(
      "Unsubscribed",
      `<h1 style="font-size:20px">You're unsubscribed from ${policy.label.toLowerCase()} emails.</h1>
       <p style="color:#5C5C5C">${email} will no longer receive this type of message. Service notices
       about projects you have with us will still be sent.</p>
       <form method="POST" action="?token=${encodeURIComponent(allToken)}">
         <input type="hidden" name="mode" value="all">
         <button type="submit" style="margin-top:8px;background:#1A1A1A;color:#fff;border:0;border-radius:8px;padding:10px 16px;cursor:pointer">
           Stop all emails from Crunch Carbon
         </button>
       </form>`,
    ),
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
});
