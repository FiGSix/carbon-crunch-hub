
import React from 'react';
import { Building2 } from 'lucide-react';
import { ImageUpload } from '@/components/common/ImageUpload';

interface CompanyLogoUploadProps {
  currentLogoUrl?: string | null;
  onLogoUpdate: (logoUrl: string | null) => void;
  disabled?: boolean;
}

export function CompanyLogoUpload({ 
  currentLogoUrl, 
  onLogoUpdate, 
  disabled 
}: CompanyLogoUploadProps) {
  return (
    <ImageUpload
      currentImageUrl={currentLogoUrl}
      onImageUpdate={onLogoUpdate}
      disabled={disabled}
      bucket="company-logos"
      placeholder={<Building2 className="h-8 w-8 text-gray-400" />}
      uploadButtonText="Upload Logo"
      changeButtonText="Change Logo"
      description="PNG, JPG up to 5MB. Recommended: 200x200px"
      imageClassName="w-20 h-20 rounded-lg"
    />
  );
}
