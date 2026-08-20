// Single branded wrapper for every broadcast (test sends and real sends alike).
// Table-based layout, inline CSS only, 600px max — Outlook / Gmail / Apple Mail safe.

export const BROADCAST_BRAND = {
  accent: "#FFCC03",
  ink: "#1A1A1A",
  inkMuted: "#5C5C5C",
  border: "#E6E6E6",
  footerBg: "#1A1A1A",
  footerInk: "#FFFFFF",
  logoUrl: "https://crunchcarbon.com/crunch-carbon-logo-new.png",
  siteUrl: "https://crunchcarbon.com",
  companyName: "Crunch Carbon (Pty) Ltd",
  companyAddress: "Sunny South Africa",
  supportEmail: "hello@crunchcarbon.com",
};

function esc(s: string): string {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

export interface BroadcastEmailOptions {
  subject: string;
  preheader?: string | null;
  bodyHtml: string;
  unsubscribeUrl?: string | null; // present only for opt-out-able categories
}

export function renderBroadcastEmail(opts: BroadcastEmailOptions): string {
  const B = BROADCAST_BRAND;
  const preheader = opts.preheader ? esc(opts.preheader) : "";

  const unsubscribeLine = opts.unsubscribeUrl
    ? `<div style="margin-top:10px">
         <a href="${opts.unsubscribeUrl}" style="color:${B.accent};text-decoration:underline">Unsubscribe from these emails</a>
       </div>`
    : "";

  return `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${esc(opts.subject)}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F4F4F4;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#F4F4F4;opacity:0">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F4F4">
  <tr>
    <td align="center" style="padding:24px 12px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#FFFFFF;border:1px solid ${B.border};border-radius:12px">

        <!-- Header -->
        <tr>
          <td align="left" bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:20px 28px;border-radius:12px 12px 0 0">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="left" style="font-family:Arial,Helvetica,sans-serif">
                  <a href="${B.siteUrl}" target="_blank" style="text-decoration:none;color:${B.ink}">
                    <img src="${B.logoUrl}" width="150" alt="Crunch Carbon" style="display:block;border:0;outline:none;text-decoration:none;width:150px;max-width:150px;height:auto" />
                  </a>
                </td>
                <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;color:${B.inkMuted};letter-spacing:1px;text-transform:uppercase">
                  Solar Carbon Credits
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Accent rule -->
        <tr><td style="height:4px;line-height:4px;font-size:0;background-color:${B.accent}">&nbsp;</td></tr>

        <!-- Body -->
        <tr>
          <td align="left" style="padding:28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${B.ink}">
            ${opts.bodyHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="left" bgcolor="${B.footerBg}" style="background-color:${B.footerBg};padding:20px 28px;border-radius:0 0 12px 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${B.footerInk}">
            <strong style="color:${B.footerInk}">${B.companyName}</strong><br />
            ${B.companyAddress}<br />
            <a href="mailto:${B.supportEmail}" style="color:${B.accent};text-decoration:none">${B.supportEmail}</a>
            ${unsubscribeLine}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
