
import React, { useState } from 'react';
import { upload, image, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface ProfilePictureUploadProps {
  currentAvatarUrl?: string | null;
  onAvatarUpdate: (avatarUrl: string | null) => void;
  disabled?: boolean;
}

export function ProfilePictureUpload({ currentAvatarUrl, onAvatarUpdate, disabled }: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl || null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Delete existing avatar if present
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = data.publicUrl;
      setPreview(avatarUrl);
      onAvatarUpdate(avatarUrl);

      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!currentAvatarUrl || !user) return;

    try {
      const fileName = currentAvatarUrl.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('avatars')
          .remove([`${user.id}/${fileName}`]);
      }

      setPreview(null);
      onAvatarUpdate(null);

      toast({
        title: "Profile picture removed",
        description: "Your profile picture has been removed",
      });
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast({
        title: "Failed to remove picture",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative">
          {preview ? (
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
              <img
                src={preview}
                alt="Profile picture"
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <button
                  onClick={handleRemoveAvatar}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
              <image className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="profile-picture-upload"
            disabled={disabled || uploading}
          />
          <label htmlFor="profile-picture-upload">
            <Button
              type="button"
              variant="outline"
              disabled={disabled || uploading}
              className="cursor-pointer"
              asChild
            >
              <span>
                <upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : preview ? 'Change Picture' : 'Upload Picture'}
              </span>
            </Button>
          </label>
          <p className="text-sm text-gray-500 mt-1">
            PNG, JPG up to 5MB. Recommended: 200x200px
          </p>
        </div>
      </div>
    </div>
  );
}
