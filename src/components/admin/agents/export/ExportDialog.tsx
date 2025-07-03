import React, { useState } from 'react';
import { Download, FileText, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { agentExportService, ExportOptions } from './AgentExportService';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilters: {
    statusFilter: string;
    searchTerm: string;
    accessLevelFilter: string;
    commissionFilter: string;
    onboardingFilter: string;
    joinDateFilter: { from?: Date; to?: Date } | null;
  };
}

const AVAILABLE_FIELDS = [
  { id: 'name', label: 'Name', default: true },
  { id: 'email', label: 'Email', default: true },
  { id: 'company', label: 'Company', default: true },
  { id: 'status', label: 'Status', default: true },
  { id: 'accessLevel', label: 'Access Level', default: true },
  { id: 'commission', label: 'Commission Override', default: false },
  { id: 'lastActive', label: 'Last Active', default: false },
  { id: 'totalProposals', label: 'Total Proposals', default: true },
  { id: 'activeProposals', label: 'Active Proposals', default: false },
  { id: 'signedProposals', label: 'Signed Proposals', default: false },
  { id: 'totalCommission', label: 'Total Commission', default: false },
  { id: 'joinDate', label: 'Join Date', default: true },
  { id: 'onboarding', label: 'Onboarding Completed', default: false }
];

export function ExportDialog({ open, onOpenChange, currentFilters }: ExportDialogProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>(
    AVAILABLE_FIELDS.filter(field => field.default).map(field => field.id)
  );
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleSelectAll = () => {
    setSelectedFields(AVAILABLE_FIELDS.map(field => field.id));
  };

  const handleSelectNone = () => {
    setSelectedFields([]);
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast({
        title: "No Fields Selected",
        description: "Please select at least one field to export.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const exportOptions: ExportOptions = {
        format: 'csv',
        includeFields: selectedFields,
        ...currentFilters
      };

      await agentExportService.exportToCSV(exportOptions);
      
      toast({
        title: "Export Successful",
        description: "Agent data has been exported to CSV file.",
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const activeFilterCount = Object.entries(currentFilters).filter(([key, value]) => {
    if (key === 'statusFilter') return value !== 'all';
    if (key === 'searchTerm') return typeof value === 'string' && value.length > 0;
    if (key === 'accessLevelFilter') return value !== 'all';
    if (key === 'commissionFilter') return value !== 'all';
    if (key === 'onboardingFilter') return value !== 'all';
    if (key === 'joinDateFilter') return value !== null;
    return false;
  }).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export Agent Data
          </DialogTitle>
          <DialogDescription>
            Choose which fields to include in your export. 
            {activeFilterCount > 0 && (
              <span className="text-primary"> Current filters will be applied ({activeFilterCount} active).</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Select Fields:</Label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSelectNone}>
                Select None
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
            {AVAILABLE_FIELDS.map((field) => (
              <div key={field.id} className="flex items-center space-x-2">
                <Checkbox
                  id={field.id}
                  checked={selectedFields.includes(field.id)}
                  onCheckedChange={() => handleFieldToggle(field.id)}
                />
                <Label htmlFor={field.id} className="text-sm">
                  {field.label}
                </Label>
              </div>
            ))}
          </div>

          <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded">
            <strong>Export Format:</strong> CSV (Comma-separated values)<br />
            <strong>Selected Fields:</strong> {selectedFields.length} of {AVAILABLE_FIELDS.length}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || selectedFields.length === 0}>
            {isExporting ? (
              <>
                <Download className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}