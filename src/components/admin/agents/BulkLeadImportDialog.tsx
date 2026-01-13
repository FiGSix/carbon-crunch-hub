
import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  ClipboardPaste,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { LeadRow, LeadImportResult } from '@/types/leads';
import { parseTextData, parseLeadExcelFile } from '@/utils/excel/leadParser';
import { validateLeads } from '@/utils/excel/leadValidator';
import { downloadLeadTemplate } from '@/utils/excel/leadTemplateGenerator';

interface BulkLeadImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkLeadImportDialog({ open, onOpenChange }: BulkLeadImportDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<LeadRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<LeadImportResult | null>(null);
  
  const resetState = useCallback(() => {
    setPastedText('');
    setSelectedFile(null);
    setParsedRows([]);
    setValidationErrors([]);
    setImportResult(null);
  }, []);
  
  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [onOpenChange, resetState]);
  
  // Parse pasted text
  const handleParseText = useCallback(() => {
    if (!pastedText.trim()) {
      setValidationErrors(['Please paste some data first']);
      return;
    }
    
    try {
      const rows = parseTextData(pastedText);
      const validated = validateLeads(rows);
      
      setParsedRows(validated.rows);
      
      if (validated.errors.length > 0) {
        const errorMessages = validated.errors.slice(0, 5).map(
          e => `Row ${e.row}: ${e.message}`
        );
        if (validated.errors.length > 5) {
          errorMessages.push(`...and ${validated.errors.length - 5} more errors`);
        }
        setValidationErrors(errorMessages);
      } else {
        setValidationErrors([]);
      }
      
      if (rows.length === 0) {
        setValidationErrors(['No valid data found. Make sure your data has a header row with column names.']);
      }
    } catch (error) {
      setValidationErrors([error instanceof Error ? error.message : 'Failed to parse data']);
    }
  }, [pastedText]);
  
  // Parse Excel file
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    setValidationErrors([]);
    
    try {
      const rows = await parseLeadExcelFile(file);
      const validated = validateLeads(rows);
      
      setParsedRows(validated.rows);
      
      if (validated.errors.length > 0) {
        const errorMessages = validated.errors.slice(0, 5).map(
          e => `Row ${e.row}: ${e.message}`
        );
        if (validated.errors.length > 5) {
          errorMessages.push(`...and ${validated.errors.length - 5} more errors`);
        }
        setValidationErrors(errorMessages);
      }
      
      if (rows.length === 0) {
        setValidationErrors(['No valid data found in the Excel file.']);
      }
    } catch (error) {
      setValidationErrors([error instanceof Error ? error.message : 'Failed to parse Excel file']);
      setParsedRows([]);
    }
  }, []);
  
  // Import leads mutation
  const importMutation = useMutation({
    mutationFn: async (rows: LeadRow[]): Promise<LeadImportResult> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      const leadsToInsert = rows.map(row => ({
        company_name: row.company_name,
        contact_name: row.contact_name || null,
        email: row.email || null,
        phone: row.phone || null,
        website: row.website || null,
        location: row.location || null,
        source: row.source || 'Bulk Import',
        notes: row.notes || null,
        status: 'new' as const,
        created_by: userId
      }));
      
      const { data, error } = await supabase
        .from('agent_leads')
        .insert(leadsToInsert)
        .select();
      
      if (error) {
        throw error;
      }
      
      return {
        totalRows: rows.length,
        successCount: data?.length || 0,
        failureCount: rows.length - (data?.length || 0),
        errors: []
      };
    },
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ['agents', 'leads'] });
      queryClient.invalidateQueries({ queryKey: ['agents', 'management', 'tab-counts'] });
      toast({
        title: 'Import Complete',
        description: `Successfully imported ${result.successCount} leads.`
      });
    },
    onError: (error) => {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import leads',
        variant: 'destructive'
      });
    }
  });
  
  const handleImport = () => {
    if (parsedRows.length === 0) {
      toast({
        title: 'No data to import',
        description: 'Please parse your data first.',
        variant: 'destructive'
      });
      return;
    }
    
    importMutation.mutate(parsedRows);
  };
  
  const previewRows = parsedRows.slice(0, 5);
  const hasMoreRows = parsedRows.length > 5;
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import Leads</DialogTitle>
          <DialogDescription>
            Import multiple leads at once from spreadsheet data or an Excel file.
          </DialogDescription>
        </DialogHeader>
        
        {importResult ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Import Complete!</h3>
              <p className="text-muted-foreground">
                Successfully imported {importResult.successCount} of {importResult.totalRows} leads.
              </p>
            </div>
            <Button onClick={handleClose}>Done</Button>
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'paste' | 'upload')} className="flex-1">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="paste" className="gap-2">
                  <ClipboardPaste className="h-4 w-4" />
                  Paste Data
                </TabsTrigger>
                <TabsTrigger value="upload" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Upload Excel
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="paste" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Paste your tab-separated or CSV data below</Label>
                  <Textarea
                    placeholder={`company_name\tcontact_name\temail\tlocation\nSolarTech SA\tJohn Smith\tjohn@solar.co.za\tCape Town`}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="min-h-[120px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    First row should contain column headers. Supports tab, comma, or semicolon delimiters.
                  </p>
                </div>
                <Button variant="outline" onClick={handleParseText}>
                  Parse Data
                </Button>
              </TabsContent>
              
              <TabsContent value="upload" className="space-y-4 mt-4">
                <div className="flex items-center gap-4">
                  <Button variant="outline" onClick={downloadLeadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>Upload Excel File (.xlsx)</Label>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    Preview {hasMoreRows ? `(showing ${previewRows.length} of ${parsedRows.length})` : `(${parsedRows.length} leads)`}
                  </Label>
                </div>
                <ScrollArea className="h-[200px] rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{row.company_name}</TableCell>
                          <TableCell>{row.contact_name || '-'}</TableCell>
                          <TableCell className="text-sm">{row.email || '-'}</TableCell>
                          <TableCell>{row.location || '-'}</TableCell>
                          <TableCell>{row.source || 'Bulk Import'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={parsedRows.length === 0 || importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import {parsedRows.length} Lead{parsedRows.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
