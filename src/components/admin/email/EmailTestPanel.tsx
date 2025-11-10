import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { emailAutomationService } from "@/services/emailAutomationService";
import { useToast } from "@/hooks/use-toast";

export function EmailTestPanel() {
  const [email, setEmail] = useState("shaun@radiant.africa");
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const { toast } = useToast();

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

        <Button 
          onClick={handleSendTest} 
          disabled={isSending}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {isSending ? "Sending..." : "Send Test Emails"}
        </Button>

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

        <div className="text-sm text-muted-foreground space-y-3">
          <p className="font-medium">Templates that will be sent:</p>
          
          <div>
            <p className="text-xs font-semibold mb-1">Pre-Signature Automations:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Delivered but Not Opened</li>
              <li>Opened but Not Clicked</li>
              <li>Clicked but Not Signed</li>
              <li>Graceful Exit</li>
            </ul>
          </div>
          
          <div>
            <p className="text-xs font-semibold mb-1">Post-Signature Automations:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Accepted Thank-You</li>
              <li>Cession Reminder</li>
              <li>Onboarding Idle Help</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
