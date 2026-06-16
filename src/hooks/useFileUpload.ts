
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

    // Pre-upload diagnostics
    console.log('Upload diagnostics:', {
      bucket,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      userId: user.id,
      folderPrefix
    });

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

    // Force session refresh to ensure fresh token
    console.log('Refreshing session before upload...');
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.error('Session refresh failed:', refreshError);
      // Continue with existing session if refresh fails
    } else if (refreshData.session) {
      console.log('Session refreshed successfully, token expires:', refreshData.session.expires_at);
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

      console.log('Uploading to:', bucket, 'Path:', finalFileName, 'File size:', file.size, 'File type:', file.type);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(finalFileName, file, { upsert: true });

      if (uploadError) {
        console.error('Supabase upload error (full object):', JSON.stringify(uploadError, null, 2));
        console.error('Upload error details:', {
          message: uploadError.message,
          name: uploadError.name,
          statusCode: (uploadError as any).statusCode,
          error: (uploadError as any).error,
          cause: (uploadError as any).cause
        });
        throw uploadError;
      }
      
      console.log('Upload successful, data:', uploadData);

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
      console.error('Upload error (full):', JSON.stringify(error, null, 2));
      console.error('Upload error details:', {
        message: error.message,
        name: error.name,
        statusCode: error.statusCode,
        code: error.code,
        error: error.error,
        cause: error.cause,
        stack: error.stack
      });
      
      const errorMessage = error.message || 'Upload failed';
      const statusCode = error.statusCode || (error as any).status;
      const isRLSError = errorMessage.includes('row-level security') || 
                         errorMessage.includes('policy') ||
                         error.code === 'PGRST116' ||
                         error.code === '42501';
      const isBucketError = errorMessage.includes('Bucket not found') || 
                           errorMessage.includes('bucket');
      const is400Error = statusCode === 400;
      
      let title = "Upload Failed";
      let description = errorMessage;
      
      if (isRLSError) {
        title = "Permission Denied";
        description = "Storage permissions need to be configured. The bucket exists but you don't have upload access.";
      } else if (isBucketError) {
        title = "Storage Not Configured";
        description = "The storage bucket is not properly set up. Please ensure the migration has been applied.";
      } else if (is400Error) {
        title = "Upload Request Failed";
        description = `Bad request (400): ${errorMessage}. Try refreshing the page and uploading again.`;
      }
      
      toast({
        title,
        description,
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
