export interface PdfProposalData {
  id: string;
  title: string;
  client: {
    first_name?: string;
    last_name?: string;
    email?: string;
    company_name?: string;
  };
  agent: {
    first_name?: string;
    last_name?: string;
    company_name?: string;
  };
  system_size_kwp: number;
  carbon_credits: number;
  client_share_percentage: number;
  agent_commission_percentage: number;
  pdf_version: number;
  created_at: string;
}

export function generatePdfTemplate(proposal: PdfProposalData): string {
  const clientName = `${proposal.client?.first_name || ''} ${proposal.client?.last_name || ''}`.trim();
  const agentName = `${proposal.agent?.first_name || ''} ${proposal.agent?.last_name || ''}`.trim();
  const clientRevenue = ((proposal.carbon_credits || 0) * (proposal.client_share_percentage || 0) / 100).toFixed(2);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Carbon Credit Proposal - ${clientName}</title>
      <style>
        @page { 
          margin: 20mm; 
          size: A4; 
        }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          margin: 0;
          color: #2c3e50;
        }
        .page-break { 
          page-break-before: always; 
        }
        .header { 
          text-align: center; 
          margin-bottom: 40px;
          padding: 30px 0;
        }
        .logo-placeholder { 
          width: 200px; 
          height: 80px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          margin: 0 auto 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 18px;
          border-radius: 8px;
        }
        .main-title { 
          font-size: 32px; 
          font-weight: bold; 
          margin: 30px 0 20px;
          color: #1e3a8a;
        }
        .client-info { 
          font-size: 20px; 
          margin: 20px 0;
          color: #374151;
        }
        .revision-info {
          font-size: 16px;
          color: #6b7280;
          margin-top: 30px;
          padding: 15px;
          background-color: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #2563eb;
        }
        .section { 
          margin: 30px 0; 
        }
        .section h2 { 
          color: #1e3a8a; 
          border-bottom: 3px solid #2563eb; 
          padding-bottom: 8px;
          font-size: 22px;
          margin-bottom: 20px;
        }
        .section p {
          text-align: justify;
          margin-bottom: 15px;
        }
        .section ul {
          margin: 15px 0;
          padding-left: 25px;
        }
        .section li {
          margin-bottom: 8px;
        }
        .table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 25px 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .table th, .table td { 
          border: 1px solid #e5e7eb; 
          padding: 12px; 
          text-align: left; 
        }
        .table th { 
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          font-weight: 600;
        }
        .table tbody tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .highlight-cell {
          background-color: #dcfce7 !important;
          font-weight: 600;
          color: #166534;
        }
        .signature-section { 
          margin-top: 50px;
          padding: 30px;
          background-color: #f8fafc;
          border-radius: 12px;
          border: 2px solid #e5e7eb;
        }
        .signature-line { 
          border-bottom: 2px solid #374151; 
          width: 350px; 
          margin: 25px 0 10px; 
          padding-bottom: 8px;
          display: inline-block;
        }
        .footer { 
          text-align: center; 
          margin-top: 100px; 
          padding: 40px 20px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          border-radius: 12px;
        }
        .footer h2 {
          color: white;
          border-bottom: 2px solid white;
          display: inline-block;
          padding-bottom: 8px;
          margin-bottom: 20px;
        }
        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 20px;
        }
        .benefit-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 20px 0;
        }
        .benefit-card {
          background: #f0f9ff;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #2563eb;
        }
        .benefit-card h3 {
          color: #1e3a8a;
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <!-- Page 1: Cover Page -->
      <div class="header">
        <div class="logo-placeholder">
          CrunchCarbon
        </div>
        <div class="main-title">Carbon Credit Proposal</div>
        <div class="client-info">
          <strong>${clientName || 'Valued Client'}</strong><br>
          ${proposal.client?.company_name ? `<em>${proposal.client.company_name}</em><br>` : ''}
          ${proposal.client?.email || ''}
        </div>
        <div class="revision-info">
          <strong>Document Revision: ${proposal.pdf_version || 1}</strong><br>
          <em>Generated: ${new Date().toLocaleDateString('en-ZA', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</em>
        </div>
      </div>

      <!-- Page 2: Content Sections -->
      <div class="page-break">
        <div class="section">
          <h2>About CrunchCarbon</h2>
          <p>CrunchCarbon is South Africa's leading carbon credit solutions provider, specializing in helping businesses transform their renewable energy investments into sustainable revenue streams. With our comprehensive approach to carbon credit generation and management, we empower organizations to achieve their environmental goals while maximizing financial returns.</p>
          
          <p>Our expertise spans across various renewable energy technologies, with a particular focus on solar photovoltaic systems. We handle the entire carbon credit lifecycle, from initial assessment and registration through to monitoring, verification, and revenue distribution.</p>
        </div>

        <div class="section">
          <h2>Key Benefits</h2>
          <div class="benefit-grid">
            <div class="benefit-card">
              <h3>🌱 Environmental Impact</h3>
              <p>Contribute directly to South Africa's carbon reduction goals while showcasing your commitment to sustainability.</p>
            </div>
            <div class="benefit-card">
              <h3>💰 Additional Revenue</h3>
              <p>Generate ongoing income from your renewable energy investment through certified carbon credits.</p>
            </div>
            <div class="benefit-card">
              <h3>🏆 Market Recognition</h3>
              <p>Enhance your brand reputation with verified environmental credentials and compliance documentation.</p>
            </div>
            <div class="benefit-card">
              <h3>📊 Transparent Reporting</h3>
              <p>Access detailed monitoring and reporting systems to track your environmental and financial impact.</p>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Our Process</h2>
          <p><strong>1. Initial Assessment:</strong> We evaluate your renewable energy system and determine carbon credit generation potential.</p>
          <p><strong>2. Registration & Certification:</strong> We handle all regulatory requirements and obtain necessary certifications for your project.</p>
          <p><strong>3. Monitoring & Verification:</strong> Continuous monitoring ensures accurate measurement of your carbon impact.</p>
          <p><strong>4. Revenue Generation:</strong> Regular distribution of carbon credit revenues directly to your account.</p>
        </div>
      </div>

      <!-- Page 3: Projections & Acceptance -->
      <div class="page-break">
        <div class="section">
          <h2>Carbon Credit Projections</h2>
          <p>Based on your ${proposal.system_size_kwp || 0} kWp renewable energy system, below are the projected annual carbon credit revenues:</p>
          
          <table class="table">
            <thead>
              <tr>
                <th>System Specification</th>
                <th>Annual Performance</th>
                <th>Financial Returns</th>
                <th>Environmental Impact</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${proposal.system_size_kwp || 0} kWp</strong><br><em>System Capacity</em></td>
                <td><strong>${proposal.carbon_credits || 0}</strong><br><em>Carbon Credits/Year</em></td>
                <td class="highlight-cell"><strong>R ${clientRevenue}</strong><br><em>Annual Client Revenue</em></td>
                <td><strong>${proposal.client_share_percentage || 0}%</strong><br><em>Client Share</em></td>
              </tr>
            </tbody>
          </table>

          <p><em>Note: Projections are based on current market conditions and system specifications. Actual results may vary due to weather conditions, market fluctuations, and regulatory changes.</em></p>
        </div>

        <div class="signature-section">
          <h2>Proposal Acceptance</h2>
          <p>By signing below, I acknowledge that I have read and understood the terms of this carbon credit proposal and agree to proceed with the outlined arrangement.</p>
          
          <div style="margin-top: 40px;">
            <p><strong>Client Name:</strong> ${clientName || '_'.repeat(30)}</p>
            <p><strong>Company:</strong> ${proposal.client?.company_name || '_'.repeat(30)}</p>
          </div>
          
          <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
            <div>
              <div><strong>Signature:</strong></div>
              <div class="signature-line"></div>
            </div>
            <div>
              <div><strong>Date:</strong></div>
              <div class="signature-line"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Page 4: Back Page -->
      <div class="page-break">
        <div class="footer">
          <div class="logo-placeholder" style="margin-bottom: 30px;">
            CrunchCarbon
          </div>
          
          <h2>CrunchCarbon (Pty) Ltd</h2>
          
          <p style="font-size: 18px; margin: 20px 0;">
            <em>Leading Carbon Credit Solutions in South Africa</em>
          </p>
          
          <div class="contact-grid">
            <div>
              <strong>Contact Information:</strong><br>
              Email: info@crunchcarbon.com<br>
              Website: www.crunchcarbon.com<br>
              Phone: +27 11 123 4567
            </div>
            <div>
              <strong>Office Address:</strong><br>
              123 Green Energy Street<br>
              Johannesburg, 2000<br>
              South Africa
            </div>
          </div>
          
          <p style="margin-top: 30px; font-size: 14px; opacity: 0.9;">
            This document contains confidential and proprietary information. 
            Any unauthorized reproduction or distribution is strictly prohibited.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}