// Cora persona MUST be sent from cora@crunchcarbon.com via the Outlook
// gateway. Never combine coraSignatureHtml with the Resend SDK — Resend is
// reserved for platform identity ("The Crunch Carbon Team"). This module
// is the single source of truth for talking to the Microsoft Outlook
// connector gateway as Cora.

const OUTLOOK_GATEWAY = "https://connector-gateway.lovable.dev/microsoft_outlook";

export interface OutlookSendResult {
  ok: boolean;
  /** /me/sendMail returns 202 with no body; no message id is available. */
  messageId?: string;
  error?: string;
}

export interface OutlookSendArgs {
  to: string;
  subject: string;
  html: string;
}

export async function sendViaOutlook(args: OutlookSendArgs): Promise<OutlookSendResult> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const outlookKey = Deno.env.get("MICROSOFT_OUTLOOK_API_KEY");
  if (!lovableKey) return { ok: false, error: "LOVABLE_API_KEY missing" };
  if (!outlookKey) return { ok: false, error: "MICROSOFT_OUTLOOK_API_KEY missing" };

  const res = await fetch(`${OUTLOOK_GATEWAY}/me/sendMail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": outlookKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: args.subject,
        body: { contentType: "HTML", content: args.html },
        toRecipients: [{ emailAddress: { address: args.to } }],
      },
      saveToSentItems: true,
    }),
  });

  if (!res.ok && res.status !== 202) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `Outlook sendMail [${res.status}]: ${text}` };
  }
  return { ok: true };
}
