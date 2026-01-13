
import * as XLSX from 'xlsx';
import { LeadRow } from '@/types/leads';

/**
 * Column mappings for flexible header matching
 */
const COLUMN_MAPPINGS: Record<string, keyof LeadRow> = {
  'company_name': 'company_name',
  'company name': 'company_name',
  'company': 'company_name',
  'name': 'company_name',
  'contact_name': 'contact_name',
  'contact name': 'contact_name',
  'contact': 'contact_name',
  'contact person': 'contact_name',
  'email': 'email',
  'email address': 'email',
  'phone': 'phone',
  'phone number': 'phone',
  'telephone': 'phone',
  'tel': 'phone',
  'website': 'website',
  'web': 'website',
  'url': 'website',
  'site': 'website',
  'location': 'location',
  'city': 'location',
  'province': 'location',
  'address': 'location',
  'source': 'source',
  'lead source': 'source',
  'notes': 'notes',
  'note': 'notes',
  'comments': 'notes',
  'comment': 'notes',
  'additional info': 'notes',
};

/**
 * Detect delimiter in text data (tab, comma, semicolon)
 */
function detectDelimiter(line: string): string {
  const tabCount = (line.match(/\t/g) || []).length;
  const commaCount = (line.match(/,/g) || []).length;
  const semicolonCount = (line.match(/;/g) || []).length;

  if (tabCount >= commaCount && tabCount >= semicolonCount) return '\t';
  if (semicolonCount >= commaCount) return ';';
  return ',';
}

/**
 * Normalize header name for mapping
 */
function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/[_-]/g, ' ');
}

/**
 * Map header to LeadRow field
 */
function mapHeader(header: string): keyof LeadRow | null {
  const normalized = normalizeHeader(header);
  return COLUMN_MAPPINGS[normalized] || null;
}

/**
 * Parse pasted text data (CSV, Tab-separated, etc.)
 */
export function parseTextData(text: string): LeadRow[] {
  const lines = text.trim().split('\n').filter(line => line.trim());
  if (lines.length < 2) return []; // Need at least header + 1 data row

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map(h => h.trim());
  
  // Map headers to LeadRow fields
  const fieldMap: Array<keyof LeadRow | null> = headers.map(mapHeader);
  
  // Parse data rows
  const rows: LeadRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter);
    if (values.every(v => !v.trim())) continue; // Skip empty rows
    
    const row: Partial<LeadRow> = {};
    
    fieldMap.forEach((field, idx) => {
      if (field && values[idx]) {
        const value = values[idx].trim();
        if (value) {
          if (field === 'email') {
            row[field] = value.toLowerCase();
          } else {
            row[field] = value;
          }
        }
      }
    });
    
    // Only add if we have at least company_name
    if (row.company_name) {
      rows.push(row as LeadRow);
    }
  }
  
  return rows;
}

/**
 * Parse Excel file into lead rows
 */
export function parseLeadExcelFile(file: File): Promise<LeadRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON array
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: null,
          raw: false
        }) as any[][];
        
        if (jsonData.length < 2) {
          resolve([]);
          return;
        }
        
        // Get headers from first row
        const headers = jsonData[0] as string[];
        const fieldMap: Array<keyof LeadRow | null> = headers.map(h => 
          h ? mapHeader(String(h)) : null
        );
        
        // Check if second row looks like a description row (common in templates)
        let startRow = 1;
        if (jsonData[1] && typeof jsonData[1][0] === 'string') {
          const firstCell = String(jsonData[1][0]).toLowerCase();
          if (firstCell.includes('required') || firstCell.includes('description') || firstCell.includes('example')) {
            startRow = 2;
          }
        }
        
        // Parse data rows
        const rows: LeadRow[] = [];
        
        for (let i = startRow; i < jsonData.length; i++) {
          const rowData = jsonData[i];
          if (!rowData || rowData.every(cell => !cell)) continue;
          
          const row: Partial<LeadRow> = {};
          
          fieldMap.forEach((field, idx) => {
            if (field && rowData[idx]) {
              const value = String(rowData[idx]).trim();
              if (value) {
                if (field === 'email') {
                  row[field] = value.toLowerCase();
                } else {
                  row[field] = value;
                }
              }
            }
          });
          
          if (row.company_name) {
            rows.push(row as LeadRow);
          }
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
