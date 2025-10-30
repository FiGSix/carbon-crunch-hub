import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFileUpload } from '@/hooks/useFileUpload';
import { supabase } from '@/integrations/supabase/client';
import { validateStep1, validateStep2, validateStep3, Step1Data, Step2Data, Step3Data } from '@/utils/validation/legacyProjectValidation';
import { ChevronLeft, ChevronRight, Upload, FileText, X, Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface AddLegacyProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddLegacyProjectDialog({ open, onOpenChange, onSuccess }: AddLegacyProjectDialogProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [agents, setAgents] = useState<Array<{ id: string; email: string; name: string }>>([]);
  
  // Step 1 data
  const [step1, setStep1] = useState<Step1Data>({
    project_title: '',
    client_first_name: '',
    client_last_name: '',
    client_email: '',
    client_phone: '',
    client_company_name: '',
    agent_email: undefined,
  });

  // Step 2 data
  const [step2, setStep2] = useState<Step2Data>({
    system_address: '',
    system_size_kwp: 0,
    commissioning_date: '',
    signed_date: '',
    signed_pdf_url: '',
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Step 3 data
  const [step3, setStep3] = useState<Step3Data>({
    client_share_percentage: 75,
    agent_commission_percentage: 4,
  });

  const { uploadFile, uploading } = useFileUpload({
    bucket: 'onboarding-documents',
    maxSizeInMB: 10,
    allowedTypes: ['application/pdf'],
    folderPrefix: `legacy-${Date.now()}`,
    onSuccess: (url) => {
      setStep2(prev => ({ ...prev, signed_pdf_url: url }));
      toast({
        title: "Success",
        description: "Signed agreement uploaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error,
        variant: "destructive",
      });
    }
  });

  // Fetch agents when dialog opens
  useState(() => {
    if (open) {
      fetchAgents();
    }
  });

  const fetchAgents = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('role', 'agent')
      .eq('agent_status', 'active')
      .order('first_name');
    
    if (!error && data) {
      setAgents(data.map(a => ({
        id: a.id,
        email: a.email,
        name: `${a.first_name} ${a.last_name}`.trim()
      })));
    }
  };

  const handlePdfUpload = async (file: File) => {
    setPdfFile(file);
    await uploadFile(file);
  };

  const handlePdfRemove = () => {
    setPdfFile(null);
    setStep2(prev => ({ ...prev, signed_pdf_url: '' }));
  };

  const handleNext = () => {
    let error: string | null = null;
    
    if (currentStep === 1) {
      error = validateStep1(step1);
    } else if (currentStep === 2) {
      error = validateStep2(step2);
    }
    
    if (error) {
      toast({
        title: "Validation Error",
        description: error,
        variant: "destructive",
      });
      return;
    }
    
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    const validationError = validateStep3(step3);
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-legacy-project', {
        body: {
          ...step1,
          ...step2,
          ...step3,
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Success",
          description: "Legacy project created successfully",
        });
        resetForm();
        onSuccess();
      } else {
        throw new Error(data?.error || 'Failed to create project');
      }
    } catch (error: any) {
      console.error('Create legacy project error:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to create project',
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setStep1({
      project_title: '',
      client_first_name: '',
      client_last_name: '',
      client_email: '',
      client_phone: '',
      client_company_name: '',
      agent_email: undefined,
    });
    setStep2({
      system_address: '',
      system_size_kwp: 0,
      commissioning_date: '',
      signed_date: '',
      signed_pdf_url: '',
    });
    setStep3({
      client_share_percentage: 75,
      agent_commission_percentage: 4,
    });
    setPdfFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Legacy Project</DialogTitle>
          <DialogDescription>
            Step {currentStep} of 3 - {currentStep === 1 ? 'Client & Project Basics' : currentStep === 2 ? 'System & Agreement Details' : 'Optional Details'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Client & Project Basics */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="project_title">Project Title *</Label>
                <Input
                  id="project_title"
                  value={step1.project_title}
                  onChange={(e) => setStep1(prev => ({ ...prev, project_title: e.target.value }))}
                  placeholder="e.g., Solar Installation - Main Street"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_first_name">Client First Name *</Label>
                  <Input
                    id="client_first_name"
                    value={step1.client_first_name}
                    onChange={(e) => setStep1(prev => ({ ...prev, client_first_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="client_last_name">Client Last Name *</Label>
                  <Input
                    id="client_last_name"
                    value={step1.client_last_name}
                    onChange={(e) => setStep1(prev => ({ ...prev, client_last_name: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="client_email">Client Email *</Label>
                <Input
                  id="client_email"
                  type="email"
                  value={step1.client_email}
                  onChange={(e) => setStep1(prev => ({ ...prev, client_email: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="client_phone">Client Phone</Label>
                <Input
                  id="client_phone"
                  value={step1.client_phone}
                  onChange={(e) => setStep1(prev => ({ ...prev, client_phone: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="client_company_name">Client Company Name</Label>
                <Input
                  id="client_company_name"
                  value={step1.client_company_name}
                  onChange={(e) => setStep1(prev => ({ ...prev, client_company_name: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="agent_email">Agent Email (Optional)</Label>
                <select
                  id="agent_email"
                  value={step1.agent_email}
                  onChange={(e) => setStep1(prev => ({ ...prev, agent_email: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">Select an agent</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.email}>
                      {agent.name} ({agent.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: System & Agreement Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="system_address">System Address *</Label>
                <Input
                  id="system_address"
                  value={step2.system_address}
                  onChange={(e) => setStep2(prev => ({ ...prev, system_address: e.target.value }))}
                  placeholder="Physical installation address"
                />
              </div>

              <div>
                <Label htmlFor="system_size_kwp">System Size (kWp) *</Label>
                <Input
                  id="system_size_kwp"
                  type="number"
                  step="0.01"
                  value={step2.system_size_kwp || ''}
                  onChange={(e) => setStep2(prev => ({ ...prev, system_size_kwp: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="commissioning_date">Commissioning Date *</Label>
                  <Input
                    id="commissioning_date"
                    type="date"
                    value={step2.commissioning_date}
                    onChange={(e) => setStep2(prev => ({ ...prev, commissioning_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="signed_date">Agreement Signed Date *</Label>
                  <Input
                    id="signed_date"
                    type="date"
                    value={step2.signed_date}
                    onChange={(e) => setStep2(prev => ({ ...prev, signed_date: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Signed Agreement PDF *</Label>
                {!pdfFile ? (
                  <div className="mt-2">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">PDF (MAX. 10MB)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePdfUpload(file);
                        }}
                        disabled={uploading}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-3 p-3 border rounded-lg">
                    <FileText className="w-8 h-8 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{pdfFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {uploading ? 'Uploading...' : `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB`}
                      </p>
                    </div>
                    {uploading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePdfRemove}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Optional Details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="inverter">
                  <AccordionTrigger>Inverter Details</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="inverter_brand">Brand</Label>
                          <Input
                            id="inverter_brand"
                            value={step3.inverter_brand}
                            onChange={(e) => setStep3(prev => ({ ...prev, inverter_brand: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="inverter_model">Model</Label>
                          <Input
                            id="inverter_model"
                            value={step3.inverter_model}
                            onChange={(e) => setStep3(prev => ({ ...prev, inverter_model: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="inverter_capacity_kw">Capacity (kW)</Label>
                          <Input
                            id="inverter_capacity_kw"
                            type="number"
                            step="0.01"
                            value={step3.inverter_capacity_kw || ''}
                            onChange={(e) => setStep3(prev => ({ ...prev, inverter_capacity_kw: parseFloat(e.target.value) || undefined }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="inverter_quantity">Quantity</Label>
                          <Input
                            id="inverter_quantity"
                            type="number"
                            value={step3.inverter_quantity || ''}
                            onChange={(e) => setStep3(prev => ({ ...prev, inverter_quantity: parseInt(e.target.value) || undefined }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="inverter_serial">Serial</Label>
                          <Input
                            id="inverter_serial"
                            value={step3.inverter_serial}
                            onChange={(e) => setStep3(prev => ({ ...prev, inverter_serial: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="panels">
                  <AccordionTrigger>Panel Details</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="panel_brand">Brand</Label>
                          <Input
                            id="panel_brand"
                            value={step3.panel_brand}
                            onChange={(e) => setStep3(prev => ({ ...prev, panel_brand: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="panel_size_wp">Size (Wp)</Label>
                          <Input
                            id="panel_size_wp"
                            type="number"
                            value={step3.panel_size_wp || ''}
                            onChange={(e) => setStep3(prev => ({ ...prev, panel_size_wp: parseInt(e.target.value) || undefined }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="panel_quantity">Quantity</Label>
                          <Input
                            id="panel_quantity"
                            type="number"
                            value={step3.panel_quantity || ''}
                            onChange={(e) => setStep3(prev => ({ ...prev, panel_quantity: parseInt(e.target.value) || undefined }))}
                          />
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="battery">
                  <AccordionTrigger>Battery Details</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="battery_brand">Brand</Label>
                          <Input
                            id="battery_brand"
                            value={step3.battery_brand}
                            onChange={(e) => setStep3(prev => ({ ...prev, battery_brand: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="battery_model">Model</Label>
                          <Input
                            id="battery_model"
                            value={step3.battery_model}
                            onChange={(e) => setStep3(prev => ({ ...prev, battery_model: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="battery_capacity_kwh">Capacity (kWh)</Label>
                          <Input
                            id="battery_capacity_kwh"
                            type="number"
                            step="0.01"
                            value={step3.battery_capacity_kwh || ''}
                            onChange={(e) => setStep3(prev => ({ ...prev, battery_capacity_kwh: parseFloat(e.target.value) || undefined }))}
                          />
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="financial">
                  <AccordionTrigger>Financial Details</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div>
                        <Label htmlFor="total_capex">Total CAPEX (R)</Label>
                        <Input
                          id="total_capex"
                          type="number"
                          step="0.01"
                          value={step3.total_capex || ''}
                          onChange={(e) => setStep3(prev => ({ ...prev, total_capex: parseFloat(e.target.value) || undefined }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="client_share_percentage">Client Share (%)</Label>
                          <Input
                            id="client_share_percentage"
                            type="number"
                            step="0.01"
                            value={step3.client_share_percentage || ''}
                            onChange={(e) => setStep3(prev => ({ ...prev, client_share_percentage: parseFloat(e.target.value) || undefined }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="agent_commission_percentage">Agent Commission (%)</Label>
                          <Input
                            id="agent_commission_percentage"
                            type="number"
                            step="0.01"
                            value={step3.agent_commission_percentage || ''}
                            onChange={(e) => setStep3(prev => ({ ...prev, agent_commission_percentage: parseFloat(e.target.value) || undefined }))}
                          />
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || submitting}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep < 3 ? (
            <Button onClick={handleNext} disabled={currentStep === 2 && uploading}>
              {currentStep === 2 && uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading PDF...
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
