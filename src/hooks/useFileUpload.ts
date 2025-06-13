
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface UseFileUploadOptions {
  bucket: string;
  maxSizeInMB?: number;
  allowedTypes?: string[];
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
}

export function useFileUpload({
  bucket,
  maxSizeInMB = 5,
  allowedTypes = ['image/*'],
  onSuccess,
  onError
}: UseFileUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const uploadFile = async (file: File, fileName?: string) => {
    if (!file || !user) return null;

    // Validate file type
    if (!allowedTypes.some(type => file.type.match(type.replace('*', '.*')))) {
      const error = `Invalid file type. Please select: ${allowedTypes.join(', ')}`;
      toast({
        title: "Invalid file type",
        description: error,
        variant: "destructive",
      });
      onError?.(error);
      return null;
    }

    // Validate file size
    if (file.size > maxSizeInMB * 1024 * 1024) {
      const error = `File too large. Please select a file smaller than ${maxSizeInMB}MB`;
      toast({
        title: "File too large",
        description: error,
        variant: "destructive",
      });
      onError?.(error);
      return null;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const finalFileName = fileName || `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(finalFileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(finalFileName);

      const publicUrl = data.publicUrl;
      onSuccess?.(publicUrl);
      
      return publicUrl;
    } catch (error: any) {
      const errorMessage = error.message || 'Upload failed';
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
      onError?.(errorMessage);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async (fileUrl: string) => {
    if (!fileUrl || !user) return false;

    try {
      const fileName = fileUrl.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from(bucket)
          .remove([`${user.id}/${fileName}`]);
      }
      return true;
    } catch (error) {
      console.error(`Error removing file from ${bucket}:`, error);
      return false;
    }
  };

  return {
    uploadFile,
    removeFile,
    uploading
  };
}
