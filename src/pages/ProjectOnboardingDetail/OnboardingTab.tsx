import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { OnboardingFileUpload } from "@/components/onboarding/OnboardingFileUpload";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { OnboardingFields, OnboardingDocument } from "@/types/onboarding";

interface OnboardingTabProps {
  projectId: string;
  fields: OnboardingFields | null;
  onRefresh: () => void;
}

export function OnboardingTab({ projectId, fields, onRefresh }: OnboardingTabProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<OnboardingFields>>(fields || {});
  const [documents, setDocuments] = useState<OnboardingDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [projectId]);

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from('onboarding_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments((data || []) as OnboardingDocument[]);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleInputChange = (field: keyof OnboardingFields, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('onboarding_fields')
        .upsert({
          project_id: projectId,
          ...formData,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Draft saved successfully",
      });

      onRefresh();
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidateAndComplete = async () => {
    try {
      setIsSaving(true);

      // Validate required fields
      const requiredFields = [
        'system_address',
        'commissioning_date',
        'inverter_model',
        'inverter_serial',
        'panel_brand',
        'total_capex'
      ];

      const missingFields = requiredFields.filter(field => !formData[field as keyof OnboardingFields]);

      if (missingFields.length > 0) {
        toast({
          title: "Validation Failed",
          description: `Missing required fields: ${missingFields.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      // Save fields
      const { error: fieldsError } = await supabase
        .from('onboarding_fields')
        .upsert({
          project_id: projectId,
          ...formData,
          validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (fieldsError) throw fieldsError;

      // Call validation function
      const { data: isValid, error: validationError } = await supabase
        .rpc('validate_onboarding_completion', { project_id_param: projectId });

      if (validationError) throw validationError;

      if (isValid) {
        // Update project status
        const { error: updateError } = await supabase
          .from('project_onboarding')
          .update({
            onboarding_complete: true,
            onboarding_completed_at: new Date().toISOString(),
          })
          .eq('id', projectId);

        if (updateError) throw updateError;

        toast({
          title: "Success",
          description: "Onboarding completed successfully!",
        });

        onRefresh();
      } else {
        toast({
          title: "Validation Failed",
          description: "Please ensure all required fields and documents are complete",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error validating:', error);
      toast({
        title: "Error",
        description: "Failed to validate onboarding",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getSectionStatus = (fields: string[]) => {
    const allFilled = fields.every(field => formData[field as keyof OnboardingFields]);
    return allFilled;
  };

  return (
    <div className="space-y-6">
      {/* System Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Details</CardTitle>
              <CardDescription>Basic information about the solar installation</CardDescription>
            </div>
            {getSectionStatus(['system_address', 'commissioning_date']) ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-600" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="system_name">System Name</Label>
              <Input
                id="system_name"
                value={formData.system_name || ''}
                onChange={(e) => handleInputChange('system_name', e.target.value)}
                placeholder="e.g., Main Building Solar Array"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownership_type">Ownership Type</Label>
              <Select
                value={formData.ownership_type || ''}
                onValueChange={(value) => handleInputChange('ownership_type', value)}
              >
                <SelectTrigger id="ownership_type">
                  <SelectValue placeholder="Select ownership type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Authorised Representative">Authorised Representative</SelectItem>
                  <SelectItem value="Owner">Owner</SelectItem>
                  <SelectItem value="Financed">Financed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="system_address">System Address *</Label>
              <Input
                id="system_address"
                value={formData.system_address || ''}
                onChange={(e) => handleInputChange('system_address', e.target.value)}
                placeholder="123 Main Street"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commissioning_date">Commissioning Date *</Label>
              <Input
                id="commissioning_date"
                type="date"
                value={formData.commissioning_date || ''}
                onChange={(e) => handleInputChange('commissioning_date', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="system_gps_lat">GPS Latitude</Label>
              <Input
                id="system_gps_lat"
                type="number"
                step="0.000001"
                value={formData.system_gps_lat || ''}
                onChange={(e) => handleInputChange('system_gps_lat', parseFloat(e.target.value))}
                placeholder="-26.2041"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="system_gps_lng">GPS Longitude</Label>
              <Input
                id="system_gps_lng"
                type="number"
                step="0.000001"
                value={formData.system_gps_lng || ''}
                onChange={(e) => handleInputChange('system_gps_lng', parseFloat(e.target.value))}
                placeholder="28.0473"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="connection_type">Connection Type</Label>
              <Select
                value={formData.connection_type || ''}
                onValueChange={(value) => handleInputChange('connection_type', value)}
              >
                <SelectTrigger id="connection_type">
                  <SelectValue placeholder="Select connection type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Residential Agricultural">Residential Agricultural</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                  <SelectItem value="Industrial">Industrial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alternative_power_source">Alternative Power Source</Label>
              <Select
                value={formData.alternative_power_source || ''}
                onValueChange={(value) => handleInputChange('alternative_power_source', value)}
              >
                <SelectTrigger id="alternative_power_source">
                  <SelectValue placeholder="Select power source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Eskom">Eskom</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="meter_type">Meter Type</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>This is normally the Inverter directly, in which case you select SSEG (this means your inverter is on the SSEG list published by the government). Only select Discrete Meter if you have a dedicated, separate meter which measures how much power the system produces.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={formData.meter_type || ''}
                onValueChange={(value) => handleInputChange('meter_type', value)}
              >
                <SelectTrigger id="meter_type">
                  <SelectValue placeholder="Select meter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SSEG">SSEG</SelectItem>
                  <SelectItem value="Discrete">Discrete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meter_serial">Meter Serial Number</Label>
              <Input
                id="meter_serial"
                value={formData.meter_serial || ''}
                onChange={(e) => handleInputChange('meter_serial', e.target.value)}
                placeholder="MTR123456"
              />
            </div>
          </div>

          {formData.meter_type === 'Discrete' && (
            <OnboardingFileUpload
              projectId={projectId}
              category="calibration_cert"
              documents={documents}
              onUploadComplete={fetchDocuments}
              label="Calibration Certificate for Meter (Filename, .pdf / .jpg)"
              required
            />
          )}
        </CardContent>
      </Card>

      {/* Inverter Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Inverter Details</CardTitle>
              <CardDescription>Information about the inverter installation</CardDescription>
            </div>
            {getSectionStatus(['inverter_model', 'inverter_serial']) ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-600" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inverter_model">Model *</Label>
              <Input
                id="inverter_model"
                value={formData.inverter_model || ''}
                onChange={(e) => handleInputChange('inverter_model', e.target.value)}
                placeholder="SolarEdge SE100K"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inverter_capacity_kw">Capacity (kW) *</Label>
              <Input
                id="inverter_capacity_kw"
                type="number"
                step="0.01"
                value={formData.inverter_capacity_kw || ''}
                onChange={(e) => handleInputChange('inverter_capacity_kw', parseFloat(e.target.value))}
                placeholder="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inverter_serial">Serial Number *</Label>
              <Input
                id="inverter_serial"
                value={formData.inverter_serial || ''}
                onChange={(e) => handleInputChange('inverter_serial', e.target.value)}
                placeholder="ABC123456"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inverter_cost">Cost (R)</Label>
              <Input
                id="inverter_cost"
                type="number"
                step="0.01"
                value={formData.inverter_cost || ''}
                onChange={(e) => handleInputChange('inverter_cost', parseFloat(e.target.value))}
                placeholder="50000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Panel Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Panel Details</CardTitle>
              <CardDescription>Information about the solar panels</CardDescription>
            </div>
            {getSectionStatus(['panel_brand']) ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-600" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="panel_brand">Brand *</Label>
              <Input
                id="panel_brand"
                value={formData.panel_brand || ''}
                onChange={(e) => handleInputChange('panel_brand', e.target.value)}
                placeholder="Canadian Solar"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="panel_size_wp">Size (Wp)</Label>
              <Input
                id="panel_size_wp"
                type="number"
                step="1"
                value={formData.panel_size_wp || ''}
                onChange={(e) => handleInputChange('panel_size_wp', parseFloat(e.target.value))}
                placeholder="550"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="panel_quantity">Quantity</Label>
              <Input
                id="panel_quantity"
                type="number"
                value={formData.panel_quantity || ''}
                onChange={(e) => handleInputChange('panel_quantity', parseInt(e.target.value))}
                placeholder="200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="panel_cost">Total Cost (R)</Label>
              <Input
                id="panel_cost"
                type="number"
                step="0.01"
                value={formData.panel_cost || ''}
                onChange={(e) => handleInputChange('panel_cost', parseFloat(e.target.value))}
                placeholder="150000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Financial Details</CardTitle>
              <CardDescription>Cost breakdown and CAPEX information</CardDescription>
            </div>
            {getSectionStatus(['total_capex']) ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-600" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_capex">Total CAPEX (R) *</Label>
              <Input
                id="total_capex"
                type="number"
                step="0.01"
                value={formData.total_capex || ''}
                onChange={(e) => handleInputChange('total_capex', parseFloat(e.target.value))}
                placeholder="500000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="labor_cost">Labor Cost (R)</Label>
              <Input
                id="labor_cost"
                type="number"
                step="0.01"
                value={formData.labor_cost || ''}
                onChange={(e) => handleInputChange('labor_cost', parseFloat(e.target.value))}
                placeholder="100000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Battery Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Battery Details (Optional)</CardTitle>
              <CardDescription>Information about battery storage if installed</CardDescription>
            </div>
            {formData.battery_model ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="battery_model">Model</Label>
              <Input
                id="battery_model"
                value={formData.battery_model || ''}
                onChange={(e) => handleInputChange('battery_model', e.target.value)}
                placeholder="Tesla Powerwall 2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="battery_capacity_kwh">Capacity (kWh)</Label>
              <Input
                id="battery_capacity_kwh"
                type="number"
                step="0.01"
                value={formData.battery_capacity_kwh || ''}
                onChange={(e) => handleInputChange('battery_capacity_kwh', parseFloat(e.target.value))}
                placeholder="13.5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="battery_serial">Serial Number</Label>
              <Input
                id="battery_serial"
                value={formData.battery_serial || ''}
                onChange={(e) => handleInputChange('battery_serial', e.target.value)}
                placeholder="BAT123456"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="battery_cost">Cost (R)</Label>
              <Input
                id="battery_cost"
                type="number"
                step="0.01"
                value={formData.battery_cost || ''}
                onChange={(e) => handleInputChange('battery_cost', parseFloat(e.target.value))}
                placeholder="80000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* O&M Agreement */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Operations & Maintenance</CardTitle>
              <CardDescription>Maintenance agreement details</CardDescription>
            </div>
            {getSectionStatus(['maintenance_agreement_term_years']) ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maintenance_agreement_term_years">Agreement Term (Years)</Label>
              <Input
                id="maintenance_agreement_term_years"
                type="number"
                value={formData.maintenance_agreement_term_years || ''}
                onChange={(e) => handleInputChange('maintenance_agreement_term_years', parseInt(e.target.value))}
                placeholder="5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance_cost_annual">Annual Cost (R)</Label>
              <Input
                id="maintenance_cost_annual"
                type="number"
                step="0.01"
                value={formData.maintenance_cost_annual || ''}
                onChange={(e) => handleInputChange('maintenance_cost_annual', parseFloat(e.target.value))}
                placeholder="25000"
              />
            </div>
          </div>

          <OnboardingFileUpload
            projectId={projectId}
            category="om_agreement"
            documents={documents}
            onUploadComplete={fetchDocuments}
            label="O&M Agreement"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleSaveDraft}
          variant="outline"
          disabled={isSaving}
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Draft
        </Button>
        <Button
          onClick={handleValidateAndComplete}
          disabled={isSaving}
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Validate & Mark Complete
        </Button>
      </div>
    </div>
  );
}
