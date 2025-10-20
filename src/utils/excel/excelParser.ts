import * as XLSX from 'xlsx';
import { BulkProposalRow } from '@/types/proposals';

/**
 * Parse uploaded Excel file into proposal rows
 */
export function parseExcelFile(file: File): Promise<BulkProposalRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON, skip first 2 rows (header and description)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: null,
          raw: false
        }) as any[][];
        
        // Get headers from first row
        const headers = jsonData[0] as string[];
        
        // Parse data rows (skip header and description rows)
        const rows: BulkProposalRow[] = [];
        
        for (let i = 2; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.every(cell => !cell)) continue; // Skip empty rows
          
          const proposal: any = {};
          headers.forEach((header, idx) => {
            proposal[header] = row[idx];
          });
          
          // Convert types
          const parsed: BulkProposalRow = {
            proposal_title: String(proposal.proposal_title || '').trim(),
            client_email: String(proposal.client_email || '').trim().toLowerCase(),
            client_first_name: String(proposal.client_first_name || '').trim(),
            client_last_name: String(proposal.client_last_name || '').trim(),
            client_phone: proposal.client_phone ? String(proposal.client_phone).trim() : undefined,
            client_company_name: proposal.client_company_name ? String(proposal.client_company_name).trim() : undefined,
            project_name: String(proposal.project_name || '').trim(),
            project_address: String(proposal.project_address || '').trim(),
            system_size: parseFloat(String(proposal.system_size || '0')),
            system_size_unit: (String(proposal.system_size_unit || 'kWp').trim() as 'kWp' | 'MWp'),
            commission_date: String(proposal.commission_date || '').trim(),
            in_south_africa: parseYesNo(proposal.in_south_africa),
            not_registered: parseYesNo(proposal.not_registered),
            under_15mwp: parseYesNo(proposal.under_15mwp),
            commissioned_after_2022: parseYesNo(proposal.commissioned_after_2022),
            legal_ownership: parseYesNo(proposal.legal_ownership),
            additional_notes: proposal.additional_notes ? String(proposal.additional_notes).trim() : undefined,
            client_share_override: proposal.client_share_override ? parseFloat(String(proposal.client_share_override)) : undefined,
            agent_commission_override: proposal.agent_commission_override ? parseFloat(String(proposal.agent_commission_override)) : undefined
          };
          
          rows.push(parsed);
        }
        
        resolve(rows);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsBinaryString(file);
  });
}

/**
 * Parse Yes/No values to boolean
 */
function parseYesNo(value: any): boolean {
  const str = String(value || '').trim().toLowerCase();
  return str === 'yes' || str === 'y' || str === 'true' || str === '1';
}
