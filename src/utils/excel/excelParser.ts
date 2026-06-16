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
            commission_date: normalizeDate(proposal.commission_date),
            in_south_africa: parseYesNo(proposal.in_south_africa),
            not_registered: parseYesNo(proposal.not_registered),
            under_15mwp: parseYesNo(proposal.under_15mwp),
            commissioned_after_2022: parseYesNo(proposal.commissioned_after_2022),
            legal_ownership: parseYesNo(proposal.legal_ownership),
            additional_notes: proposal.additional_notes ? String(proposal.additional_notes).trim() : undefined,
            assigned_agent_email: proposal.assigned_agent_email ? String(proposal.assigned_agent_email).trim().toLowerCase() : undefined
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
 * Normalize date from various formats to YYYY-MM-DD
 */
function normalizeDate(value: any): string {
  if (!value) return '';
  
  const str = String(value).trim();
  
  // Already in YYYY/MM/DD or YYYY-MM-DD format
  if (/^\d{4}[-\/]\d{2}[-\/]\d{2}$/.test(str)) {
    return str.replace(/\//g, '-');
  }
  
  // MM/DD/YY or M/DD/YY or M/D/YY format (Excel default US format)
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(str)) {
    const parts = str.split('/');
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    // Assume 00-49 = 2000-2049, 50-99 = 1950-1999
    const year = parseInt(parts[2]) > 49 ? `19${parts[2]}` : `20${parts[2]}`;
    return `${year}-${month}-${day}`;
  }
  
  // MM/DD/YYYY or M/DD/YYYY or M/D/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const parts = str.split('/');
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    return `${parts[2]}-${month}-${day}`;
  }
  
  return str;
}

/**
 * Parse Yes/No values to boolean
 */
function parseYesNo(value: any): boolean {
  const str = String(value || '').trim().toLowerCase();
  return str === 'yes' || str === 'y' || str === 'true' || str === '1';
}
