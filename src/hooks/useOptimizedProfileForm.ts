
import { useState, useEffect } from 'react';
import { useOptimizedData } from '@/hooks/useOptimizedData';
import { useFormValidation } from '@/hooks/useFormValidation';
import { UserProfile } from '@/contexts/auth/types';

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

export function useOptimizedProfileForm(userId?: string, userRole?: string) {
  const { profile, updateProfile, loading } = useOptimizedData({ 
    userId, 
    userRole 
  });
  const { validateRequired, validateEmail } = useFormValidation();
  const [formData, setFormData] = useState<ProfileFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync form data with profile
  useEffect(() => {
    if (profile) {
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
      return { success: false, error: validationError };
    }

    setIsSubmitting(true);

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
      
      const result = await updateProfile(updateData);
      return result;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    isLoading: loading,
    isSubmitting,
    handleInputChange,
    handleCompanyLogoChange,
    handleAvatarChange,
    handleSubmit,
    updateField
  };
}
