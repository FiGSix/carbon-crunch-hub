
import * as XLSX from 'xlsx';

/**
 * Generate and download an Excel template for lead imports
 */
export function downloadLeadTemplate(): void {
  // Define headers
  const headers = [
    'company_name',
    'contact_name', 
    'email',
    'phone',
    'website',
    'location',
    'source',
    'notes'
  ];
  
  // Define description row
  const descriptions = [
    'Company name (REQUIRED)',
    'Primary contact person',
    'Contact email address',
    'Phone number',
    'Company website URL',
    'City, Province (e.g., Cape Town, Western Cape)',
    'How lead was found',
    'Additional notes or research info'
  ];
  
  // Sample data rows
  const sampleData = [
    [
      'SolarTech Installations',
      'John Smith',
      'john@solartech.co.za',
      '+27 21 555 1234',
      'https://solartech.co.za',
      'Cape Town, Western Cape',
      'ChatGPT Research',
      'Top 10 installer in Western Cape, specializes in commercial'
    ],
    [
      'Gauteng Solar Works',
      'Sarah Jones',
      'sarah@gautengsolar.co.za',
      '+27 11 555 5678',
      'https://gautengsolar.co.za',
      'Johannesburg, Gauteng',
      'ChatGPT Research',
      'Focus on residential installations, expanding to commercial'
    ],
    [
      'KZN Green Energy',
      'Mike Wilson',
      'mike@kzngreen.co.za',
      '+27 31 555 9012',
      'https://kzngreen.co.za',
      'Durban, KwaZulu-Natal',
      'Industry Event',
      'Met at Solar Africa conference, interested in partnership'
    ]
  ];
  
  // Combine all data
  const data = [headers, descriptions, ...sampleData];
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 25 }, // company_name
    { wch: 20 }, // contact_name
    { wch: 30 }, // email
    { wch: 18 }, // phone
    { wch: 30 }, // website
    { wch: 30 }, // location
    { wch: 20 }, // source
    { wch: 50 }, // notes
  ];
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
  
  // Download file
  XLSX.writeFile(workbook, 'lead_import_template.xlsx');
}
