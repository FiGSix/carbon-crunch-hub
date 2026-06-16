import { useState } from "react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Trash2, Loader2, Download } from "lucide-react";
import type { OnboardingDocument } from "@/types/onboarding";

interface OnboardingFileUploadProps {
  projectId: string;
  category: 'coc' | 'invoice' | 'calibration_cert' | 'om_agreement' | 'meter_cert' | 'other';
  documents: OnboardingDocument[];
  onUploadComplete: () => void;
  label?: string;
  required?: boolean;
}

export function OnboardingFileUpload({
  projectId,
  category,
  documents,
  onUploadComplete,
  label,
  required = false
}: OnboardingFileUploadProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const { uploadFile, uploading } = useFileUpload({
    bucket: 'onboarding-documents',
    maxSizeInMB: 10,
    allowedTypes: ['application/pdf', 'image/*'],
    folderPrefix: projectId, // Use project-first folder structure
    onSuccess: async (url, userId) => {
      // Validate userId is present
      if (!userId) {
        toast({
          title: "Error",
          description: "Authentication error: User ID not available",
          variant: "destructive",
        });
        return;
      }

      // Insert document record
      const { error } = await supabase
        .from('onboarding_documents')
        .insert({
          project_id: projectId,
          category,
          file_name: url.split('/').pop() || 'document',
          file_url: url,
          uploaded_by: userId,
        });

      if (error) {
        console.error('Database insert error:', error);
        const isRLSError = error.message?.includes('row-level security') || error.message?.includes('policy');
        toast({
          title: isRLSError ? "Database insert failed - Permission denied" : "Error",
          description: isRLSError
            ? "Failed to save document record due to permissions. Please contact support."
            : `Failed to save document record${error.code ? ` (${error.code})` : ''}: ${error.message}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Document uploaded successfully",
        });
        onUploadComplete();
      }
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error,
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleDelete = async (doc: OnboardingDocument) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    setIsDeleting(doc.id);
    try {
      const { error } = await supabase
        .from('onboarding_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
      onUploadComplete();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const categoryDocs = documents.filter(d => d.category === category);

  return (
    <div className="space-y-3">
      {label && (
        <div className="text-sm font-medium">
          {label} {required && <span className="text-destructive">*</span>}
        </div>
      )}

      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center gap-3 text-center max-w-sm mx-auto">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">
                Drag and drop your file here, or
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById(`file-${category}`)?.click()}
                disabled={uploading}
                className="mt-2"
              >
                Browse to Upload
              </Button>
              <input
                id={`file-${category}`}
                type="file"
                className="hidden"
                accept=".pdf,image/*"
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </div>
            {uploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Documents List */}
      {categoryDocs.length > 0 && (
        <div className="space-y-2">
          {categoryDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    v{doc.version} • {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      // Extract the file path from the URL
                      const urlParts = doc.file_url.split('/onboarding-documents/');
                      if (urlParts.length < 2) {
                        throw new Error('Invalid file URL');
                      }
                      const filePath = urlParts[1].split('?')[0]; // Remove query params
                      
                      // Download using Supabase storage API (includes auth automatically)
                      const { data, error } = await supabase.storage
                        .from('onboarding-documents')
                        .download(filePath);
                      
                      if (error) throw error;
                      
                      // Create blob URL and trigger download
                      const blobUrl = URL.createObjectURL(data);
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      link.download = doc.file_name;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(blobUrl);
                      
                      toast({
                        title: "Success",
                        description: "Document downloaded successfully",
                      });
                    } catch (error) {
                      console.error('Download error:', error);
                      toast({
                        title: "Download Failed",
                        description: "Could not download the document",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc)}
                  disabled={isDeleting === doc.id}
                >
                  {isDeleting === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
