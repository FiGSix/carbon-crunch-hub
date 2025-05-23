
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { updateProfile } from '@/lib/supabase/profile';
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

export function useProfileForm(profile: UserProfile | null, refreshUser: () => Promise<void>) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    companyLogoUrl: '',
    avatarUrl: ''
  });

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCompanyLogoChange = (logoUrl: string | null) => {
    setFormData(prev => ({ ...prev, companyLogoUrl: logoUrl || '' }));
  };

  const handleAvatarChange = (avatarUrl: string | null) => {
    setFormData(prev => ({ ...prev, avatarUrl: avatarUrl || '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    handleSubmit
  };
}
