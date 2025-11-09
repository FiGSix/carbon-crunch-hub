import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, FileText, Info } from "lucide-react";
import { emailAutomationService, EmailTemplates } from "@/services/emailAutomationService";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function EmailTemplateEditor() {
  const [templates, setTemplates] = useState<EmailTemplates | null>(null);
  const [selectedType, setSelectedType] = useState<keyof EmailTemplates>("delivered_not_opened");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (templates) {
      setSubject(templates[selectedType].subject);
      setHtml(templates[selectedType].html);
    }
  }, [selectedType, templates]);

  const loadTemplates = async () => {
    try {
      const data = await emailAutomationService.getEmailTemplates();
      setTemplates(data);
      setSubject(data.delivered_not_opened.subject);
      setHtml(data.delivered_not_opened.html);
    } catch (error) {
      toast({
        title: "Failed to load templates",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!templates) return;

    setIsSaving(true);
    try {
      await emailAutomationService.updateEmailTemplate(selectedType, {
        subject,
        html
      });
      
      setTemplates({
        ...templates,
        [selectedType]: { subject, html }
      });

      toast({
        title: "Template saved",
        description: "Email template updated successfully",
      });
    } catch (error) {
      toast({
        title: "Failed to save template",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div>Loading templates...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Email Template Editor
        </CardTitle>
        <CardDescription>
          Edit email templates with dynamic placeholders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Template Type</Label>
          <Select value={selectedType} onValueChange={(value) => setSelectedType(value as keyof EmailTemplates)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="delivered_not_opened">Delivered but Not Opened</SelectItem>
              <SelectItem value="opened_not_clicked">Opened but Not Clicked</SelectItem>
              <SelectItem value="clicked_not_signed">Clicked but Not Signed</SelectItem>
              <SelectItem value="graceful_exit">Graceful Exit</SelectItem>
              <SelectItem value="accepted_thank_you">Accepted Thank-You</SelectItem>
              <SelectItem value="cession_reminder">Cession Reminder</SelectItem>
              <SelectItem value="onboarding_idle_help">Onboarding Idle Help</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Pre-signature placeholders:</strong> {'{{clientName}}'}, {'{{proposalTitle}}'}, {'{{proposalUrl}}'}, {'{{agentName}}'}, {'{{agentEmail}}'}<br />
            <strong>Post-signature placeholders:</strong> {'{{clientName}}'}, {'{{proposalTitle}}'}, {'{{onboardingUrl}}'}, {'{{agentName}}'}, {'{{agentEmail}}'}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject Line</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject with {{placeholders}}"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="html">Email HTML Template</Label>
          <Textarea
            id="html"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="HTML email body with {{placeholders}}"
            className="font-mono text-sm min-h-[300px]"
          />
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Template"}
        </Button>
      </CardContent>
    </Card>
  );
}
