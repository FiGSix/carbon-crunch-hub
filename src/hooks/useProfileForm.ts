
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { updateProfile } from '@/lib/supabase/profile';
import { UserProfile } from '@/contexts/auth/types';
import { useFormValidation } from '@/hooks/useFormValidation';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  companyLogoUrl: string;
  avatarUrl: string;
}

const initialFormData: ProfileFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  companyName: '',
  companyLogoUrl: '',
  avatarUrl: ''
};

export function useProfileForm(profile: UserProfile | null, refreshUser: () => Promise<void>) {
  const { toast } = useToast();
  const { validateRequired, validateEmail } = useFormValidation();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>(initialFormData);

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      console.log('Populating form with profile data:', profile);
      setFormData({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        companyName: profile.company_name || '',
        companyLogoUrl: profile.company_logo_url || '',
        avatarUrl: profile.avatar_url || ''
      });
    }
  }, [profile]);

  const updateField = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateField(name as keyof ProfileFormData, value);
  };

  const handleCompanyLogoChange = (logoUrl: string | null) => {
    updateField('companyLogoUrl', logoUrl || '');
  };

  const handleAvatarChange = (avatarUrl: string | null) => {
    updateField('avatarUrl', avatarUrl || '');
  };

  const validateForm = (): string | null => {
    const firstNameError = validateRequired(formData.firstName, 'First name');
    if (firstNameError) return firstNameError;
    
    const lastNameError = validateRequired(formData.lastName, 'Last name');
    if (lastNameError) return lastNameError;
    
    const emailError = validateEmail(formData.email);
    if (emailError) return emailError;
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    console.log('Submitting profile update with data:', formData);

    try {
      const updateData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        company_name: formData.companyName || null,
        company_logo_url: formData.companyLogoUrl || null,
        avatar_url: formData.avatarUrl || null,
      };
      
      console.log('Sending update request:', updateData);
      const { error } = await updateProfile(updateData);

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }

      console.log('Profile update successful, refreshing user data');
      await refreshUser();
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error: any) {
      console.error('Profile update failed:', error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    formData,
    isLoading,
    handleInputChange,
    handleCompanyLogoChange,
    handleAvatarChange,
    handleSubmit,
    updateField
  };
}
