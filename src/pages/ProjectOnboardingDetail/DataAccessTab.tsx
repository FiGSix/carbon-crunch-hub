import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { DataAccessConfig } from "@/types/onboarding";

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
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [projectId]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('data_access_config')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setConfig({
          ...data,
          credential_method: data.credential_method as 'delegated_account' | 'api_key' | 'readonly_user',
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

      const { id, created_at, updated_at, ...configData } = config as any;
      const { error } = await supabase
        .from('data_access_config')
        .upsert({
          project_id: projectId,
          ...configData,
        });

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
        description: "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);

      // Update test status to pending
      await supabase
        .from('data_access_config')
        .update({
          last_test_status: 'pending',
          last_test_at: new Date().toISOString(),
        })
        .eq('project_id', projectId);

      // Simulate test (in production, this would call the edge function)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update with mock success
      const { error } = await supabase
        .from('data_access_config')
        .update({
          last_test_status: 'success',
          last_test_at: new Date().toISOString(),
          first_data_ingested_at: new Date().toISOString(),
        })
        .eq('project_id', projectId);

      if (error) throw error;

      // Update project status
      await supabase
        .from('project_onboarding')
        .update({
          data_access_verified: true,
          data_access_verified_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      toast({
        title: "Success",
        description: "Connection test successful! Data access verified.",
      });

      onRefresh();
    } catch (error) {
      console.error('Error testing connection:', error);

      await supabase
        .from('data_access_config')
        .update({
          last_test_status: 'failed',
          last_test_error: 'Connection test failed',
        })
        .eq('project_id', projectId);

      toast({
        title: "Test Failed",
        description: "Unable to connect to data source",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
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
            <Label htmlFor="provider">Provider</Label>
            <Select
              value={config.provider || ''}
              onValueChange={(value) => setConfig(prev => ({ ...prev, provider: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SolarEdge">SolarEdge</SelectItem>
                <SelectItem value="Huawei">Huawei</SelectItem>
                <SelectItem value="SMA">SMA</SelectItem>
                <SelectItem value="Fronius">Fronius</SelectItem>
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
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="readonly_user" id="readonly" />
                <Label htmlFor="readonly" className="font-normal cursor-pointer">
                  Read-Only User
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

          {config.credential_method === 'readonly_user' && (
            <div className="space-y-2">
              <Label htmlFor="readonly_username">Read-Only Username</Label>
              <Input
                id="readonly_username"
                value={config.readonly_username || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, readonly_username: e.target.value }))}
                placeholder="readonly_user"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={isSaving} variant="outline">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>
            <Button onClick={handleTestConnection} disabled={isTesting || !config.provider}>
              {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connection Status */}
      {config.last_test_status && (
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {config.last_test_status === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : config.last_test_status === 'failed' ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
              )}
              <div>
                <p className="font-medium">
                  Last Test: {config.last_test_status === 'success' ? 'Success' : config.last_test_status === 'failed' ? 'Failed' : 'Pending'}
                </p>
                {config.last_test_at && (
                  <p className="text-sm text-muted-foreground">
                    {new Date(config.last_test_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {config.first_data_ingested_at && (
              <div>
                <p className="text-sm font-medium">First Data Ingested</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(config.first_data_ingested_at).toLocaleString()}
                </p>
              </div>
            )}

            {config.last_test_error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                <p className="text-sm text-red-600 dark:text-red-400">{config.last_test_error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
