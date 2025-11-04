
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

      console.log('Uploading to:', bucket, 'Path:', finalFileName);
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(finalFileName, file, { upsert: true });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw uploadError;
      }

      // For private buckets, generate a signed URL valid for 1 year
      const { data: urlData, error: urlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(finalFileName, 31536000); // 365 days in seconds

      if (urlError) {
        console.error('Signed URL generation error:', urlError);
        throw urlError;
      }

      const signedUrl = urlData.signedUrl;
      console.log('Upload successful, URL:', signedUrl);
      onSuccess?.(signedUrl, user.id);
      
      return signedUrl;
    } catch (error: any) {
      console.error('Upload error details:', error);
      const errorMessage = error.message || 'Upload failed';
      const isRLSError = errorMessage.includes('row-level security') || 
                         errorMessage.includes('policy') ||
                         error.code === 'PGRST116' ||
                         error.code === '42501';
      const isBucketError = errorMessage.includes('Bucket not found') || 
                           errorMessage.includes('bucket');
      
      toast({
        title: isRLSError ? "Permission Denied" : 
               isBucketError ? "Storage Not Configured" : 
               "Upload Failed",
        description: isRLSError 
          ? "Storage permissions need to be configured. The bucket exists but you don't have upload access."
          : isBucketError 
          ? "The storage bucket is not properly set up. Please ensure the migration has been applied."
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
