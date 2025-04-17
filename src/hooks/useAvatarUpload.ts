
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from '@/contexts/auth';

export function useAvatarUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  // Function to fetch the avatar URL
  const fetchAvatarUrl = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .storage
        .from('avatars')
        .download(`${userId}/avatar`);
        
      if (error) {
        if (error.message.includes('Object not found')) {
          // Not an error, just no avatar yet
          return null;
        }
        throw error;
      }
      
      const url = URL.createObjectURL(data);
      setAvatarUrl(url);
      return url;
    } catch (error) {
      console.error('Error downloading avatar:', error);
      return null;
    }
  };

  // Function to upload a new avatar
  const uploadAvatar = async (file: File) => {
    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to upload an avatar",
        variant: "destructive",
      });
      return null;
    }
    
    setIsUploading(true);
    
    try {
      // Make sure file is an image
      if (!file.type.match(/image\/(jpeg|jpg|png|gif)/)) {
        throw new Error('File must be an image (JPEG, PNG, or GIF)');
      }
      
      // Check file size - max 2MB
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('File size must be less than 2MB');
      }
      
      // Upload the file
      const { error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(`${user.id}/avatar`, file, {
          upsert: true,
          contentType: file.type,
        });
        
      if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL for the uploaded file
      const { data: urlData } = await supabase
        .storage
        .from('avatars')
        .getPublicUrl(`${user.id}/avatar`);
        
      if (urlData?.publicUrl) {
        // Add a timestamp to prevent browser caching
        const cachedUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;
        setAvatarUrl(cachedUrl);
        
        // Refresh user profile to update avatar
        await refreshUser();
        
        toast({
          title: "Avatar updated",
          description: "Your profile picture has been updated",
        });
        
        return cachedUrl;
      }
      
      return null;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload avatar",
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    avatarUrl,
    setAvatarUrl,
    uploadAvatar,
    fetchAvatarUrl,
    isUploading
  };
}
