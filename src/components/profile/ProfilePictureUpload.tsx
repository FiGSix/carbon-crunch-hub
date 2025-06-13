
import React from 'react';
import { Image } from 'lucide-react';
import { ImageUpload } from '@/components/common/ImageUpload';

interface ProfilePictureUploadProps {
  currentAvatarUrl?: string | null;
  onAvatarUpdate: (avatarUrl: string | null) => void;
  disabled?: boolean;
}

export function ProfilePictureUpload({ 
  currentAvatarUrl, 
  onAvatarUpdate, 
  disabled 
}: ProfilePictureUploadProps) {
  return (
    <ImageUpload
      currentImageUrl={currentAvatarUrl}
      onImageUpdate={onAvatarUpdate}
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
