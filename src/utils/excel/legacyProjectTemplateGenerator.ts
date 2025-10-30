import * as XLSX from 'xlsx';

/**
 * Generate Excel template for bulk legacy project upload
 */
export function generateLegacyProjectTemplate(): void {
  const wb = XLSX.utils.book_new();
  
  const headers = [
    'project_title',
    'client_email',
    'client_first_name',
    'client_last_name',
    'client_phone',
    'client_company_name',
    'system_address',
    'system_size_kwp',
    'commissioning_date',
    'signed_date',
    'agent_email',
    'inverter_brand',
    'inverter_model',
    'inverter_capacity_kw',
    'inverter_quantity',
    'inverter_serial',
    'panel_brand',
    'panel_size_wp',
    'panel_quantity',
    'battery_capacity_kwh',
    'battery_brand',
    'battery_model',
    'total_capex',
    'client_share_percentage',
    'agent_commission_percentage'
  ];
  
  const descriptions = [
    'Project title/name (required)',
    'Client email address (required)',
    'Client first name (required)',
    'Client last name (required)',
    'Client phone number (optional)',
    'Client company name (optional)',
    'System installation address (required)',
    'System size in kWp (required)',
    'Commission date YYYY-MM-DD (required)',
    'Agreement signed date YYYY-MM-DD (required)',
    'Agent email to assign project (required)',
    'Inverter brand (optional)',
    'Inverter model (optional)',
    'Inverter capacity in kW (optional)',
    'Number of inverters (optional)',
    'Inverter serial number (optional)',
    'Panel brand (optional)',
    'Panel size in Wp (optional)',
    'Number of panels (optional)',
    'Battery capacity in kWh (optional)',
    'Battery brand (optional)',
    'Battery model (optional)',
    'Total CAPEX in ZAR (optional)',
    'Client share % (optional, default 75)',
    'Agent commission % (optional, default 4)'
  ];
  
  const exampleData = [
    [
      'Rooftop Solar Installation Alpha',
      'john.doe@example.com',
      'John',
      'Doe',
      '+27123456789',
      'ABC Solar Ltd',
      '123 Main Street, Johannesburg, 2000',
      500,
      '2023-06-15',
      '2023-06-01',
      'shaun@crunchcarbon.com',
      'Huawei',
      'SUN2000-60KTL-M0',
      60,
      1,
      'HW2023001',
      'JA Solar',
      550,
      910,
      '',
      '',
      '',
      2500000,
      75,
      4
    ],
    [
      'Ground Mount Solar Farm',
      'jane.smith@energysolutions.co.za',
      'Jane',
      'Smith',
      '+27987654321',
      'Energy Solutions Inc',
      '456 Industrial Park, Cape Town, 8000',
      2500,
      '2024-01-20',
      '2024-01-10',
      'shaun@crunchcarbon.com',
      'Fronius',
      'Fronius Eco 27.0-3-S',
      27,
      3,
      'FR2024001',
      'Canadian Solar',
      450,
      5556,
      200,
      'BYD',
      'BYD B-Box Premium HVS 10.2',
      18000000,
      '',
      ''
    ]
  ];
  
  const data = [
    headers,
    descriptions,
    ...exampleData
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  
  ws['!cols'] = [
    { wch: 35 }, // project_title
    { wch: 30 }, // client_email
    { wch: 18 }, // client_first_name
    { wch: 18 }, // client_last_name
    { wch: 18 }, // client_phone
    { wch: 25 }, // client_company_name
    { wch: 45 }, // system_address
    { wch: 18 }, // system_size_kwp
    { wch: 18 }, // commissioning_date
    { wch: 18 }, // signed_date
    { wch: 30 }, // agent_email
    { wch: 18 }, // inverter_brand
    { wch: 25 }, // inverter_model
    { wch: 20 }, // inverter_capacity_kw
    { wch: 18 }, // inverter_quantity
    { wch: 20 }, // inverter_serial
    { wch: 18 }, // panel_brand
    { wch: 16 }, // panel_size_wp
    { wch: 16 }, // panel_quantity
    { wch: 20 }, // battery_capacity_kwh
    { wch: 18 }, // battery_brand
    { wch: 25 }, // battery_model
    { wch: 16 }, // total_capex
    { wch: 22 }, // client_share_percentage
    { wch: 26 }  // agent_commission_percentage
  ];
  
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "4472C4" } },
    alignment: { horizontal: "center", vertical: "center" }
  };
  
  const descStyle = {
    font: { italic: true, color: { rgb: "666666" } },
    alignment: { horizontal: "left", vertical: "center" }
  };
  
  headers.forEach((_, idx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: idx });
    if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
    ws[cellRef].s = headerStyle;
  });
  
  descriptions.forEach((_, idx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 1, c: idx });
    if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
    ws[cellRef].s = descStyle;
  });
  
  XLSX.utils.book_append_sheet(wb, ws, 'Legacy Projects');
  XLSX.writeFile(wb, 'Legacy_Project_Upload_Template.xlsx');
}
