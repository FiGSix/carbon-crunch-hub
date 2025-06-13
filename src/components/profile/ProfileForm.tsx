
import React from 'react';
import { Button } from '@/components/ui/button';
import { PersonalInformationCard } from './PersonalInformationCard';
import { CompanyInformationCard } from './CompanyInformationCard';
import { useOptimizedProfileForm } from '@/hooks/useOptimizedProfileForm';
import { useAuth } from '@/contexts/auth';

interface ProfileFormProps {
  profile: any; // Keep for compatibility but not used
  refreshUser: () => Promise<void>; // Keep for compatibility but not used
  isAgent: boolean;
}

export function ProfileForm({ isAgent }: ProfileFormProps) {
  const { user, userRole } = useAuth();
  const {
    formData,
    isLoading,
    isSubmitting,
    handleInputChange,
    handleCompanyLogoChange,
    handleAvatarChange,
    handleSubmit
  } = useOptimizedProfileForm(user?.id, userRole);

  const onSubmit = async (e: React.FormEvent) => {
    const result = await handleSubmit(e);
    // Additional success handling could go here if needed
  };

  // Create proper input handlers that match the expected signature
  const handlePersonalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    handleInputChange(name as keyof typeof formData, value);
  };

  const handleCompanyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    handleInputChange(name as keyof typeof formData, value);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Personal Information */}
      <PersonalInformationCard
        firstName={formData.firstName}
        lastName={formData.lastName}
        email={formData.email}
        phone={formData.phone}
        avatarUrl={formData.avatarUrl}
        onInputChange={handlePersonalInputChange}
        onAvatarChange={handleAvatarChange}
        isLoading={isLoading || isSubmitting}
      />

      {/* Company Information - Show for Agents */}
      {isAgent && (
        <CompanyInformationCard
          companyName={formData.companyName}
          companyLogoUrl={formData.companyLogoUrl}
          onInputChange={handleCompanyInputChange}
          onLogoChange={handleCompanyLogoChange}
          isLoading={isLoading || isSubmitting}
        />
      )}

      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isLoading || isSubmitting}
          className="min-w-[120px]"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
