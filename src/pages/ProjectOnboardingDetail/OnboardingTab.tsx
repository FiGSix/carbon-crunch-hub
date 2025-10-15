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

  // Auto-calculate total_capex from component costs
  useEffect(() => {
    const inverterCost = formData.inverter_cost || 0;
    const batteryCost = formData.battery_cost || 0;
    const panelCost = formData.panel_cost || 0;
    const calculatedTotal = inverterCost + batteryCost + panelCost;
    
    if (calculatedTotal > 0) {
      setFormData(prev => ({ ...prev, total_capex: calculatedTotal }));
    }
  }, [formData.inverter_cost, formData.battery_cost, formData.panel_cost]);

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
              <div className="flex items-center gap-2">
                <Label htmlFor="commissioning_date">Commissioning or Installation Date *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>The Commissioning or installation date is not necessarily the day the system was physically installed, but rather the day the system first produced solar electricity.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
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
          </div>

          <OnboardingFileUpload
            projectId={projectId}
            category="calibration_cert"
            documents={documents}
            onUploadComplete={fetchDocuments}
            label="Meter Calibration Certificate for Meter (Filename, .pdf / .jpg)"
          />
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
              <Label htmlFor="inverter_brand">Inverter Brand</Label>
              <Select
                value={formData.inverter_brand || ''}
                onValueChange={(value) => handleInputChange('inverter_brand', value)}
              >
                <SelectTrigger id="inverter_brand">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alpha ESS">Alpha ESS</SelectItem>
                  <SelectItem value="Atess">Atess</SelectItem>
                  <SelectItem value="Deye">Deye</SelectItem>
                  <SelectItem value="Dyness">Dyness</SelectItem>
                  <SelectItem value="Fronius">Fronius</SelectItem>
                  <SelectItem value="GoodWe">GoodWe</SelectItem>
                  <SelectItem value="Huawei">Huawei</SelectItem>
                  <SelectItem value="Lux">Lux</SelectItem>
                  <SelectItem value="Megarevo">Megarevo</SelectItem>
                  <SelectItem value="Solis">Solis</SelectItem>
                  <SelectItem value="Sungrow">Sungrow</SelectItem>
                  <SelectItem value="SunSynk">SunSynk</SelectItem>
                  <SelectItem value="Victron">Victron</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
              <Label htmlFor="inverter_quantity">Number of Inverters</Label>
              <Input
                id="inverter_quantity"
                type="number"
                value={formData.inverter_quantity || ''}
                onChange={(e) => handleInputChange('inverter_quantity', parseInt(e.target.value))}
                placeholder="1"
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
              <Label htmlFor="inverter_cost">Total Cost Installed incl. VAT & Labour for Inverter(s) (Rands)</Label>
              <Input
                id="inverter_cost"
                type="number"
                step="0.01"
                value={formData.inverter_cost || ''}
                onChange={(e) => handleInputChange('inverter_cost', parseFloat(e.target.value))}
                placeholder="50000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_collector_present">Data Collector or Dongle</Label>
              <Select
                value={formData.data_collector_present || ''}
                onValueChange={(value) => handleInputChange('data_collector_present', value)}
              >
                <SelectTrigger id="data_collector_present">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="data_collector_serial">Data Collector or Dongle Serial Number</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>If we need to collect production data directly from the inverter we need to know the dongle serial number. This is normally somewhere on the dongle itself, but might also be on your invoice.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="data_collector_serial"
                type="text"
                value={formData.data_collector_serial || ''}
                onChange={(e) => handleInputChange('data_collector_serial', e.target.value)}
                placeholder="Enter serial number"
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
              <CardTitle>Battery Details (if you have a battery)</CardTitle>
              <CardDescription>Information about battery storage if installed</CardDescription>
            </div>
            {formData.battery_brand ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="battery_brand">Battery Brand</Label>
              <Select
                value={formData.battery_brand || ''}
                onValueChange={(value) => handleInputChange('battery_brand', value)}
              >
                <SelectTrigger id="battery_brand">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alpha-ESS">Alpha-ESS</SelectItem>
                  <SelectItem value="Dyness">Dyness</SelectItem>
                  <SelectItem value="Fox ESS">Fox ESS</SelectItem>
                  <SelectItem value="Freedom Won">Freedom Won</SelectItem>
                  <SelectItem value="Greenrich">Greenrich</SelectItem>
                  <SelectItem value="Hubble Energy">Hubble Energy</SelectItem>
                  <SelectItem value="i-G3N">i-G3N</SelectItem>
                  <SelectItem value="Pylontech">Pylontech</SelectItem>
                  <SelectItem value="Revov">Revov</SelectItem>
                  <SelectItem value="Solar MD">Solar MD</SelectItem>
                  <SelectItem value="Sunsynk">Sunsynk</SelectItem>
                  <SelectItem value="Volta">Volta</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="battery_capacity_kwh">Total Battery Capacity (kWh)</Label>
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
              <Label htmlFor="battery_cost">Total Cost Installed incl. VAT & Labour for Batteries (Rands)</Label>
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

      {/* Panel Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Panel Details</CardTitle>
              <CardDescription>Information about the solar panels</CardDescription>
            </div>
            {getSectionStatus(['panel_quantity', 'panel_total_kwp']) ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-600" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="panel_quantity">Number of Solar Panels</Label>
              <Input
                id="panel_quantity"
                type="number"
                value={formData.panel_quantity || ''}
                onChange={(e) => handleInputChange('panel_quantity', parseInt(e.target.value))}
                placeholder="200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="panel_total_kwp">Total Solar Array Size (kWp)</Label>
              <Input
                id="panel_total_kwp"
                type="number"
                step="0.01"
                value={formData.panel_total_kwp || ''}
                onChange={(e) => handleInputChange('panel_total_kwp', parseFloat(e.target.value))}
                placeholder="110"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="panel_cost">Total Cost Installed incl. VAT & Labour for Solar Panels (Rands)</Label>
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
              <Label htmlFor="total_capex">Total Cost Installed incl. VAT & Labour (Rands)</Label>
              <Input
                id="total_capex"
                type="number"
                step="0.01"
                value={formData.total_capex || ''}
                readOnly
                className="bg-muted cursor-not-allowed"
                placeholder="Auto-calculated from component costs"
              />
              <p className="text-xs text-muted-foreground">
                Auto-calculated from Inverter + Battery + Panel costs
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Documentation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Project Documentation</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md">
                      <p>To ensure your system is fully compliant with all legal and audit requirements, we need two key documents: a Certificate of Compliance (COC) and your system invoice(s). The COC must clearly show the system address, be signed and dated — if you don't have one, we can connect you with a trusted electrical contractor. Please upload the COC as a PDF or clear photo, along with your invoice or proof of payment showing the total system cost.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <CardDescription>Upload required project documents</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <OnboardingFileUpload
            projectId={projectId}
            category="coc"
            documents={documents}
            onUploadComplete={fetchDocuments}
            label="Certificate of Compliance (CoC)"
          />

          <OnboardingFileUpload
            projectId={projectId}
            category="invoice"
            documents={documents}
            onUploadComplete={fetchDocuments}
            label="Invoice 1"
          />

          <OnboardingFileUpload
            projectId={projectId}
            category="invoice"
            documents={documents}
            onUploadComplete={fetchDocuments}
            label="Invoice 2"
          />

          <OnboardingFileUpload
            projectId={projectId}
            category="invoice"
            documents={documents}
            onUploadComplete={fetchDocuments}
            label="Invoice 3"
          />

          <OnboardingFileUpload
            projectId={projectId}
            category="invoice"
            documents={documents}
            onUploadComplete={fetchDocuments}
            label="Invoice 4"
          />
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
