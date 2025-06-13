
import React from 'react';
import { Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CompanyLogoUpload } from '@/components/profile/CompanyLogoUpload';
import { CompanyLogo } from '@/components/profile/CompanyLogo';
import { FormField } from '@/components/common/FormField';

interface CompanyInformationCardProps {
  companyName: string;
  companyLogoUrl: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogoChange: (logoUrl: string | null) => void;
  isLoading: boolean;
}

export function CompanyInformationCard({
  companyName,
  companyLogoUrl,
  onInputChange,
  onLogoChange,
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
        
        <div>
          <Label>Company Logo</Label>
          <div className="mt-2">
            <CompanyLogoUpload
              currentLogoUrl={companyLogoUrl}
              onLogoUpdate={onLogoChange}
              disabled={isLoading}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Your company logo will appear on proposals and other documents
          </p>
        </div>

        {companyLogoUrl && (
          <div>
            <Label>Logo Preview</Label>
            <div className="mt-2 flex items-center gap-4">
              <CompanyLogo 
                logoUrl={companyLogoUrl}
                companyName={companyName}
                size="lg"
              />
              <div>
                <p className="font-medium">{companyName || 'Your Company'}</p>
                <p className="text-sm text-gray-500">How it will appear on proposals</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
