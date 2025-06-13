
import { useState, useEffect } from 'react';
import { UnifiedDataService } from '@/services/unified/UnifiedDataService';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/contexts/auth/types';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  companyLogoUrl: string;
  avatarUrl: string;
}

export function useOptimizedProfileForm(userId?: string, userRole?: UserRole) {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    companyLogoUrl: '',
    avatarUrl: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Load profile data
  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const profile = await UnifiedDataService.getProfile(userId);
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
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCompanyLogoChange = (logoUrl: string | null) => {
    setFormData(prev => ({ ...prev, companyLogoUrl: logoUrl || '' }));
  };

  const handleAvatarChange = (avatarUrl: string | null) => {
    setFormData(prev => ({ ...prev, avatarUrl: avatarUrl || '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return { success: false };

    setIsSubmitting(true);
    try {
      const updates = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        company_name: formData.companyName,
        company_logo_url: formData.companyLogoUrl,
        avatar_url: formData.avatarUrl
      };

      const result = await UnifiedDataService.updateProfile(userId, updates);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Profile updated successfully'
        });
        return { success: true };
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive'
      });
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    isLoading,
    isSubmitting,
    handleInputChange,
    handleCompanyLogoChange,
    handleAvatarChange,
    handleSubmit
  };
}
