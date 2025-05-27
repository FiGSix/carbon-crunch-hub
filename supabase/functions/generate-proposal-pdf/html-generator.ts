
export function generateProfessionalHTML(proposal: any, agentInfo: any): string {
  const clientInfo = proposal.content?.clientInfo || {}
  const projectInfo = proposal.project_info || proposal.content?.projectInfo || {}
  
  // Calculate financial information with proper formatting
  const systemSizeKW = parseFloat(projectInfo.size || '0')
  const annualEnergyKWh = proposal.annual_energy || (systemSizeKW * 1500)
  const carbonCredits = proposal.carbon_credits || (annualEnergyKWh * 0.95 / 1000)
  const clientShare = proposal.client_share_percentage || 80
  const agentCommission = proposal.agent_commission_percentage || 5
  
  // Financial calculations using South African context
  const carbonPricePerTon = 120 // Updated to reflect current SA market
  const totalAnnualRevenue = carbonCredits * carbonPricePerTon
  const clientAnnualRevenue = totalAnnualRevenue * (clientShare / 100)
  const agentAnnualCommission = totalAnnualRevenue * (agentCommission / 100)
  const crunchCarbonFee = totalAnnualRevenue - clientAnnualRevenue - agentAnnualCommission
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>${proposal.title} - Crunch Carbon Proposal</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body { 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          line-height: 1.5;
          color: #1f2937;
          background: #ffffff;
          font-size: 14px;
        }
        
        .page {
          max-width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 15mm;
          background: white;
          page-break-inside: avoid;
        }
        
        /* Header with Crunch Carbon branding */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 4px solid #FFCD03;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .logo-section {
          flex: 1;
        }
        
        .company-name {
          font-size: 36px;
          font-weight: 800;
          color: #231F20;
          margin-bottom: 6px;
          letter-spacing: -0.5px;
        }
        
        .tagline {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .proposal-meta {
          text-align: right;
          font-size: 12px;
          color: #6b7280;
          line-height: 1.6;
        }
        
        .proposal-meta strong {
          color: #231F20;
          font-weight: 600;
        }
        
        /* Title section with yellow accent */
        .title-section {
          text-align: center;
          margin-bottom: 40px;
          padding: 35px 30px;
          background: linear-gradient(135deg, #FFCD03 0%, #FFD700 100%);
          border-radius: 12px;
          position: relative;
          overflow: hidden;
        }
        
        .title-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(35, 31, 32, 0.05);
          z-index: 1;
        }
        
        .title-section * {
          position: relative;
          z-index: 2;
        }
        
        .main-title {
          font-size: 32px;
          font-weight: 800;
          color: #231F20;
          margin-bottom: 10px;
          text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
        }
        
        .subtitle {
          font-size: 16px;
          color: #231F20;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        /* Section styling */
        .section {
          margin-bottom: 35px;
          background: #ffffff;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
        }
        
        .section-header {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 18px 25px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: #231F20;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .section-content {
          padding: 25px;
        }
        
        /* Information grid */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 25px;
          margin-bottom: 20px;
        }
        
        .info-item {
          margin-bottom: 18px;
        }
        
        .info-label {
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 6px;
        }
        
        .info-value {
          font-size: 15px;
          font-weight: 600;
          color: #231F20;
          line-height: 1.4;
        }
        
        /* Highlight boxes with Crunch Carbon styling */
        .highlight-box {
          background: linear-gradient(135deg, #231F20 0%, #2d2a2b 100%);
          color: #FFCD03;
          padding: 30px;
          border-radius: 12px;
          margin: 25px 0;
          position: relative;
          overflow: hidden;
        }
        
        .highlight-box::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 100px;
          height: 100px;
          background: radial-gradient(circle, rgba(255, 205, 3, 0.1) 0%, transparent 70%);
          transform: translateX(30px) translateY(-30px);
        }
        
        .highlight-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 20px;
          color: #FFCD03;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .highlight-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .highlight-item {
          text-align: center;
          padding: 15px;
          background: rgba(255, 205, 3, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(255, 205, 3, 0.3);
        }
        
        .highlight-label {
          font-size: 12px;
          opacity: 0.9;
          margin-bottom: 8px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .highlight-value {
          font-size: 26px;
          font-weight: 800;
          color: #FFCD03;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        /* Financial table */
        .financial-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 14px;
        }
        
        .financial-table th,
        .financial-table td {
          padding: 15px 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .financial-table th {
          background: linear-gradient(135deg, #231F20 0%, #2d2a2b 100%);
          color: #FFCD03;
          font-weight: 700;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .financial-table td {
          font-weight: 500;
        }
        
        .financial-table .amount {
          font-weight: 700;
          color: #231F20;
          font-size: 15px;
        }
        
        .financial-table tr:nth-child(even) {
          background: #f9fafb;
        }
        
        .financial-table tr:hover {
          background: #f3f4f6;
        }
        
        /* Status badge */
        .status-badge {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .status-pending {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #f59e0b;
        }
        
        .status-approved {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #10b981;
        }
        
        .status-draft {
          background: #e5e7eb;
          color: #374151;
          border: 1px solid #6b7280;
        }
        
        /* Footer */
        .footer {
          margin-top: 50px;
          padding-top: 25px;
          border-top: 3px solid #FFCD03;
          font-size: 12px;
        }
        
        .footer-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        
        .agent-contact,
        .company-info {
          flex: 1;
          line-height: 1.6;
        }
        
        .agent-contact {
          padding-right: 20px;
        }
        
        .company-info {
          text-align: right;
          padding-left: 20px;
        }
        
        .footer strong {
          color: #231F20;
          font-weight: 700;
          display: block;
          margin-bottom: 5px;
          font-size: 13px;
        }
        
        .disclaimer {
          font-size: 10px;
          line-height: 1.5;
          color: #6b7280;
          text-align: center;
          padding: 20px;
          background: #f9fafb;
          border-radius: 8px;
          border-left: 4px solid #FFCD03;
        }
        
        /* Print optimizations */
        @media print {
          .page {
            margin: 0;
            box-shadow: none;
            page-break-inside: avoid;
          }
          
          .section {
            page-break-inside: avoid;
          }
        }
        
        /* Utility classes */
        .text-center { text-align: center; }
        .font-bold { font-weight: 700; }
        .text-sm { font-size: 12px; }
        .mb-2 { margin-bottom: 8px; }
        .mt-4 { margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header with Crunch Carbon branding -->
        <div class="header">
          <div class="logo-section">
            <div class="company-name">CRUNCH CARBON</div>
            <div class="tagline">Carbon Credit Solutions</div>
          </div>
          <div class="proposal-meta">
            <div><strong>Proposal Ref:</strong> CC-${proposal.id.split('-')[0].toUpperCase()}</div>
            <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
            <div><strong>Status:</strong> <span class="status-badge status-${proposal.status}">${proposal.status.toUpperCase()}</span></div>
            <div><strong>Valid Until:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
          </div>
        </div>

        <!-- Title Section -->
        <div class="title-section">
          <h1 class="main-title">${proposal.title}</h1>
          <p class="subtitle">Carbon Credit Revenue Sharing Proposal</p>
        </div>

        <!-- Client Information -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Client Information</h2>
          </div>
          <div class="section-content">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Client Name</div>
                <div class="info-value">${clientInfo.name || 'Not specified'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Email Address</div>
                <div class="info-value">${clientInfo.email || 'Not specified'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Phone Number</div>
                <div class="info-value">${clientInfo.phone || 'Not specified'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Company</div>
                <div class="info-value">${clientInfo.companyName || 'Not specified'}</div>
              </div>
            </div>
            ${clientInfo.address ? `
              <div class="info-item">
                <div class="info-label">Address</div>
                <div class="info-value">${clientInfo.address}</div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Project Information -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Solar Installation Details</h2>
          </div>
          <div class="section-content">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Project Name</div>
                <div class="info-value">${projectInfo.name || 'Not specified'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">System Capacity</div>
                <div class="info-value">${systemSizeKW.toFixed(2)} kWp</div>
              </div>
              <div class="info-item">
                <div class="info-label">Installation Address</div>
                <div class="info-value">${projectInfo.address || 'Not specified'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Commission Date</div>
                <div class="info-value">${projectInfo.commissionDate ? new Date(projectInfo.commissionDate).toLocaleDateString('en-ZA') : 'To be confirmed'}</div>
              </div>
            </div>
            
            <div class="highlight-box">
              <div class="highlight-title">Annual Performance & Carbon Impact</div>
              <div class="highlight-grid">
                <div class="highlight-item">
                  <div class="highlight-label">Energy Generation</div>
                  <div class="highlight-value">${Math.round(annualEnergyKWh).toLocaleString()} kWh</div>
                </div>
                <div class="highlight-item">
                  <div class="highlight-label">Carbon Credits</div>
                  <div class="highlight-value">${carbonCredits.toFixed(1)} tons CO₂</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Financial Breakdown -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Revenue Distribution & Financial Terms</h2>
          </div>
          <div class="section-content">
            <table class="financial-table">
              <thead>
                <tr>
                  <th>Revenue Stream</th>
                  <th>Allocation</th>
                  <th>Annual Amount (Est.)</th>
                  <th>10-Year Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Total Carbon Credit Revenue</strong></td>
                  <td>100%</td>
                  <td class="amount">R ${totalAnnualRevenue.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</td>
                  <td class="amount">R ${(totalAnnualRevenue * 10).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</td>
                </tr>
                <tr>
                  <td>Client Revenue Share</td>
                  <td>${clientShare}%</td>
                  <td class="amount">R ${clientAnnualRevenue.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</td>
                  <td class="amount">R ${(clientAnnualRevenue * 10).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</td>
                </tr>
                <tr>
                  <td>Agent Commission</td>
                  <td>${agentCommission}%</td>
                  <td class="amount">R ${agentAnnualCommission.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</td>
                  <td class="amount">R ${(agentAnnualCommission * 10).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</td>
                </tr>
                <tr>
                  <td>Crunch Carbon Service Fee</td>
                  <td>${(100 - clientShare - agentCommission)}%</td>
                  <td class="amount">R ${crunchCarbonFee.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</td>
                  <td class="amount">R ${(crunchCarbonFee * 10).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</td>
                </tr>
              </tbody>
            </table>
            
            <div style="margin-top: 25px; padding: 20px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 8px; border-left: 4px solid #FFCD03;">
              <strong style="color: #231F20; display: block; margin-bottom: 10px;">Important Notes:</strong>
              <ul style="color: #4b5563; font-size: 13px; line-height: 1.6; margin-left: 20px;">
                <li>Revenue estimates based on current carbon credit pricing of R${carbonPricePerTon}/ton CO₂</li>
                <li>Actual revenues may vary based on market conditions and system performance</li>
                <li>Payments made quarterly following verified carbon credit sales</li>
                <li>All carbon credits subject to third-party verification and certification</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Terms & Conditions -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Agreement Terms & Conditions</h2>
          </div>
          <div class="section-content">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; font-size: 13px; line-height: 1.6;">
              <div>
                <div class="info-label">Contract Duration</div>
                <div class="info-value mb-2">10 years from commissioning date</div>
                
                <div class="info-label">Payment Schedule</div>
                <div class="info-value mb-2">Quarterly payments within 30 days of carbon credit sales</div>
                
                <div class="info-label">Verification Standard</div>
                <div class="info-value mb-2">VCS (Verified Carbon Standard) certification required</div>
              </div>
              <div>
                <div class="info-label">Performance Guarantee</div>
                <div class="info-value mb-2">Minimum 95% of projected carbon credit generation</div>
                
                <div class="info-label">Early Termination</div>
                <div class="info-value mb-2">6 months written notice required by either party</div>
                
                <div class="info-label">Dispute Resolution</div>
                <div class="info-value mb-2">Arbitration in accordance with South African law</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="footer-content">
            ${agentInfo ? `
              <div class="agent-contact">
                <strong>Your Carbon Credit Specialist</strong>
                ${agentInfo.first_name} ${agentInfo.last_name}<br>
                ${agentInfo.company_name || 'Crunch Carbon'}<br>
                ${agentInfo.email}<br>
                ${agentInfo.phone || ''}
              </div>
            ` : ''}
            <div class="company-info">
              <strong>Crunch Carbon (Pty) Ltd</strong>
              Leading Carbon Credit Solutions<br>
              Registration: 2023/123456/07<br>
              www.crunchcarbon.co.za<br>
              info@crunchcarbon.co.za
            </div>
          </div>
          
          <div class="disclaimer">
            <strong>Legal Disclaimer:</strong> This proposal is valid for 30 days from the date of issue. Carbon credit revenues are estimates based on current market conditions and projected energy production. Actual results may vary due to weather conditions, system performance, and market fluctuations. All carbon credits are subject to successful verification and registration with recognized carbon standards. By accepting this proposal, you agree to the terms and conditions outlined herein and acknowledge that you have read and understood the risks associated with carbon credit trading.
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}
