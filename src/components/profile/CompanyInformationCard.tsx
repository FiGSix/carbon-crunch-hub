import { Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/common/FormField';
import { CompanyLogoUpload } from './CompanyLogoUpload';
import { Label } from '@/components/ui/label';

interface CompanyInformationCardProps {
  companyName: string;
  companyLogoUrl?: string | null;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogoChange?: (url: string | null) => void;
  isLoading: boolean;
}

export function CompanyInformationCard({
  companyName,
  companyLogoUrl,
  onInputChange,
  onLogoChange,
  isLoading,
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
      <CardContent className="space-y-6">
        {onLogoChange && (
          <div className="space-y-2">
            <Label>Company Logo</Label>
            <CompanyLogoUpload
              currentLogoUrl={companyLogoUrl}
              onLogoUpdate={onLogoChange}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              PNG, JPG or SVG up to 5 MB. Shown on your referral page.
            </p>
          </div>
        )}
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
