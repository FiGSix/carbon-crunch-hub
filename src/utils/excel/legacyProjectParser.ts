import * as XLSX from 'xlsx';
import { LegacyProjectRow } from '@/types/legacyProject';

/**
 * Parse uploaded Excel file into legacy project rows
 */
export function parseLegacyProjectFile(file: File): Promise<LegacyProjectRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: null,
          raw: false
        }) as any[][];
        
        const headers = jsonData[0] as string[];
        const rows: LegacyProjectRow[] = [];
        
        for (let i = 2; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.every(cell => !cell)) continue;
          
          const project: any = {};
          headers.forEach((header, idx) => {
            project[header] = row[idx];
          });
          
          const parsed: LegacyProjectRow = {
            project_title: String(project.project_title || '').trim(),
            client_email: String(project.client_email || '').trim().toLowerCase(),
            client_first_name: String(project.client_first_name || '').trim(),
            client_last_name: String(project.client_last_name || '').trim(),
            client_phone: project.client_phone ? String(project.client_phone).trim() : undefined,
            client_company_name: project.client_company_name ? String(project.client_company_name).trim() : undefined,
            system_address: String(project.system_address || '').trim(),
            system_size_kwp: parseFloat(String(project.system_size_kwp || '0')),
            commissioning_date: String(project.commissioning_date || '').trim(),
            signed_date: String(project.signed_date || '').trim(),
            agent_email: String(project.agent_email || '').trim().toLowerCase(),
            inverter_brand: project.inverter_brand ? String(project.inverter_brand).trim() : undefined,
            inverter_model: project.inverter_model ? String(project.inverter_model).trim() : undefined,
            inverter_capacity_kw: project.inverter_capacity_kw ? parseFloat(String(project.inverter_capacity_kw)) : undefined,
            inverter_quantity: project.inverter_quantity ? parseInt(String(project.inverter_quantity)) : undefined,
            inverter_serial: project.inverter_serial ? String(project.inverter_serial).trim() : undefined,
            panel_brand: project.panel_brand ? String(project.panel_brand).trim() : undefined,
            panel_size_wp: project.panel_size_wp ? parseFloat(String(project.panel_size_wp)) : undefined,
            panel_quantity: project.panel_quantity ? parseInt(String(project.panel_quantity)) : undefined,
            battery_capacity_kwh: project.battery_capacity_kwh ? parseFloat(String(project.battery_capacity_kwh)) : undefined,
            battery_brand: project.battery_brand ? String(project.battery_brand).trim() : undefined,
            battery_model: project.battery_model ? String(project.battery_model).trim() : undefined,
            total_capex: project.total_capex ? parseFloat(String(project.total_capex)) : undefined
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
