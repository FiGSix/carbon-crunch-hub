import * as XLSX from 'xlsx';

/**
 * Generate Excel template for bulk proposal upload
 */
export function generateProposalTemplate(): void {
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  
  // Define headers with descriptions
  const headers = [
    'proposal_title',
    'client_email',
    'client_first_name',
    'client_last_name',
    'client_phone',
    'client_company_name',
    'project_name',
    'project_address',
    'system_size',
    'system_size_unit',
    'commission_date',
    'in_south_africa',
    'not_registered',
    'under_15mwp',
    'commissioned_after_2022',
    'legal_ownership',
    'additional_notes',
    'assigned_agent_email'
  ];
  
  const descriptions = [
    'Proposal title/name',
    'Client email (required)',
    'Client first name',
    'Client last name',
    'Client phone (optional)',
    'Company name (optional)',
    'Project name',
    'Project address',
    'System size (number)',
    'kWp or MWp',
    'YYYY/MM/DD',
    'Yes or No',
    'Yes or No',
    'Yes or No',
    'Yes or No',
    'Yes or No',
    'Optional notes',
    'Agent email (optional)'
  ];
  
  // Create example data
  const exampleData = [
    [
      'Solar Installation Project Alpha',
      'client1@example.com',
      'John',
      'Doe',
      '+27123456789',
      'ABC Solar Ltd',
      'Rooftop Installation',
      '123 Main Street, Johannesburg, 2000',
      500,
      'kWp',
      '2023/06/15',
      'Yes',
      'Yes',
      'Yes',
      'Yes',
      'Yes',
      'Commercial installation',
      'agent@example.com'
    ],
    [
      'Industrial Solar Farm Beta',
      'client2@example.com',
      'Jane',
      'Smith',
      '+27987654321',
      'Energy Solutions Inc',
      'Ground Mount Installation',
      '456 Industrial Park, Cape Town, 8000',
      2.5,
      'MWp',
      '2024/01/20',
      'Yes',
      'Yes',
      'Yes',
      'Yes',
      'Yes',
      'Large scale project',
      ''
    ],
    [
      'Residential Solar Project',
      'client3@example.com',
      'Bob',
      'Johnson',
      '',
      '',
      'Home Solar System',
      '789 Residential Ave, Durban, 4000',
      10,
      'kWp',
      '2023/09/10',
      'Yes',
      'Yes',
      'Yes',
      'Yes',
      'Yes',
      '',
      ''
    ]
  ];
  
  // Combine headers, descriptions, and examples
  const data = [
    headers,
    descriptions,
    ...exampleData
  ];
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 30 }, // proposal_title
    { wch: 25 }, // client_email
    { wch: 15 }, // client_first_name
    { wch: 15 }, // client_last_name
    { wch: 15 }, // client_phone
    { wch: 20 }, // client_company_name
    { wch: 25 }, // project_name
    { wch: 40 }, // project_address
    { wch: 12 }, // system_size
    { wch: 12 }, // system_size_unit
    { wch: 15 }, // commission_date
    { wch: 12 }, // in_south_africa
    { wch: 12 }, // not_registered
    { wch: 12 }, // under_15mwp
    { wch: 20 }, // commissioned_after_2022
    { wch: 15 }, // legal_ownership
    { wch: 30 }, // additional_notes
    { wch: 25 }  // assigned_agent_email
  ];
  
  // Style header row (bold, blue background)
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "4472C4" } },
    alignment: { horizontal: "center", vertical: "center" }
  };
  
  // Style description row (italic, gray text)
  const descStyle = {
    font: { italic: true, color: { rgb: "666666" } },
    alignment: { horizontal: "left", vertical: "center" }
  };
  
  // Apply styles to header row
  headers.forEach((_, idx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: idx });
    if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
    ws[cellRef].s = headerStyle;
  });
  
  // Apply styles to description row
  descriptions.forEach((_, idx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 1, c: idx });
    if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
    ws[cellRef].s = descStyle;
  });
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Proposals');
  
  // Generate file and trigger download
  XLSX.writeFile(wb, 'Bulk_Proposal_Template.xlsx');
}
