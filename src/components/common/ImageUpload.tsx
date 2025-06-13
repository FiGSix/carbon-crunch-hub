
import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFileUpload } from '@/hooks/useFileUpload';

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageUpdate: (imageUrl: string | null) => void;
  disabled?: boolean;
  bucket: string;
  placeholder?: React.ReactNode;
  uploadButtonText?: string;
  changeButtonText?: string;
  description?: string;
  className?: string;
  imageClassName?: string;
}

export function ImageUpload({
  currentImageUrl,
  onImageUpdate,
  disabled,
  bucket,
  placeholder,
  uploadButtonText = 'Upload Image',
  changeButtonText = 'Change Image',
  description,
  className = '',
  imageClassName = 'w-20 h-20 rounded-lg'
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);

  const { uploadFile, removeFile, uploading } = useFileUpload({
    bucket,
    onSuccess: (url) => {
      setPreview(url);
      onImageUpdate(url);
    }
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    await uploadFile(file);
  };

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return;

    const removed = await removeFile(currentImageUrl);
    if (removed) {
      setPreview(null);
      onImageUpdate(null);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-4">
        <div className="relative">
          {preview ? (
            <div className={`relative ${imageClassName} overflow-hidden border-2 border-gray-200`}>
              <img
                src={preview}
                alt="Uploaded image"
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <button
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ) : (
            <div className={`${imageClassName} border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50`}>
              {placeholder}
            </div>
          )}
        </div>

        <div className="flex-1">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id={`image-upload-${bucket}`}
            disabled={disabled || uploading}
          />
          <label htmlFor={`image-upload-${bucket}`}>
            <Button
              type="button"
              variant="outline"
              disabled={disabled || uploading}
              className="cursor-pointer"
              asChild
            >
              <span>
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : preview ? changeButtonText : uploadButtonText}
              </span>
            </Button>
          </label>
          {description && (
            <p className="text-sm text-gray-500 mt-1">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
