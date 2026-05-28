// Shared email signature for the "Cora Black" Sales Agent persona.
// One source of truth — imported by every outbound sender so the sign-off,
// name, role and Crunch Carbon logo stay identical across cold outreach,
// sequence sends, AI replies and onboarding nudges.
//
// IMPORTANT: Cora-branded email MUST be sent from cora@crunchcarbon.com via
// the Outlook gateway (see _shared/outlookSend.ts). NEVER pair this
// signature with the Resend SDK — Resend is reserved for platform identity
// ("The Crunch Carbon Team", noreply@/proposals@).


const LOGO_URL = "https://crunchcarbon.com/lovable-uploads/c818a4d4-97db-4b88-bd74-801376152ebc.png";
const BRAND_BLACK = "#1A1A1A";
const BRAND_YELLOW = "#FFBF00";

/**
 * HTML sign-off block. Append to the end of an email body (inside <body>).
 * Includes "Kind regards, Cora Black, Partner Co-ordinator" and the
 * Crunch Carbon logo.
 */
export function coraSignatureHtml(): string {
  return `
  <div style="margin-top:32px;padding-top:20px;border-top:2px solid ${BRAND_YELLOW};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#333;">
    <p style="margin:0 0 12px 0;line-height:1.6;">
      Kind regards,<br/>
      <strong style="color:${BRAND_BLACK};font-size:15px;">Cora Black</strong><br/>
      <span style="color:#555;font-size:14px;">Partner Co-ordinator · Crunch Carbon</span><br/>
      <a href="mailto:cora@crunchcarbon.com" style="color:${BRAND_BLACK};font-size:13px;text-decoration:none;">cora@crunchcarbon.com</a>
    </p>
    <img src="${LOGO_URL}" alt="Crunch Carbon" width="140" style="height:auto;display:block;margin-top:8px;" />
  </div>`;
}

/** Plain-text fallback signature (for text/plain bodies). */
export function coraSignatureText(): string {
  return `\n\nKind regards,\nCora Black\nPartner Co-ordinator · Crunch Carbon\ncora@crunchcarbon.com`;
}

// NOTE: CORA_FROM has been removed. The Outlook gateway sends from the
// connected mailbox (cora@crunchcarbon.com) automatically, so no explicit
// `from` field is needed. Re-introducing this constant would re-open the
// Resend-as-Cora regression — don't.

