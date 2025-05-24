
import { Resend } from "npm:resend@2.0.0";
import { EmailTemplateData } from "./types.ts";

export class EmailService {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  generateEmailTemplate(data: EmailTemplateData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Proposal Invitation</h1>
        <p>Hello ${data.clientName},</p>
        <p>You have been invited to review a carbon credit proposal for the project: <strong>${data.projectName}</strong>.</p>
        <p>To view the proposal, please click the link below:</p>
        <p style="text-align: center;">
          <a href="${data.invitationLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Proposal</a>
        </p>
        <p>This invitation is valid for 48 hours. If you did not expect this invitation, please ignore this email.</p>
        <p>Best regards,<br>Your Carbon Credit Team</p>
        
        <!-- Debug info (hidden) -->
        <div style="display: none;">
          <!-- Token: ${data.tokenPreview} -->
          <!-- Proposal: ${data.proposalId} -->
        </div>
      </div>
    `;
  }

  async sendInvitationEmail(
    clientEmail: string,
    projectName: string,
    emailTemplate: string
  ) {
    return await this.resend.emails.send({
      from: "Carbon Credit Proposals <proposals@crunchcarbon.app>",
      to: [clientEmail],
      subject: `Proposal Invitation for ${projectName}`,
      html: emailTemplate,
    });
  }
}
