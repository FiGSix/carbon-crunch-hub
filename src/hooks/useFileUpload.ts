
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface UseFileUploadOptions {
  bucket: string;
  maxSizeInMB?: number;
  allowedTypes?: string[];
  folderPrefix?: string; // e.g., projectId for project-scoped uploads
  onSuccess?: (url: string, userId: string) => void;
  onError?: (error: string) => void;
}

export function useFileUpload({
  bucket,
  maxSizeInMB = 5,
  allowedTypes = ['image/*'],
  folderPrefix,
  onSuccess,
  onError
}: UseFileUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const uploadFile = async (file: File, fileName?: string) => {
    if (!file || !user) return null;

    // Preflight auth check to prevent anonymous uploads
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      const error = 'You are not authenticated. Please sign in and try again.';
      toast({
        title: "Authentication Required",
        description: error,
        variant: "destructive",
      });
      onError?.(error);
      return null;
    }

    // Validate file type
    const fileTypeOk = allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      // Turn image/* into image/.* and match against file.type
      const pattern = type.replace('*', '.*');
      return new RegExp(`^${pattern}$`, 'i').test(file.type);
    });
    if (!fileTypeOk) {
      const error = `Invalid file type (${file.type}). Allowed: ${allowedTypes.join(', ')}`;
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
      // Use project-first folder structure if folderPrefix provided
      const finalFileName = fileName || (
        folderPrefix 
          ? `${folderPrefix}/${user.id}/${Date.now()}.${fileExt}`
          : `${user.id}/${Date.now()}.${fileExt}`
      );

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(finalFileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(finalFileName);

      const publicUrl = data.publicUrl;
      onSuccess?.(publicUrl, user.id);
      
      return publicUrl;
    } catch (error: any) {
      const errorMessage = error.message || 'Upload failed';
      const isRLSError = errorMessage.includes('row-level security') || errorMessage.includes('policy');
      toast({
        title: isRLSError ? "Storage upload failed - Permission denied" : "Upload failed",
        description: isRLSError 
          ? "You don't have permission to upload to this location. Please contact support."
          : errorMessage,
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
