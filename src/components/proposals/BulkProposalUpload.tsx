import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { validateProposalRows, ValidationError } from "@/utils/excel/excelValidator";
import { BulkProposalRow, BulkUploadResult } from "@/types/proposals";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { Progress } from "@/components/ui/progress";

interface BulkProposalUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const BATCH_SIZE = 50;

// Helper function to chunk array into batches
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

interface BatchProgress {
  currentBatch: number;
  totalBatches: number;
  processedCount: number;
  successCount: number;
  failureCount: number;
  skippedDuplicates: number;
}

export function BulkProposalUpload({ open, onOpenChange, onSuccess }: BulkProposalUploadProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<BulkProposalRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);

  const handleDownloadTemplate = async () => {
    // Dynamically import xlsx only when needed to reduce initial bundle size
    const { generateProposalTemplate } = await import("@/utils/excel/excelTemplateGenerator");
    generateProposalTemplate();
    toast({
      title: "Template Downloaded",
      description: "Fill in the template and upload it to create proposals in bulk.",
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.endsWith('.xlsx')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an Excel (.xlsx) file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB limit for larger files)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setUploadResult(null);
    setTotalRows(0);
    setBatchProgress(null);

    try {
      // Dynamically import xlsx parser only when needed to reduce initial bundle size
      const { parseExcelFile } = await import("@/utils/excel/excelParser");
      
      // Parse the file
      const rows = await parseExcelFile(selectedFile);
      
      // Store total row count
      setTotalRows(rows.length);
      
      // Validate rows
      const errors = validateProposalRows(rows);
      setValidationErrors(errors);
      
      // Show preview (first 5 rows)
      setPreview(rows.slice(0, 5));
      
      const batchCount = Math.ceil(rows.length / BATCH_SIZE);
      toast({
        title: "File Parsed Successfully",
        description: `Found ${rows.length} proposals (${batchCount} batch${batchCount > 1 ? 'es' : ''}). ${errors.length > 0 ? `${errors.length} validation errors found.` : 'Ready to upload.'}`,
      });
    } catch (error) {
      toast({
        title: "Parse Error",
        description: error instanceof Error ? error.message : "Failed to parse Excel file.",
        variant: "destructive",
      });
      setFile(null);
    }
  };

  const processBatches = async (allRows: BulkProposalRow[]): Promise<BulkUploadResult> => {
    const batches = chunkArray(allRows, BATCH_SIZE);
    const totalBatches = batches.length;
    
    const aggregatedResult: BulkUploadResult & { skippedDuplicates: number } = {
      success: true,
      totalRows: allRows.length,
      successCount: 0,
      failureCount: 0,
      skippedDuplicates: 0,
      errors: [],
      createdProposalIds: []
    };

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNumber = i + 1;
      
      // Update progress state
      setBatchProgress({
        currentBatch: batchNumber,
        totalBatches,
        processedCount: i * BATCH_SIZE,
        successCount: aggregatedResult.successCount,
        failureCount: aggregatedResult.failureCount,
        skippedDuplicates: aggregatedResult.skippedDuplicates
      });

      try {
        const { data, error } = await supabase.functions.invoke('bulk-upload-proposals', {
          body: { proposals: batch }
        });

        if (error) {
          // If the batch fails entirely, mark all rows in batch as failed
          aggregatedResult.failureCount += batch.length;
          aggregatedResult.errors.push({
            row: (i * BATCH_SIZE) + 1,
            data: {},
            error: `Batch ${batchNumber} failed: ${error.message}`
          });
          console.error(`Batch ${batchNumber} error:`, error);
        } else if (data) {
          const batchResult = data as BulkUploadResult & { skippedDuplicates?: number };
          aggregatedResult.successCount += batchResult.successCount;
          aggregatedResult.failureCount += batchResult.failureCount;
          aggregatedResult.skippedDuplicates += batchResult.skippedDuplicates || 0;
          aggregatedResult.createdProposalIds.push(...(batchResult.createdProposalIds || []));
          
          // Adjust row numbers in errors to reflect actual row position
          const adjustedErrors = batchResult.errors.map(err => ({
            ...err,
            row: err.row + (i * BATCH_SIZE)
          }));
          aggregatedResult.errors.push(...adjustedErrors);
        }
      } catch (err) {
        // Network or other error - mark batch as failed
        aggregatedResult.failureCount += batch.length;
        aggregatedResult.errors.push({
          row: (i * BATCH_SIZE) + 1,
          data: {},
          error: `Batch ${batchNumber} failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        });
        console.error(`Batch ${batchNumber} exception:`, err);
      }

      // Update progress after batch completes
      setBatchProgress({
        currentBatch: batchNumber,
        totalBatches,
        processedCount: Math.min((i + 1) * BATCH_SIZE, allRows.length),
        successCount: aggregatedResult.successCount,
        failureCount: aggregatedResult.failureCount,
        skippedDuplicates: aggregatedResult.skippedDuplicates
      });
    }

    aggregatedResult.success = aggregatedResult.successCount > 0;
    return aggregatedResult;
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);
    setBatchProgress(null);
    
    try {
      // Dynamically import xlsx parser only when needed to reduce initial bundle size
      const { parseExcelFile } = await import("@/utils/excel/excelParser");
      
      // Parse file again for full data
      const rows = await parseExcelFile(file);
      
      // Process in batches
      const result = await processBatches(rows);
      setUploadResult(result);

      if (result.success && result.successCount > 0) {
        toast({
          title: "Upload Complete",
          description: `Successfully created ${result.successCount} proposals. ${result.failureCount > 0 ? `${result.failureCount} failed.` : ''}`,
        });
        
        if (result.successCount === result.totalRows) {
          onSuccess();
          onOpenChange(false);
        }
      } else {
        toast({
          title: "Upload Failed",
          description: "No proposals were created. Check error details below.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "Failed to upload proposals.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setBatchProgress(null);
    }
  };

  const progressPercentage = batchProgress 
    ? Math.round((batchProgress.processedCount / totalRows) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Bulk Upload Proposals</DialogTitle>
          <DialogDescription>
            Download the template, fill it with proposal data, and upload to create multiple proposals at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Download Template Section */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Step 1: Download Template</h3>
                <p className="text-sm text-muted-foreground">Get the Excel template with required fields</p>
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
              disabled={uploading}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
            />
          </div>

          {/* Batch Progress Section */}
          {batchProgress && (
            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <h3 className="font-semibold text-blue-800">Processing Batches...</h3>
              </div>
              <div className="space-y-3">
                <Progress value={progressPercentage} className="h-3" />
                <div className="flex justify-between text-sm text-blue-700">
                  <span>Batch {batchProgress.currentBatch} of {batchProgress.totalBatches}</span>
                  <span>{batchProgress.processedCount} / {totalRows} proposals</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">✓ {batchProgress.successCount} successful</span>
                  {batchProgress.failureCount > 0 && (
                    <span className="text-red-600">✗ {batchProgress.failureCount} failed</span>
                  )}
                </div>
              </div>
            </div>
          )}

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
          {preview.length > 0 && !uploading && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Preview (First 5 Rows)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Proposal Title</th>
                      <th className="text-left p-2">Client Email</th>
                      <th className="text-left p-2">Project Name</th>
                      <th className="text-left p-2">System Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">{row.proposal_title}</td>
                        <td className="p-2">{row.client_email}</td>
                        <td className="p-2">{row.project_name}</td>
                        <td className="p-2">{row.system_size} {row.system_size_unit}</td>
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
                {(uploadResult as any).skippedDuplicates > 0 && (
                  <p className="text-amber-600">⚠️ Duplicates Skipped: {(uploadResult as any).skippedDuplicates}</p>
                )}
                {uploadResult.failureCount > 0 && (
                  <>
                    <p className="text-destructive">✗ Failed: {uploadResult.failureCount - ((uploadResult as any).skippedDuplicates || 0)}</p>
                    <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                      {uploadResult.errors.map((error, idx) => (
                        <p key={idx} className={`${(error as any).isDuplicate ? 'text-amber-600' : 'text-muted-foreground'}`}>
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
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading || validationErrors.length > 0}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
              <Upload className="h-4 w-4 mr-2" />
              Upload {totalRows} Proposals
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
