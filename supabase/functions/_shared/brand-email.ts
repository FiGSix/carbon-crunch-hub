// Crunch Carbon on-brand email wrapper.
// Inline CSS only (Gmail/Outlook safe), 600px max, white body bg.
// Brand palette: Crunch Yellow (#FFC400) + Crunch Black (#1A1A1A).

export interface BrandEmailOptions {
  preheader?: string;
  heading: string;
  bodyHtml: string;          // pre-rendered inner HTML (sections, paragraphs)
  ctaLabel?: string;
  ctaHref?: string;
  footerNote?: string;       // small print under CTA
  signOff?: string;          // e.g. "The Crunch Carbon Team"
}

const BRAND = {
  primary: "#FFC400",        // Crunch Yellow
  primaryInk: "#1A1A1A",     // text on yellow
  ink: "#1A1A1A",            // body text
  inkMuted: "#5C5C5C",
  surface: "#FFFFFF",
  surfaceAlt: "#FAFAFA",     // card rows
  border: "#E6E6E6",
  footerBg: "#1A1A1A",       // black footer
  footerInk: "#FFFFFF",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

export function renderBrandEmail(opts: BrandEmailOptions): string {
  const preheader = opts.preheader ? escapeHtml(opts.preheader) : "";
  const heading = escapeHtml(opts.heading);
  const signOff = escapeHtml(opts.signOff || "The Crunch Carbon Team");

  const cta = opts.ctaHref && opts.ctaLabel
    ? `
      <tr><td style="padding:8px 32px 0 32px">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td bgcolor="${BRAND.primary}" style="border-radius:8px;border:1px solid ${BRAND.ink}">
            <a href="${opts.ctaHref}" target="_blank"
               style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:${BRAND.primaryInk};text-decoration:none;border-radius:8px">
              ${escapeHtml(opts.ctaLabel)}
            </a>
          </td></tr>
        </table>
      </td></tr>`
    : "";

  const footerNote = opts.footerNote
    ? `<tr><td style="padding:16px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${BRAND.inkMuted};line-height:1.6">${opts.footerNote}</td></tr>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#ffffff;opacity:0">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff">
  <tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden">

      <!-- Brand band -->
      <tr><td style="background:${BRAND.primary};padding:20px 32px">
        <table role="presentation" width="100%"><tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:800;color:${BRAND.primaryInk};letter-spacing:0.3px">
            Crunch Carbon
          </td>
          <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:${BRAND.primaryInk};letter-spacing:1px;text-transform:uppercase">
            Solar Carbon Credits
          </td>
        </tr></table>
      </td></tr>

      <!-- Heading -->
      <tr><td style="padding:28px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:${BRAND.ink};line-height:1.3">
        ${heading}
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:8px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${BRAND.ink};line-height:1.65">
        ${opts.bodyHtml}
      </td></tr>

      ${cta}
      ${footerNote}

      <!-- Sign-off -->
      <tr><td style="padding:24px 32px 20px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.ink};line-height:1.6">
        Warm regards,<br/><strong>${signOff}</strong>
      </td></tr>

      <!-- Footer (black bar) -->
      <tr><td style="background:${BRAND.footerBg};padding:20px 32px 24px 32px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${BRAND.footerInk};line-height:1.6">
        Crunch Carbon (Pty) Ltd &nbsp;·&nbsp; Cape Town, South Africa<br/>
        Questions? <a href="mailto:support@crunchcarbon.com" style="color:${BRAND.primary};text-decoration:none;font-weight:600">support@crunchcarbon.com</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

export function brandCard(rows: Array<[string, string]>): string {
  const tr = rows
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid ${BRAND.border};font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.inkMuted}">${escapeHtml(k)}</td>
        <td align="right" style="padding:8px 12px;border-bottom:1px solid ${BRAND.border};font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.ink};font-weight:700">${escapeHtml(v)}</td>
      </tr>`
    )
    .join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.surfaceAlt};border:1px solid ${BRAND.border};border-radius:10px;margin:16px 0">
      ${tr}
    </table>`;
}

export const BRAND_COLORS = BRAND;
