

import { Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/common/FormField';

interface CompanyInformationCardProps {
  companyName: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
}

export function CompanyInformationCard({
  companyName,
  onInputChange,
  isLoading
}: CompanyInformationCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Company Information
        </CardTitle>
        <CardDescription>
          Manage your company details and branding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          id="companyName"
          name="companyName"
          label="Company Name"
          value={companyName}
          onChange={onInputChange}
          disabled={isLoading}
          placeholder="Your company name"
        />
      </CardContent>
    </Card>
  );
}
