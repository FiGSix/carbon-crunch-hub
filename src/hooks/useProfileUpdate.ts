
import { useState } from 'react';
import { updateProfile } from '@/lib/supabase/profile';
import { useAuth } from '@/contexts/auth';
import { useToast } from './use-toast';

export function useProfileUpdate() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  
  const updateUserProfile = async (data: {
    first_name?: string;
    last_name?: string;
    company_name?: string;
    email?: string;
    phone?: string;
  }) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await updateProfile(data);
      
      if (error) {
        throw error;
      }
      
      // Refresh user data to get updated profile
      await refreshUser();
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      
      return { success: true, error: null };
    } catch (error) {
      console.error("Error updating profile:", error);
      
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    updateUserProfile,
    isSubmitting
  };
}
