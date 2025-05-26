
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ClientData } from '@/hooks/useMyClients';

interface ExportButtonProps {
  clients: ClientData[];
}

export function ExportButton({ clients }: ExportButtonProps) {
  const exportToCSV = () => {
    if (clients.length === 0) return;

    // Define CSV headers including the new client stage
    const headers = [
      'Client Name',
      'Email',
      'Company',
      'Number of Projects',
      'Total MWp',
      'Status',
      'Stage',
      'Agent Name'
    ];

    // Convert clients data to CSV format
    const csvData = clients.map(client => [
      client.client_name,
      client.client_email,
      client.company_name || 'No Company',
      client.project_count.toString(),
      client.total_mwp.toFixed(3),
      client.is_registered ? 'Registered' : 'Contact',
      client.client_stage,
      client.agent_name
    ]);

    // Combine headers and data
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `clients-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button onClick={exportToCSV} variant="outline" className="gap-2">
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  );
}
