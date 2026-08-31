
import { Resend } from "npm:resend@2.0.0";
import { EmailTemplateData, ProposalSummaryData } from "./types.ts";

const BRAND = {
  yellow: "#FFC400",
  ink: "#1A1A1A",
  inkMuted: "#5C5C5C",
  border: "#E6E6E6",
  surfaceAlt: "#FAFAFA",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

/** Rows shown in the 30-second summary, skipping anything we don't have a value for. */
function summaryRows(summary: ProposalSummaryData): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  if (summary.clientOrCompany) rows.push(["Client", summary.clientOrCompany]);
  if (summary.siteLocation) rows.push(["Site", summary.siteLocation]);
  if (summary.capacity) rows.push(["Installed capacity", summary.capacity]);
  if (summary.annualGeneration) rows.push(["Estimated annual generation", summary.annualGeneration]);
  if (summary.carbonCredits) rows.push(["Estimated carbon credits", summary.carbonCredits]);
  if (typeof summary.clientSharePercentage === "number") {
    rows.push(["Your revenue share", `${summary.clientSharePercentage}%`]);
  }
  if (summary.reference) rows.push(["Proposal reference", summary.reference]);
  return rows;
}

export class EmailService {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  generateEmailTemplate(data: EmailTemplateData): string {
    const s = data.summary;
    const rows = summaryRows(s)
      .map(
        ([k, v]) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid ${BRAND.border};font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.inkMuted}">${escapeHtml(k)}</td>
          <td align="right" style="padding:10px 14px;border-bottom:1px solid ${BRAND.border};font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.ink};font-weight:700">${escapeHtml(v)}</td>
        </tr>`
      )
      .join("");

    const incomeBlock = s.annualIncome || s.termIncome
      ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.yellow};border-radius:12px;margin:8px 0 20px 0">
        <tr><td style="padding:22px 20px;text-align:center;font-family:Arial,Helvetica,sans-serif">
          ${s.annualIncome ? `<div style="font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${BRAND.ink}">Your estimated income</div>
          <div style="font-size:34px;font-weight:800;color:${BRAND.ink};line-height:1.2;margin-top:6px">${escapeHtml(s.annualIncome)}<span style="font-size:15px;font-weight:700"> / year</span></div>` : ""}
          ${s.termIncome ? `<div style="font-size:14px;color:${BRAND.ink};margin-top:8px;font-weight:600">${escapeHtml(s.termIncome)} estimated over the proposal term</div>` : ""}
        </td></tr>
      </table>`
      : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your solar carbon income proposal is ready</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#ffffff;opacity:0">Review your proposal, sign the cession agreement online and start onboarding.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff">
  <tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden">

      <tr><td style="background:#ffffff;padding:22px 30px;border-bottom:3px solid ${BRAND.yellow}">
        <table role="presentation" width="100%"><tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:800;color:${BRAND.ink};letter-spacing:0.3px">Crunch Carbon</td>
          <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:${BRAND.inkMuted};letter-spacing:1px;text-transform:uppercase">Solar Carbon Credits</td>
        </tr></table>
      </td></tr>

      <tr><td style="padding:28px 30px 6px 30px;font-family:Arial,Helvetica,sans-serif;font-size:23px;font-weight:700;color:${BRAND.ink};line-height:1.3">
        Your solar carbon income proposal is ready
      </td></tr>

      <tr><td style="padding:6px 30px 0 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${BRAND.ink};line-height:1.65">
        Dear <strong>${escapeHtml(data.clientName)}</strong>,
      </td></tr>

      <tr><td style="padding:14px 30px 0 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${BRAND.ink};line-height:1.7">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.surfaceAlt};border:1px solid ${BRAND.border};border-radius:10px">
          <tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.ink};line-height:1.8">
            <strong>1. Review</strong> — Review your personalised carbon-income proposal below.<br/>
            <strong>2. Sign</strong> — Accept and sign the cession agreement securely online.<br/>
            <strong>3. Onboard</strong> — Provide the project information required for verification.
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding:26px 30px 4px 30px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:${BRAND.ink}">
        Your proposal in 30 seconds
      </td></tr>
      <tr><td style="padding:4px 30px 0 30px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.inkMuted};line-height:1.6">
        ${escapeHtml(data.projectName)}
      </td></tr>

      <tr><td style="padding:14px 30px 0 30px">
        ${incomeBlock}
        ${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.surfaceAlt};border:1px solid ${BRAND.border};border-radius:10px">${rows}</table>` : ""}
      </td></tr>

      <tr><td style="padding:24px 30px 0 30px">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr><td bgcolor="${BRAND.yellow}" style="border-radius:8px;border:1px solid ${BRAND.ink}">
                <a href="${data.acceptLink}" target="_blank" style="display:inline-block;padding:16px 34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:${BRAND.ink};text-decoration:none;border-radius:8px">
                  Accept and sign
                </a>
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="padding-top:14px">
            <a href="${data.declineLink}" target="_blank" style="display:inline-block;padding:12px 24px;border:1px solid ${BRAND.border};border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:${BRAND.ink};text-decoration:none">
              Decline proposal
            </a>
          </td></tr>
          <tr><td style="padding-top:14px;font-family:Arial,Helvetica,sans-serif;font-size:13px">
            <a href="${data.viewLink}" target="_blank" style="color:${BRAND.inkMuted};text-decoration:underline">View full proposal</a>
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding:20px 30px 0 30px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${BRAND.inkMuted};line-height:1.6">
        All figures are estimates based on the system details provided and current carbon-credit assumptions. Actual income depends on verified generation, audit outcomes and market prices at the time of sale. No account or password is required to sign — the link above opens your proposal directly and is valid for 10 days.
      </td></tr>

      <tr><td style="padding:20px 30px 0 30px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.inkMuted};line-height:1.6">
        <strong style="color:${BRAND.ink}">Why am I receiving this?</strong><br/>
        ${
          data.agentFirstName && data.agentLastName
            ? `${escapeHtml(data.agentFirstName)} ${escapeHtml(data.agentLastName)}${data.agentCompanyName ? ` from ${escapeHtml(data.agentCompanyName)}` : ""} prepared this proposal for your project. If you have questions, or you did not expect this email, contact ${escapeHtml(data.agentFirstName)} at ${escapeHtml(data.agentEmail || "proposals@crunchcarbon.com")}.`
            : `A carbon credit proposal has been prepared for your project. If you have questions, or you did not expect this email, contact us at proposals@crunchcarbon.com.`
        }
      </td></tr>

      <tr><td style="padding:24px 30px 22px 30px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.ink};line-height:1.6">
        Warm regards,<br/><strong>The Crunch Carbon Team</strong>
      </td></tr>

      <tr><td style="background:${BRAND.ink};padding:20px 30px 24px 30px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#ffffff;line-height:1.6">
        Crunch Carbon (Pty) Ltd &nbsp;·&nbsp; Sunny South Africa<br/>
        Questions? <a href="mailto:support@crunchcarbon.com" style="color:${BRAND.yellow};text-decoration:none;font-weight:600">support@crunchcarbon.com</a>
      </td></tr>

      <tr><td style="display:none">
        <!-- Token: ${data.tokenPreview} -->
        <!-- Proposal: ${data.proposalId} -->
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
  }

  generatePlainTextTemplate(data: EmailTemplateData): string {
    const s = data.summary;
    const lines: string[] = [];
    lines.push("Your solar carbon income proposal is ready");
    lines.push("");
    lines.push(`Dear ${data.clientName},`);
    lines.push("");
    lines.push("1. Review - Review your personalised carbon-income proposal below.");
    lines.push("2. Sign - Accept and sign the cession agreement securely online.");
    lines.push("3. Onboard - Provide the project information required for verification.");
    lines.push("");
    lines.push(`Your proposal in 30 seconds - ${data.projectName}`);
    if (s.annualIncome) lines.push(`Estimated income: ${s.annualIncome} per year`);
    if (s.termIncome) lines.push(`Estimated over the proposal term: ${s.termIncome}`);
    for (const [k, v] of summaryRows(s)) lines.push(`${k}: ${v}`);
    lines.push("");
    lines.push(`Accept and sign: ${data.acceptLink}`);
    lines.push(`Decline proposal: ${data.declineLink}`);
    lines.push(`View full proposal: ${data.viewLink}`);
    lines.push("");
    lines.push(
      "All figures are estimates based on the system details provided and current carbon-credit assumptions. Actual income depends on verified generation, audit outcomes and market prices at the time of sale. No account or password is required to sign, and the link is valid for 10 days."
    );
    lines.push("");
    lines.push("Warm regards,");
    lines.push("The Crunch Carbon Team");
    lines.push("Crunch Carbon (Pty) Ltd - Sunny South Africa - support@crunchcarbon.com");
    return lines.join("\n");
  }

  async sendInvitationEmail(
    clientEmail: string,
    projectName: string,
    emailTemplate: string,
    ccEmail?: string,
    plainText?: string
  ) {
    const emailPayload: any = {
      from: "Crunch Carbon <proposals@crunchcarbon.com>",
      to: [clientEmail],
      subject: `Your solar carbon income proposal - ${projectName}`,
      html: emailTemplate,
    };

    if (plainText) {
      emailPayload.text = plainText;
    }

    // Add CC if agent email is provided
    if (ccEmail) {
      emailPayload.cc = [ccEmail];
    }

    return await this.resend.emails.send(emailPayload);
  }
}
