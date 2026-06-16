import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Calendar, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { emailAutomationService, TimingConfig } from "@/services/emailAutomationService";
import { useToast } from "@/hooks/use-toast";

export function ValiditySettingsPanel() {
  const [validityHours, setValidityHours] = useState(240);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await emailAutomationService.getTimingConfig();
      setValidityHours(data.proposal_validity_hours);
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
    setIsSaving(true);
    try {
      const currentConfig = await emailAutomationService.getTimingConfig();
      await emailAutomationService.updateTimingConfig({
        ...currentConfig,
        proposal_validity_hours: validityHours
      });
      
      toast({
        title: "Validity period updated",
        description: `New proposals will be valid for ${validityHours} hours (${(validityHours / 24).toFixed(1)} days)`,
      });
    } catch (error) {
      toast({
        title: "Failed to update validity",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div>Loading configuration...</div>;
  }

  const days = (validityHours / 24).toFixed(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Proposal Validity Period
        </CardTitle>
        <CardDescription>
          Set how long proposal invitation links remain valid
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This setting affects new proposals only. Existing proposals retain their original expiration dates.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="validity-hours">Validity Period (hours)</Label>
          <Input
            id="validity-hours"
            type="number"
            min="1"
            value={validityHours}
            onChange={(e) => setValidityHours(Number(e.target.value))}
          />
          <p className="text-sm text-muted-foreground">
            = {days} days
          </p>
        </div>

        <div className="p-4 bg-muted rounded-lg space-y-2">
          <p className="text-sm font-medium">Common presets:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setValidityHours(120)}
            >
              5 days (120h)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setValidityHours(168)}
            >
              7 days (168h)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setValidityHours(240)}
            >
              10 days (240h)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setValidityHours(336)}
            >
              14 days (336h)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setValidityHours(720)}
            >
              30 days (720h)
            </Button>
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Validity Period"}
        </Button>
      </CardContent>
    </Card>
  );
}
