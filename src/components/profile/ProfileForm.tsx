
import React from 'react';
import { Button } from '@/components/ui/button';
import { PersonalInformationCard } from './PersonalInformationCard';
import { CompanyInformationCard } from './CompanyInformationCard';
import { useProfileForm } from '@/hooks/useProfileForm';
import { UserProfile } from '@/contexts/auth/types';

interface ProfileFormProps {
  profile: UserProfile | null;
  refreshUser: () => Promise<void>;
  isAgent: boolean;
}

export function ProfileForm({ profile, refreshUser, isAgent }: ProfileFormProps) {
  const {
    formData,
    isLoading,
    handleInputChange,
    handleCompanyLogoChange,
    handleAvatarChange,
    handleSubmit
  } = useProfileForm(profile, refreshUser);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <PersonalInformationCard
        firstName={formData.firstName}
        lastName={formData.lastName}
        email={formData.email}
        phone={formData.phone}
        avatarUrl={formData.avatarUrl}
        onInputChange={handleInputChange}
        onAvatarChange={handleAvatarChange}
        isLoading={isLoading}
      />

      {/* Company Information - Show for Agents */}
      {isAgent && (
        <CompanyInformationCard
          companyName={formData.companyName}
          companyLogoUrl={formData.companyLogoUrl}
          onInputChange={handleInputChange}
          onLogoChange={handleCompanyLogoChange}
          isLoading={isLoading}
        />
      )}

      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isLoading}
          className="min-w-[120px]"
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
