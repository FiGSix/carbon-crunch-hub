import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { validateLegacyProjectRows, ValidationError } from "@/utils/excel/legacyProjectValidator";
import { LegacyProjectRow, LegacyProjectUploadResult } from "@/types/legacyProject";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";

interface BulkLegacyProjectUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkLegacyProjectUpload({ open, onOpenChange, onSuccess }: BulkLegacyProjectUploadProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<LegacyProjectRow[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [uploadResult, setUploadResult] = useState<LegacyProjectUploadResult | null>(null);

  const handleDownloadTemplate = async () => {
    const { generateLegacyProjectTemplate } = await import("@/utils/excel/legacyProjectTemplateGenerator");
    generateLegacyProjectTemplate();
    toast({
      title: "Template Downloaded",
      description: "Fill in the template with your legacy project data and upload it.",
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an Excel (.xlsx) file.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setUploadResult(null);

    try {
      const { parseLegacyProjectFile } = await import("@/utils/excel/legacyProjectParser");
      const rows = await parseLegacyProjectFile(selectedFile);
      const errors = validateLegacyProjectRows(rows);
      
      setValidationErrors(errors);
      setTotalRows(rows.length);
      setPreview(rows.slice(0, 5));
      
      toast({
        title: "File Parsed Successfully",
        description: `Found ${rows.length} projects. ${errors.length > 0 ? `${errors.length} validation errors found.` : 'Ready to upload.'}`,
      });
    } catch (error) {
      toast({
        title: "Parse Error",
        description: error instanceof Error ? error.message : "Failed to parse Excel file.",
        variant: "destructive",
      });
      setFile(null);
      setTotalRows(0);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);
    
    try {
      const { parseLegacyProjectFile } = await import("@/utils/excel/legacyProjectParser");
      const rows = await parseLegacyProjectFile(file);
      
      const { data, error } = await supabase.functions.invoke('bulk-upload-legacy-projects', {
        body: { projects: rows }
      });

      if (error) throw error;

      const result = data as LegacyProjectUploadResult;
      setUploadResult(result);

      if (result.success && result.successCount > 0) {
        toast({
          title: "Upload Complete",
          description: `Successfully created ${result.successCount} projects. ${result.failureCount > 0 ? `${result.failureCount} failed.` : ''}`,
        });
        
        if (result.successCount === result.totalRows) {
          onSuccess();
          onOpenChange(false);
        }
      } else {
        toast({
          title: "Upload Failed",
          description: "No projects were created. Check error details below.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "Failed to upload projects.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Legacy Projects</DialogTitle>
          <DialogDescription>
            Upload legacy projects with existing signed agreements into the Project Onboarding system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Download Template Section */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Step 1: Download Template</h3>
                <p className="text-sm text-muted-foreground">Get the Excel template for legacy project data</p>
              </div>
            </div>
            <Button onClick={handleDownloadTemplate} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* Upload Section */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3 mb-4">
              <Upload className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Step 2: Upload Filled Template</h3>
                <p className="text-sm text-muted-foreground">Select your completed Excel file</p>
              </div>
            </div>
            
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileSelect}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="border border-destructive/50 rounded-lg p-4 bg-destructive/10">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <h3 className="font-semibold text-destructive">Validation Errors ({validationErrors.length})</h3>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {validationErrors.slice(0, 10).map((error, idx) => (
                  <p key={idx} className="text-sm text-muted-foreground">
                    Row {error.row}, {error.field}: {error.message}
                  </p>
                ))}
                {validationErrors.length > 10 && (
                  <p className="text-sm text-muted-foreground italic">
                    ...and {validationErrors.length - 10} more errors
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Preview Section */}
          {preview.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Preview (First 5 Projects)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Project Title</th>
                      <th className="text-left p-2">Client Email</th>
                      <th className="text-left p-2">System Size</th>
                      <th className="text-left p-2">Signed Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">{row.project_title}</td>
                        <td className="p-2">{row.client_email}</td>
                        <td className="p-2">{row.system_size_kwp} kWp</td>
                        <td className="p-2">{row.signed_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className={`border rounded-lg p-4 ${uploadResult.successCount > 0 ? 'bg-green-50 border-green-200' : 'bg-destructive/10 border-destructive/50'}`}>
              <div className="flex items-center gap-2 mb-3">
                {uploadResult.successCount > 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
                <h3 className="font-semibold">Upload Results</h3>
              </div>
              <div className="space-y-2 text-sm">
                <p>Total Rows: {uploadResult.totalRows}</p>
                <p className="text-green-600">✓ Successful: {uploadResult.successCount}</p>
                {uploadResult.failureCount > 0 && (
                  <>
                    <p className="text-destructive">✗ Failed: {uploadResult.failureCount}</p>
                    <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                      {uploadResult.errors.map((error, idx) => (
                        <p key={idx} className="text-muted-foreground">
                          Row {error.row}: {error.error}
                        </p>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading || validationErrors.length > 0}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {totalRows} Projects
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
