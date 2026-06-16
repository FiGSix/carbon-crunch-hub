import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle, RefreshCw, Link, UserCheck, Mail, Loader2 } from "lucide-react";

interface UserStatus {
  found: boolean;
  email: string;
  emailConfirmed: boolean;
  confirmedAt: string | null;
  createdAt: string | null;
  lastSignIn: string | null;
  userId: string | null;
}

export function AuthVerificationTestPanel() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const callTestFunction = async (action: string) => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-auth-verification", {
        body: { action, email: email.trim() }
      });

      if (error) throw error;
      
      return data;
    } catch (err) {
      console.error(`Error in ${action}:`, err);
      toast.error(err instanceof Error ? err.message : "Operation failed");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    const result = await callTestFunction("check_status");
    if (result?.success) {
      setUserStatus(result);
      setGeneratedLink(null);
    }
  };

  const handleVerifyUser = async () => {
    const result = await callTestFunction("verify_user");
    if (result?.success) {
      toast.success(result.message);
      // Refresh status
      await handleCheckStatus();
    }
  };

  const handleGenerateLink = async () => {
    const result = await callTestFunction("generate_link");
    if (result?.success) {
      setGeneratedLink(result.testUrl);
      toast.success("Test link generated - click to test the callback flow");
    }
  };

  const handleResendConfirmation = async () => {
    const result = await callTestFunction("resend_confirmation");
    if (result?.success) {
      toast.success(result.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Could not copy — please copy manually"));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Auth Verification Testing
        </CardTitle>
        <CardDescription>
          Test and debug email verification flows without affecting live users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Input */}
        <div className="space-y-2">
          <Label htmlFor="test-email">Email Address</Label>
          <div className="flex gap-2">
            <Input
              id="test-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleCheckStatus} 
              disabled={loading || !email.trim()}
              variant="outline"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Check Status
            </Button>
          </div>
        </div>

        {/* User Status Display */}
        {userStatus && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{userStatus.email}</span>
              {userStatus.found ? (
                userStatus.emailConfirmed ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" /> Not Verified
                  </Badge>
                )
              ) : (
                <Badge variant="secondary">User Not Found</Badge>
              )}
            </div>
            
            {userStatus.found && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>User ID: <code className="text-xs bg-muted px-1 rounded">{userStatus.userId}</code></p>
                <p>Created: {userStatus.createdAt ? new Date(userStatus.createdAt).toLocaleString() : "N/A"}</p>
                {userStatus.emailConfirmed && (
                  <p>Confirmed: {userStatus.confirmedAt ? new Date(userStatus.confirmedAt).toLocaleString() : "N/A"}</p>
                )}
                <p>Last Sign In: {userStatus.lastSignIn ? new Date(userStatus.lastSignIn).toLocaleString() : "Never"}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleVerifyUser}
            disabled={loading || !email.trim()}
            variant="default"
            className="gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Verify User Directly
          </Button>
          
          <Button
            onClick={handleGenerateLink}
            disabled={loading || !email.trim()}
            variant="outline"
            className="gap-2"
          >
            <Link className="h-4 w-4" />
            Generate Test Link
          </Button>
          
          <Button
            onClick={handleResendConfirmation}
            disabled={loading || !email.trim()}
            variant="outline"
            className="gap-2"
          >
            <Mail className="h-4 w-4" />
            Resend Confirmation Email
          </Button>
        </div>

        {/* Generated Link Display */}
        {generatedLink && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-4 space-y-2">
            <p className="text-sm font-medium">Test Verification Link:</p>
            <div className="flex gap-2">
              <code className="flex-1 text-xs bg-background p-2 rounded overflow-x-auto">
                {generatedLink}
              </code>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => copyToClipboard(generatedLink)}
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Open this link in a new tab to test the AuthCallback flow
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-2 border-t pt-4">
          <p><strong>Testing Flow:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Enter the email address to test</li>
            <li>Click "Check Status" to see current verification state</li>
            <li>Use "Generate Test Link" to create a verification URL</li>
            <li>Open the link in a new tab to test AuthCallback</li>
            <li>Or use "Verify User Directly" to skip the email flow entirely</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
