import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface UserForExport {
  email: string;
  first_name: string | null;
  last_name: string | null;
  source?: 'profile' | 'client_record';
}

interface ExportUsersButtonProps {
  users: UserForExport[];
}

export function ExportUsersButton({ users }: ExportUsersButtonProps) {
  const exportToCSV = () => {
    const usersWithEmail = users.filter(u => u.email);
    if (usersWithEmail.length === 0) return;

    const headers = ['First Name', 'Last Name', 'Email', 'Status'];
    const csvData = usersWithEmail.map(u => [
      u.first_name || '',
      u.last_name || '',
      u.email,
      u.source === 'client_record' ? 'Potential Client' : 'Signed Up',
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `users-newsletter-export-${new Date().toISOString().split('T')[0]}.csv`);
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
