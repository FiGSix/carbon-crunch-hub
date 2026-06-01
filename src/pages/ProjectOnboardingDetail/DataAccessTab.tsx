import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Info, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DataAccessConfig } from "@/types/onboarding";
import { getErrorMessage } from "@/lib/utils";
import { format } from "date-fns";
import { useDataAccessValidation } from "@/hooks/useDataAccessValidation";
import { FormError } from "@/components/ui/form-error";
import { ValidationSummary } from "@/components/onboarding/ValidationSummary";
import { cn } from "@/lib/utils";

interface DataAccessTabProps {
  projectId: string;
  onRefresh: () => void;
}

export function DataAccessTab({ projectId, onRefresh }: DataAccessTabProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<Partial<DataAccessConfig>>({
    credential_method: 'delegated_account',
  });
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [portalDefaults, setPortalDefaults] = useState<Record<string, string | null>>({});
  const [autoFilledFromSseg, setAutoFilledFromSseg] = useState(false);

  const {
    errors,
    touched,
    validateFieldOnBlur,
    validateAll,
    hasErrors
  } = useDataAccessValidation();

  // Known provider option values (must match the <SelectItem> values below).
  const PROVIDER_OPTIONS = [
    'ABB','Afore','Alpha ESS','Ario','Atess','BlueLog','Deye','Dyness','Enphase',
    'FoxESS','Fronius','GivEnergy','GoodWe','Growatt','Huawei','Lux','Megarevo',
    'Meteo Control','SigEnergy','Sineng','Sivula','SMA','Solis','SolarEdge',
    'Sungrow','SunSynk','Vcomms','Victron','Other'
  ];

  useEffect(() => {
    fetchConfig();
    fetchPortalDefaults();
  }, [projectId]);

  const fetchPortalDefaults = async () => {
    const { data, error } = await supabase
      .from('inverter_portal_defaults')
      .select('brand, portal_url');
    if (error) {
      console.error('Failed to load inverter portal defaults:', error);
      return;
    }
    const map: Record<string, string | null> = {};
    (data || []).forEach((row: any) => { map[row.brand] = row.portal_url; });
    setPortalDefaults(map);
  };

  const fetchConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      const isAdmin = profile?.role === 'admin';

      let data, error;

      if (isAdmin) {
        const result = await supabase
          .from('data_access_config')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle();
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase
          .rpc('get_data_access_status', { project_id_param: projectId })
          .single();
        data = result.data;
        error = result.error;
      }

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setConfig({
          ...data,
          credential_method: data.credential_method as 'delegated_account' | 'api_key',
          last_test_status: data.last_test_status as 'success' | 'failed' | 'pending' | null
        });
      }

      const { data: onboardingData } = await supabase
        .from('project_onboarding')
        .select('data_access_verified, data_access_verified_at')
        .eq('id', projectId)
        .single();

      if (onboardingData) {
        setIsSubmitted(onboardingData.data_access_verified === true);
        setSubmittedAt(onboardingData.data_access_verified_at || null);
      }

      // Auto-fill from SSEG inverter brand when Data Access fields are still blank.
      const { data: fieldsData } = await supabase
        .from('onboarding_fields')
        .select('meter_type, inverter_brand')
        .eq('project_id', projectId)
        .maybeSingle();

      if (fieldsData?.meter_type === 'SSEG' && fieldsData.inverter_brand) {
        const brand = fieldsData.inverter_brand;
        const matched = PROVIDER_OPTIONS.includes(brand) ? brand : 'Other';
        setConfig(prev => {
          if (prev.provider) return prev;
          setAutoFilledFromSseg(true);
          return { ...prev, provider: matched };
        });
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const handleFieldChange = (field: keyof DataAccessConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleFieldBlur = (field: string) => {
    validateFieldOnBlur(field, config[field as keyof DataAccessConfig], config);
  };

  const handleSaveDraft = async () => {
    try {
      setIsSavingDraft(true);

      const { id, created_at, updated_at, data_access_verified, data_access_verified_at, ...configData } = config as any;
      const { data: { user } } = await supabase.auth.getUser();

      const method = (configData.credential_method ?? 'delegated_account') as 'delegated_account' | 'api_key';

      const payload: any = {
        project_id: projectId,
        ...configData,
        credential_method: method,
        configured_by: user?.id ?? null,
      };

      if (method === 'delegated_account') {
        payload.delegated_email = payload.delegated_email && String(payload.delegated_email).trim() !== ''
          ? payload.delegated_email
          : 'data@crunchcarbon.com';
        payload.api_key_encrypted = null;
      }

      const { error } = await supabase
        .from('data_access_config')
        .upsert(payload, { onConflict: 'project_id' });

      if (error) throw error;

      toast({
        title: "Draft saved",
        description: "Configuration saved as draft successfully",
      });

      fetchConfig();
      onRefresh();
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error",
        description: getErrorMessage(error) || "Failed to save draft",
        variant: "destructive",
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmitForAudit = async () => {
    try {
      setIsSubmitting(true);

      // Validate all fields
      const validationErrors = validateAll(config);
      if (Object.keys(validationErrors).length > 0) {
        toast({
          title: "Validation Error",
          description: "Please fix the highlighted errors before submitting",
          variant: "destructive",
        });
        return;
      }

      const { id, created_at, updated_at, ...configData } = config as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const method = (configData.credential_method ?? 'delegated_account') as 'delegated_account' | 'api_key';

      const payload: any = {
        project_id: projectId,
        ...configData,
        credential_method: method,
        configured_by: user.id,
      };

      if (method === 'delegated_account') {
        payload.delegated_email = payload.delegated_email && String(payload.delegated_email).trim() !== ''
          ? payload.delegated_email
          : 'data@crunchcarbon.com';
        payload.api_key_encrypted = null;
      }

      const { error: configError } = await supabase
        .from('data_access_config')
        .upsert(payload, { onConflict: 'project_id' });

      if (configError) {
        console.error('Failed to save configuration:', configError);
        throw new Error('Failed to save configuration');
      }

      const { error: verificationError } = await supabase
        .from('project_onboarding')
        .update({
          data_access_verified: true,
          data_access_verified_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (verificationError) {
        console.error('Failed to update verification status:', verificationError);
        throw new Error('Failed to submit for audit');
      }

      const { error: activityError } = await supabase
        .from('onboarding_activity_log')
        .insert({
          project_id: projectId,
          actor_id: user.id,
          action: 'data_access_submitted',
          entity_type: 'data_access_config',
          details: {
            provider: config.provider,
            credential_method: config.credential_method,
          }
        });

      if (activityError) console.error('Failed to log activity:', activityError);

      const { data: adminProfiles, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (!adminError && adminProfiles) {
        const notifications = adminProfiles.map(admin => ({
          user_id: admin.id,
          type: 'info',
          title: 'Data Access Config Submitted',
          message: `Project has submitted data access configuration for audit review`,
          related_type: 'project_onboarding',
          related_id: projectId,
        }));

        await supabase.from('notifications').insert(notifications);
      }

      setIsSubmitted(true);
      setSubmittedAt(new Date().toISOString());

      toast({
        title: "Submitted for audit",
        description: "Configuration submitted successfully. Admins will review it shortly.",
      });

      fetchConfig();
      onRefresh();
    } catch (error) {
      console.error('Error submitting for audit:', error);
      toast({
        title: "Error",
        description: getErrorMessage(error) || "Failed to submit for audit",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = config.provider && !hasErrors && !isSubmitted;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Data Access Configuration</CardTitle>
              <CardDescription>
                Configure access to inverter or meter data for monitoring
              </CardDescription>
            </div>
            {isSubmitted && submittedAt && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Submitted {format(new Date(submittedAt), 'MMM d, yyyy')}
              </Badge>
            )}
            {!isSubmitted && (
              <Badge variant="outline">Draft</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isSubmitted && (
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium mb-1">Awaiting Admin Review</p>
              <p className="text-muted-foreground">
                This configuration has been submitted for audit. You can still save updates as a draft. 
                Contact an admin if you need to resubmit after making changes.
              </p>
            </div>
          )}

          {/* Validation Summary */}
          {hasErrors && Object.keys(touched).length > 0 && (
            <ValidationSummary errors={errors} />
          )}

          {/* Provider */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="provider">
                Data Access Provider <span className="text-destructive">*</span>
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>The Crunch Carbon team will be required to access the system remotely, please advise on which portal or inverter cloud portal or access point we should use to get access to the energy data.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={config.provider || ''}
              onValueChange={(value) => {
                handleFieldChange('provider', value);
                validateFieldOnBlur('provider', value, config);
              }}
            >
              <SelectTrigger className={cn(touched.provider && errors.provider && "border-destructive")}>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ABB">ABB</SelectItem>
                <SelectItem value="Afore">Afore</SelectItem>
                <SelectItem value="Alpha ESS">Alpha ESS</SelectItem>
                <SelectItem value="Ario">Ario</SelectItem>
                <SelectItem value="Atess">Atess</SelectItem>
                <SelectItem value="BlueLog">BlueLog</SelectItem>
                <SelectItem value="Deye">Deye</SelectItem>
                <SelectItem value="Dyness">Dyness</SelectItem>
                <SelectItem value="Enphase">Enphase</SelectItem>
                <SelectItem value="FoxESS">FoxESS</SelectItem>
                <SelectItem value="Fronius">Fronius</SelectItem>
                <SelectItem value="GivEnergy">GivEnergy</SelectItem>
                <SelectItem value="GoodWe">GoodWe</SelectItem>
                <SelectItem value="Growatt">Growatt</SelectItem>
                <SelectItem value="Huawei">Huawei</SelectItem>
                <SelectItem value="Lux">Lux</SelectItem>
                <SelectItem value="Megarevo">Megarevo</SelectItem>
                <SelectItem value="Meteo Control">Meteo Control</SelectItem>
                <SelectItem value="SigEnergy">SigEnergy</SelectItem>
                <SelectItem value="Sineng">Sineng</SelectItem>
                <SelectItem value="Sivula">Sivula</SelectItem>
                <SelectItem value="SMA">SMA</SelectItem>
                <SelectItem value="Solis">Solis</SelectItem>
                <SelectItem value="SolarEdge">SolarEdge</SelectItem>
                <SelectItem value="Sungrow">Sungrow</SelectItem>
                <SelectItem value="SunSynk">SunSynk</SelectItem>
                <SelectItem value="Vcomms">Vcomms</SelectItem>
                <SelectItem value="Victron">Victron</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <FormError message={touched.provider ? errors.provider : undefined} />
          </div>

          {/* Site ID and Portal URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="site_id">Site ID / Serial Number</Label>
              <Input
                id="site_id"
                value={config.site_id || ''}
                onChange={(e) => handleFieldChange('site_id', e.target.value)}
                onBlur={() => handleFieldBlur('site_id')}
                placeholder="1234567"
                maxLength={100}
                className={cn(touched.site_id && errors.site_id && "border-destructive")}
              />
              <FormError message={touched.site_id ? errors.site_id : undefined} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="portal_url">Portal URL</Label>
              <Input
                id="portal_url"
                value={config.portal_url || ''}
                onChange={(e) => handleFieldChange('portal_url', e.target.value)}
                onBlur={() => handleFieldBlur('portal_url')}
                placeholder="https://monitoring.provider.com"
                className={cn(touched.portal_url && errors.portal_url && "border-destructive")}
              />
              <FormError message={touched.portal_url ? errors.portal_url : undefined} />
            </div>
          </div>

          {/* Credential Method */}
          <div className="space-y-4">
            <Label>Credential Method</Label>
            <RadioGroup
              value={config.credential_method || 'delegated_account'}
              onValueChange={(value) => handleFieldChange('credential_method', value as any)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delegated_account" id="delegated" />
                <Label htmlFor="delegated" className="font-normal cursor-pointer">
                  Delegated Account (data@crunchcarbon.com)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="api_key" id="api_key" />
                <Label htmlFor="api_key" className="font-normal cursor-pointer">
                  API Key / Token
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Conditional Fields */}
          {config.credential_method === 'delegated_account' && (
            <div className="space-y-2">
              <Label htmlFor="delegated_email">Delegated Email</Label>
              <Input
                id="delegated_email"
                type="email"
                value={config.delegated_email || 'data@crunchcarbon.com'}
                onChange={(e) => handleFieldChange('delegated_email', e.target.value)}
                onBlur={() => handleFieldBlur('delegated_email')}
                className={cn(touched.delegated_email && errors.delegated_email && "border-destructive")}
              />
              <FormError message={touched.delegated_email ? errors.delegated_email : undefined} />
            </div>
          )}

          {config.credential_method === 'api_key' && (
            <div className="space-y-2">
              <Label htmlFor="api_key">
                API Key <span className="text-destructive">*</span>
              </Label>
              <Input
                id="api_key"
                type="password"
                value={config.api_key_encrypted || ''}
                onChange={(e) => handleFieldChange('api_key_encrypted', e.target.value)}
                onBlur={() => handleFieldBlur('api_key_encrypted')}
                placeholder="Enter API key (minimum 10 characters)"
                className={cn(touched.api_key_encrypted && errors.api_key_encrypted && "border-destructive")}
              />
              <FormError message={touched.api_key_encrypted ? errors.api_key_encrypted : undefined} />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleSaveDraft} 
              disabled={isSavingDraft || isSubmitting} 
              variant="outline"
            >
              {isSavingDraft && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Draft
            </Button>
            <Button 
              onClick={handleSubmitForAudit} 
              disabled={isSubmitting || isSavingDraft || !canSubmit}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit for Audit
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
