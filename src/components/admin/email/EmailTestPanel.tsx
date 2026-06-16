import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { emailAutomationService, EmailTemplates } from "@/services/emailAutomationService";
import { useToast } from "@/hooks/use-toast";

export function EmailTestPanel() {
  const [email, setEmail] = useState("shaun@radiant.africa");
  const [isSending, setIsSending] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const { toast } = useToast();

  const handleSendSingleTest = async (templateType: keyof EmailTemplates, templateName: string) => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive"
      });
      return;
    }

    setLoadingTemplate(templateType);

    try {
      await emailAutomationService.testSingleEmailTemplate(email, templateType);
      toast({
        title: "Test email sent",
        description: `${templateName} template sent to ${email}`,
      });
    } catch (error) {
      toast({
        title: "Failed to send test email",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoadingTemplate(null);
    }
  };

  const handleSendTest = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    setStatus("idle");

    try {
      await emailAutomationService.testEmailTemplates(email);
      setStatus("success");
      toast({
        title: "Test emails sent",
        description: `All 7 email templates sent to ${email}`,
      });
    } catch (error) {
      setStatus("error");
      toast({
        title: "Failed to send test emails",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Test Email Templates
        </CardTitle>
        <CardDescription>
          Send all 7 email templates to any email address for testing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="test-email">Test Email Address</Label>
          <Input
            id="test-email"
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {status === "success" && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-md">
            <CheckCircle2 className="h-4 w-4" />
            <span>Successfully sent all 7 email templates to {email}</span>
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to send test emails. Check console for details.</span>
          </div>
        )}

        <div className="space-y-3">
          <p className="font-medium text-sm">Test Individual Templates:</p>
          
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Pre-Signature Automations:</p>
            
            <div className="grid gap-2">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div className="flex-1">
                  <p className="text-sm font-medium">Delivered but Not Opened</p>
                  <p className="text-xs text-muted-foreground">Reminder when proposal hasn't been viewed</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendSingleTest("delivered_not_opened", "Delivered but Not Opened")}
                  disabled={isSending || loadingTemplate !== null}
                >
                  {loadingTemplate === "delivered_not_opened" ? "Sending..." : "Test"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div className="flex-1">
                  <p className="text-sm font-medium">Opened but Not Clicked</p>
                  <p className="text-xs text-muted-foreground">Follow-up when proposal was opened but CTA not clicked</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendSingleTest("opened_not_clicked", "Opened but Not Clicked")}
                  disabled={isSending || loadingTemplate !== null}
                >
                  {loadingTemplate === "opened_not_clicked" ? "Sending..." : "Test"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div className="flex-1">
                  <p className="text-sm font-medium">Clicked but Not Signed</p>
                  <p className="text-xs text-muted-foreground">Nudge when user clicked through but didn't sign</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendSingleTest("clicked_not_signed", "Clicked but Not Signed")}
                  disabled={isSending || loadingTemplate !== null}
                >
                  {loadingTemplate === "clicked_not_signed" ? "Sending..." : "Test"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div className="flex-1">
                  <p className="text-sm font-medium">Graceful Exit</p>
                  <p className="text-xs text-muted-foreground">Final reminder before proposal expires</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendSingleTest("graceful_exit", "Graceful Exit")}
                  disabled={isSending || loadingTemplate !== null}
                >
                  {loadingTemplate === "graceful_exit" ? "Sending..." : "Test"}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="space-y-2 mt-4">
            <p className="text-xs font-semibold text-muted-foreground">Post-Signature Automations:</p>
            
            <div className="grid gap-2">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div className="flex-1">
                  <p className="text-sm font-medium">Accepted Thank-You</p>
                  <p className="text-xs text-muted-foreground">Confirmation and next steps after acceptance</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendSingleTest("accepted_thank_you", "Accepted Thank-You")}
                  disabled={isSending || loadingTemplate !== null}
                >
                  {loadingTemplate === "accepted_thank_you" ? "Sending..." : "Test"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div className="flex-1">
                  <p className="text-sm font-medium">Cession Reminder</p>
                  <p className="text-xs text-muted-foreground">Prompt to complete cession documentation</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendSingleTest("cession_reminder", "Cession Reminder")}
                  disabled={isSending || loadingTemplate !== null}
                >
                  {loadingTemplate === "cession_reminder" ? "Sending..." : "Test"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div className="flex-1">
                  <p className="text-sm font-medium">Onboarding Idle Help</p>
                  <p className="text-xs text-muted-foreground">Support offer when onboarding stalls</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendSingleTest("onboarding_idle_help", "Onboarding Idle Help")}
                  disabled={isSending || loadingTemplate !== null}
                >
                  {loadingTemplate === "onboarding_idle_help" ? "Sending..." : "Test"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <Button 
          onClick={handleSendTest} 
          disabled={isSending || loadingTemplate !== null}
          className="w-full"
          variant="secondary"
        >
          <Send className="h-4 w-4 mr-2" />
          {isSending ? "Sending All..." : "Send All 7 Templates"}
        </Button>
      </CardContent>
    </Card>
  );
}
