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
    onSuccess: async (url) => {
      // Insert document record
      const { error } = await supabase
        .from('onboarding_documents')
        .insert({
          project_id: projectId,
          category,
          file_name: url.split('/').pop() || 'document',
          file_url: url,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id || '',
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to save document record",
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
                  onClick={() => window.open(doc.file_url, '_blank')}
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
