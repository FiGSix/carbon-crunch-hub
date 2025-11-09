import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Clock } from "lucide-react";
import { emailAutomationService, TimingConfig } from "@/services/emailAutomationService";
import { useToast } from "@/hooks/use-toast";

export function TimingConfigPanel() {
  const [config, setConfig] = useState<TimingConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await emailAutomationService.getTimingConfig();
      setConfig(data);
    } catch (error) {
      toast({
        title: "Failed to load configuration",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setIsSaving(true);
    try {
      await emailAutomationService.updateTimingConfig(config);
      toast({
        title: "Configuration saved",
        description: "Email timing rules updated successfully",
      });
    } catch (error) {
      toast({
        title: "Failed to save configuration",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfig = (key: keyof TimingConfig, value: number) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  };

  if (isLoading) {
    return <div>Loading configuration...</div>;
  }

  if (!config) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Timing Configuration
        </CardTitle>
        <CardDescription>
          Configure when automated follow-up emails are sent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="p-4 border rounded-lg space-y-3">
            <h3 className="font-semibold">Sent but Not Delivered</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sent-initial">Initial delay (days)</Label>
                <Input
                  id="sent-initial"
                  type="number"
                  min="0"
                  value={config.sent_not_delivered_days}
                  onChange={(e) => updateConfig("sent_not_delivered_days", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sent-repeat">Repeat interval (days)</Label>
                <Input
                  id="sent-repeat"
                  type="number"
                  min="0"
                  value={config.sent_not_delivered_repeat_days}
                  onChange={(e) => updateConfig("sent_not_delivered_repeat_days", Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-lg space-y-3">
            <h3 className="font-semibold">Delivered but Not Opened</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivered-initial">Initial delay (days)</Label>
                <Input
                  id="delivered-initial"
                  type="number"
                  min="0"
                  value={config.delivered_not_opened_days}
                  onChange={(e) => updateConfig("delivered_not_opened_days", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivered-repeat">Repeat interval (days)</Label>
                <Input
                  id="delivered-repeat"
                  type="number"
                  min="0"
                  value={config.delivered_not_opened_repeat_days}
                  onChange={(e) => updateConfig("delivered_not_opened_repeat_days", Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-lg space-y-3">
            <h3 className="font-semibold">Opened but Not Viewed</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opened-initial">Initial delay (days)</Label>
                <Input
                  id="opened-initial"
                  type="number"
                  min="0"
                  value={config.opened_not_viewed_days}
                  onChange={(e) => updateConfig("opened_not_viewed_days", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opened-repeat">Repeat interval (days)</Label>
                <Input
                  id="opened-repeat"
                  type="number"
                  min="0"
                  value={config.opened_not_viewed_repeat_days}
                  onChange={(e) => updateConfig("opened_not_viewed_repeat_days", Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-lg space-y-3">
            <h3 className="font-semibold">Mark as Stale</h3>
            <div className="space-y-2">
              <Label htmlFor="stale-days">Days without engagement</Label>
              <Input
                id="stale-days"
                type="number"
                min="1"
                value={config.mark_stale_days}
                onChange={(e) => updateConfig("mark_stale_days", Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Timing Configuration"}
        </Button>
      </CardContent>
    </Card>
  );
}
