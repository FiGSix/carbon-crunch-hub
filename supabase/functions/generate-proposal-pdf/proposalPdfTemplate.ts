// Simple HTML template generator for the proposal "PDF"
// Note: The calling edge function currently uploads HTML as a PDF byte stream.
// This template returns a complete HTML document as a string.

export interface PdfTemplateParams {
  id: string;
  title: string;
  client: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    company_name?: string | null;
  } | Record<string, any>;
  agent: {
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
  } | Record<string, any>;
  system_size_kwp: number;
  carbon_credits: number;
  client_share_percentage: number;
  agent_commission_percentage: number;
  pdf_version: number;
  created_at: string;
  project_address?: string | null;
  commission_date?: string | null;
}

export function generatePdfTemplate(data: PdfTemplateParams): string {
  const clientName = formatName(
    (data.client as any)?.first_name,
    (data.client as any)?.last_name,
  ) || (data.client as any)?.company_name || 'Client';

  const agentName = formatName(
    (data.agent as any)?.first_name,
    (data.agent as any)?.last_name,
  ) || (data.agent as any)?.company_name || 'Your Agent';

  const createdDate = new Date(data.created_at).toLocaleDateString();
  const commissionDate = data.commission_date 
    ? new Date(data.commission_date).toLocaleDateString() 
    : 'To be confirmed';

  const estClientValue = safeRound(
    (data.carbon_credits || 0) * ((data.client_share_percentage || 0) / 100)
  );
  const estAgentCommission = safeRound(
    estClientValue * ((data.agent_commission_percentage || 0) / 100)
  );

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(data.title)} — Proposal v${data.pdf_version}</title>
  <style>
    @page { margin: 24mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a; }
    .page { page-break-after: always; }
    .no-break { page-break-after: avoid; }
    h1 { font-size: 28px; margin: 0 0 8px; }
    h2 { font-size: 20px; margin: 24px 0 8px; }
    h3 { font-size: 16px; margin: 16px 0 6px; }
    p, li { font-size: 12px; line-height: 1.6; color: #334155; }
    .muted { color: #64748b; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; }
    .meta { font-size: 11px; color: #475569; }
    .kpi { font-size: 22px; font-weight: 700; color: #0f172a; }
    .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; }
    .table { width: 100%; border-collapse: collapse; }
    .table th, .table td { text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .yellow-page { background: #FCD34D; min-height: 100vh; padding: 40px; }
    .yellow-page h2 { color: #0f172a; font-size: 28px; margin-bottom: 16px; }
    .yellow-page p { color: #1f2937; font-size: 13px; line-height: 1.7; margin-bottom: 24px; }
    .schedule-table { background: white; border-radius: 8px; padding: 20px; }
    .schedule-table .table td { border-bottom: 1px solid #e5e7eb; padding: 12px; }
    .schedule-table .table td:first-child { font-weight: 600; color: #374151; width: 45%; }
    .schedule-table .table td:last-child { color: #0f172a; }
  </style>
</head>
<body>
  <!-- Cover / Summary -->
  <section class="page">
    <h1>${escapeHtml(data.title)}</h1>
    <p class="muted">Proposal ID: ${escapeHtml(data.id)} • Version ${data.pdf_version} • Created ${createdDate}</p>

    <div class="grid" style="margin-top: 16px;">
      <div class="card">
        <div class="label">Prepared for</div>
        <div>${escapeHtml(clientName)}</div>
        <div class="meta">${escapeHtml((data.client as any)?.email || '')}</div>
      </div>
      <div class="card">
        <div class="label">Prepared by</div>
        <div>${escapeHtml(agentName)}</div>
        <div class="meta">${escapeHtml((data.agent as any)?.company_name || '')}</div>
      </div>
    </div>

    <div class="grid" style="margin-top: 16px;">
      <div class="card">
        <div class="label">System Size</div>
        <div class="kpi">${formatNumber(data.system_size_kwp)} kWp</div>
      </div>
      <div class="card">
        <div class="label">Est. Annual Carbon Credits</div>
        <div class="kpi">${formatNumber(data.carbon_credits)}</div>
      </div>
    </div>

    <div class="grid" style="margin-top: 16px;">
      <div class="card">
        <div class="label">Client Share</div>
        <div class="kpi">${formatNumber(data.client_share_percentage)}%</div>
      </div>
      <div class="card">
        <div class="label">Agent Commission</div>
        <div class="kpi">${formatNumber(data.agent_commission_percentage)}%</div>
      </div>
    </div>

    <div class="footer">This document is an estimate based on information available at the time of creation and is subject to change.</div>
  </section>

  <!-- Projections -->
  <section class="page">
    <h2>Projected Value</h2>
    <table class="table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Estimated Client Value</td>
          <td>${formatCurrency(estClientValue)}</td>
        </tr>
        <tr>
          <td>Estimated Agent Commission</td>
          <td>${formatCurrency(estAgentCommission)}</td>
        </tr>
      </tbody>
    </table>

    <h2>Assumptions</h2>
    <ul>
      <li>Estimates are based on the provided system size and expected annual generation.</li>
      <li>Actual outcomes may vary based on market conditions and system performance.</li>
      <li>All figures are indicative and not guaranteed.</li>
    </ul>

    <div class="footer">Questions? Contact ${escapeHtml(agentName)} for more details.</div>
  </section>

  <!-- Project Schedule (Yellow Page) -->
  <section class="page yellow-page">
    <h2>Project Schedule</h2>
    <p>
      The project schedule is based on information as provided by the Client or Client's Agent or Solar Installer. 
      The proposal, based on the project schedule, can be amended as required and will be annexed to the Cession Agreement. 
      Note that it may impact the eligibility and structure of the agreement.
    </p>
    
    <div class="schedule-table">
      <table class="table">
        <tbody>
          <tr>
            <td>Project Address</td>
            <td>${escapeHtml(data.project_address || 'To be confirmed')}</td>
          </tr>
          <tr>
            <td>System Size</td>
            <td>${formatNumber(data.system_size_kwp)} kWp</td>
          </tr>
          <tr>
            <td>Solar System Size in kWp</td>
            <td>${formatNumber(data.system_size_kwp)} kWp</td>
          </tr>
          <tr>
            <td>Date of Commissioning</td>
            <td>${escapeHtml(commissionDate)}</td>
          </tr>
          <tr>
            <td>Client Share</td>
            <td>${formatNumber(data.client_share_percentage)}%</td>
          </tr>
          <tr>
            <td>Agent Commission</td>
            <td>${formatNumber(data.agent_commission_percentage)}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- Terms and Acceptance -->
  <section class="page">
    <h2>Agreement Summary</h2>
    <div class="card">
      <h3>Key Terms</h3>
      <ul>
        <li>Client share: ${formatNumber(data.client_share_percentage)}% of net carbon credit proceeds.</li>
        <li>Agent commission: ${formatNumber(data.agent_commission_percentage)}% of client proceeds.</li>
        <li>Proposal valid for 30 days from issue date.</li>
      </ul>
    </div>

    <h2>Acceptance</h2>
    <p>By signing below, the client agrees to proceed under the terms outlined in this proposal.</p>
    <div class="grid" style="margin-top: 24px;">
      <div class="card">
        <div class="label">Client Signature</div>
        <div style="height: 60px; border-bottom: 1px solid #cbd5e1; margin: 12px 0;"></div>
        <div class="meta">Name: ${escapeHtml(clientName)} • Date: __________</div>
      </div>
      <div class="card">
        <div class="label">Agent Signature</div>
        <div style="height: 60px; border-bottom: 1px solid #cbd5e1; margin: 12px 0;"></div>
        <div class="meta">Name: ${escapeHtml(agentName)} • Date: __________</div>
      </div>
    </div>

    <div class="footer">Thank you for considering this proposal.</div>
  </section>

  <!-- Back matter -->
  <section>
    <h2>Additional Information</h2>
    <p class="muted">This page intentionally left for notes and additional details relevant to the project.</p>
    <div class="footer">Proposal v${data.pdf_version} • Generated on ${createdDate}</div>
  </section>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatName(first?: string | null, last?: string | null): string {
  const f = (first || '').trim();
  const l = (last || '').trim();
  return [f, l].filter(Boolean).join(' ');
}

function safeRound(n: number): number {
  return Math.round((n || 0) * 100) / 100;
}

function formatNumber(n: number): string {
  return isFinite(n as any) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n) : '0';
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}
