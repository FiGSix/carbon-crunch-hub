
import { Resend } from "npm:resend@2.0.0";
import { EmailTemplateData } from "./types.ts";

export class EmailService {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  generateEmailTemplate(data: EmailTemplateData): string {
    const projectDetailsHtml = (data.systemSize || data.carbonCredits) ? `
      <div style="background: #F8F9FA; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #F4C430;">
        <h3 style="margin: 0 0 15px 0; color: #1A1A1A; font-size: 16px; font-weight: 600;">Project Summary</h3>
        ${data.systemSize ? `<p style="margin: 8px 0; color: #4A5568; font-size: 14px;"><strong>System Size:</strong> ${data.systemSize}</p>` : ''}
        ${data.carbonCredits ? `<p style="margin: 8px 0; color: #4A5568; font-size: 14px;"><strong>Estimated Carbon Credits:</strong> ${data.carbonCredits.toLocaleString()}</p>` : ''}
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Proposal Invitation - Crunch Carbon</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F3F4F6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF;">
          
          <!-- Header with Golden Gradient -->
          <div style="background: linear-gradient(135deg, #F4C430 0%, #D4A017 100%); padding: 40px 30px; text-align: center;">
            <h1 style="margin: 0; color: #1A1A1A; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
              Crunch Carbon
            </h1>
            <p style="margin: 8px 0 0 0; color: #2D3748; font-size: 14px; font-weight: 500; letter-spacing: 0.5px;">
              CARBON CREDIT PROPOSAL
            </p>
          </div>

          <!-- Main Content -->
          <div style="padding: 40px 30px;">
            <p style="margin: 0 0 20px 0; color: #1A1A1A; font-size: 16px; line-height: 1.6;">
              Dear <strong>${data.clientName}</strong>,
            </p>
            
            <p style="margin: 0 0 20px 0; color: #4A5568; font-size: 15px; line-height: 1.7;">
              You have been invited to review a carbon credit proposal for:
            </p>

            <div style="background: #F8F9FA; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #F4C430;">
              <h2 style="margin: 0; color: #1A1A1A; font-size: 20px; font-weight: 600;">
                ${data.projectName}
              </h2>
            </div>

            ${projectDetailsHtml}

            <!-- CTA Button -->
            <div style="text-align: center; margin: 35px 0;">
              <a href="${data.invitationLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #F4C430 0%, #D4A017 100%); color: #1A1A1A; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(244, 196, 48, 0.3); transition: transform 0.2s;">
                View Your Proposal
              </a>
            </div>

            <!-- What Happens Next -->
            <div style="background: #F8FAFC; border-left: 3px solid #F4C430; border-radius: 6px; padding: 20px; margin: 30px 0;">
              <h3 style="margin: 0 0 12px 0; color: #1A1A1A; font-size: 16px; font-weight: 600;">What happens next?</h3>
              <ul style="margin: 0; padding: 0 0 0 20px; color: #4A5568; font-size: 14px; line-height: 1.8;">
                <li style="margin: 8px 0;">Click the button above to view your complete proposal (no login required)</li>
                <li style="margin: 8px 0;">Review all the details at your convenience</li>
                <li style="margin: 8px 0;">When ready to approve or reject, you'll create a quick account or sign in (takes 30 seconds)</li>
              </ul>
            </div>

            <!-- Important Notice -->
            <div style="background: #FFF8E1; border: 1px solid #FFE082; border-radius: 8px; padding: 16px; margin: 30px 0;">
              <p style="margin: 0; color: #F57C00; font-size: 14px; line-height: 1.6;">
                ⏱️ <strong>Important:</strong> This invitation is valid for 48 hours. If you did not expect this invitation, please disregard this email.
              </p>
            </div>

            <p style="margin: 25px 0 0 0; color: #4A5568; font-size: 15px; line-height: 1.7;">
              If you have any questions about this proposal, please don't hesitate to reach out to our team.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #F8F9FA; padding: 30px; border-top: 1px solid #E2E8F0;">
            <p style="margin: 0 0 8px 0; color: #1A1A1A; font-size: 15px; font-weight: 600;">
              Best regards,
            </p>
            <p style="margin: 0 0 20px 0; color: #4A5568; font-size: 15px;">
              The Crunch Carbon Team
            </p>
            
            <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; margin-top: 20px;">
              <p style="margin: 0 0 8px 0; color: #718096; font-size: 13px; line-height: 1.6;">
                <strong>Crunch Carbon</strong><br>
                Carbon Credit Solutions<br>
                proposals@crunchcarbon.app
              </p>
              <p style="margin: 15px 0 0 0; color: #A0AEC0; font-size: 12px; line-height: 1.5;">
                © ${new Date().getFullYear()} Crunch Carbon. All rights reserved.
              </p>
            </div>
          </div>

          <!-- Debug info (hidden) -->
          <div style="display: none;">
            <!-- Token: ${data.tokenPreview} -->
            <!-- Proposal: ${data.proposalId} -->
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendInvitationEmail(
    clientEmail: string,
    projectName: string,
    emailTemplate: string
  ) {
    return await this.resend.emails.send({
      from: "Crunch Carbon <proposals@crunchcarbon.app>",
      to: [clientEmail],
      subject: `Carbon Credit Proposal - ${projectName}`,
      html: emailTemplate,
    });
  }
}
