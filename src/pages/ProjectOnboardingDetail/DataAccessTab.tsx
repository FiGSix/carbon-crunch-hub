import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DataAccessConfig } from "@/types/onboarding";
import { getErrorMessage } from "@/lib/utils";

interface DataAccessTabProps {
  projectId: string;
  onRefresh: () => void;
}

export function DataAccessTab({ projectId, onRefresh }: DataAccessTabProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<Partial<DataAccessConfig>>({
    credential_method: 'delegated_account',
  });
const [isSaving, setIsSaving] = useState(false);

// Simple client-side validation
const getValidationErrors = (cfg: Partial<DataAccessConfig>): string[] => {
  const errors: string[] = [];
  if (!cfg.provider || String(cfg.provider).trim() === '') {
    errors.push('Provider is required');
  }
  const method = (cfg.credential_method ?? 'delegated_account') as 'delegated_account' | 'api_key';
  if (!method) {
    errors.push('Credential method is required');
  }
  if (method === 'delegated_account') {
    const email = cfg.delegated_email && String(cfg.delegated_email).trim() !== '' ? cfg.delegated_email : 'data@crunchcarbon.com';
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      errors.push('Delegated email is invalid');
    }
  }
  if (method === 'api_key') {
    if (!cfg.api_key_encrypted || String(cfg.api_key_encrypted).trim() === '') {
      errors.push('API key is required for API Key method');
    }
  }
  return errors;
};

useEffect(() => {
  fetchConfig();
}, [projectId]);

  const fetchConfig = async () => {
    try {
      // Check if user is admin
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      const isAdmin = profile?.role === 'admin';

      let data, error;

      if (isAdmin) {
        // Admins can see all fields including credentials
        const result = await supabase
          .from('data_access_config')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle();
        data = result.data;
        error = result.error;
      } else {
        // Non-admins use secure function (no credential exposure)
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
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

const handleSave = async () => {
  try {
    setIsSaving(true);

    // Validate client-side
    const validationErrors = getValidationErrors(config);
    if (validationErrors.length > 0) {
      toast({
        title: "Please fix the following",
        description: validationErrors[0],
        variant: "destructive",
      });
      return;
    }

    const { id, created_at, updated_at, ...configData } = config as any;
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
      title: "Success",
      description: "Configuration saved successfully",
    });

    onRefresh();
  } catch (error) {
    console.error('Error saving config:', error);
    toast({
      title: "Error",
      description: getErrorMessage(error) || "Failed to save configuration",
      variant: "destructive",
    });
  } finally {
    setIsSaving(false);
  }
};


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Access Configuration</CardTitle>
          <CardDescription>
            Configure access to inverter or meter data for monitoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="provider">Data Access Provider (required)</Label>
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
              onValueChange={(value) => setConfig(prev => ({ ...prev, provider: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Alpha ESS">Alpha ESS</SelectItem>
                <SelectItem value="Atess">Atess</SelectItem>
                <SelectItem value="BlueLog">BlueLog</SelectItem>
                <SelectItem value="Deye">Deye</SelectItem>
                <SelectItem value="Dyness">Dyness</SelectItem>
                <SelectItem value="Fronius">Fronius</SelectItem>
                <SelectItem value="GoodWe">GoodWe</SelectItem>
                <SelectItem value="Huawei">Huawei</SelectItem>
                <SelectItem value="Lux">Lux</SelectItem>
                <SelectItem value="Megarevo">Megarevo</SelectItem>
                <SelectItem value="Meteo Control">Meteo Control</SelectItem>
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
          </div>

          {/* Site ID and Portal URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="site_id">Site ID / Serial Number</Label>
              <Input
                id="site_id"
                value={config.site_id || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, site_id: e.target.value }))}
                placeholder="1234567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="portal_url">Portal URL</Label>
              <Input
                id="portal_url"
                value={config.portal_url || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, portal_url: e.target.value }))}
                placeholder="https://monitoring.provider.com"
              />
            </div>
          </div>

          {/* Credential Method */}
          <div className="space-y-4">
            <Label>Credential Method</Label>
            <RadioGroup
              value={config.credential_method || 'delegated_account'}
              onValueChange={(value) => setConfig(prev => ({ ...prev, credential_method: value as any }))}
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
                value={config.delegated_email || 'data@crunchcarbon.com'}
                onChange={(e) => setConfig(prev => ({ ...prev, delegated_email: e.target.value }))}
              />
            </div>
          )}

          {config.credential_method === 'api_key' && (
            <div className="space-y-2">
              <Label htmlFor="api_key">API Key</Label>
              <Input
                id="api_key"
                type="password"
                value={config.api_key_encrypted || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, api_key_encrypted: e.target.value }))}
                placeholder="Enter API key"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={isSaving || getValidationErrors(config).length > 0} variant="outline">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
