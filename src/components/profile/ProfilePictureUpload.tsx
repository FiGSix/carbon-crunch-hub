
import { Image } from 'lucide-react';
import { ImageUpload } from '@/components/common/ImageUpload';
import { ProfileDataService } from '@/services/unified/profile/ProfileDataService';
import { toast } from 'sonner';

interface ProfilePictureUploadProps {
  currentAvatarUrl?: string | null;
  onAvatarUpdate: (avatarUrl: string | null) => void;
  disabled?: boolean;
  userId?: string;
  autoSave?: boolean;
}

export function ProfilePictureUpload({ 
  currentAvatarUrl, 
  onAvatarUpdate, 
  disabled,
  userId,
  autoSave = true
}: ProfilePictureUploadProps) {
  const handleAvatarUpdate = async (avatarUrl: string | null) => {
    // Always call the callback to update local state
    onAvatarUpdate(avatarUrl);
    
    // Auto-save to database if enabled and userId is provided
    if (autoSave && userId && avatarUrl) {
      const result = await ProfileDataService.updateProfile(userId, { 
        avatar_url: avatarUrl 
      });
      
      if (result.success) {
        toast.success('Profile picture updated successfully');
      } else {
        toast.error('Failed to save profile picture');
      }
    }
  };

  return (
    <ImageUpload
      currentImageUrl={currentAvatarUrl}
      onImageUpdate={handleAvatarUpdate}
      disabled={disabled}
      bucket="avatars"
      placeholder={<Image className="h-8 w-8 text-gray-400" />}
      uploadButtonText="Upload Picture"
      changeButtonText="Change Picture"
      description="PNG, JPG up to 5MB. Recommended: 200x200px"
      imageClassName="w-20 h-20 rounded-full"
    />
  );
}
