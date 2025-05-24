
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function TokenTester() {
  const [testToken, setTestToken] = useState("");
  const [isTestingDeployment, setIsTestingDeployment] = useState(false);
  const [isTestingValidation, setIsTestingValidation] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDeploymentVerification = async () => {
    setIsTestingDeployment(true);
    setDeploymentResult(null);
    
    try {
      console.log("🔍 === DEPLOYMENT VERIFICATION STARTED ===");
      
      // Generate a test token for deployment verification
      const testTokenValue = `deployment-test-${Date.now()}`;
      const payload = { token: testTokenValue };
      
      console.log("📡 Testing function deployment with payload:", payload);
      
      const { data, error } = await supabase.functions.invoke('set-invitation-token', {
        body: JSON.stringify(payload)
      });
      
      if (error) {
        console.error("❌ Deployment verification failed:", error);
        setDeploymentResult(`❌ FAILED: ${error.message}`);
        toast({
          title: "Deployment Test Failed",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      console.log("✅ Deployment verification successful:", data);
      setDeploymentResult("✅ SUCCESS: Edge function is deployed and responding");
      toast({
        title: "Deployment Test Passed",
        description: "Edge function is properly deployed and responding",
      });
      
    } catch (error: any) {
      console.error("❌ Deployment verification failed:", error);
      setDeploymentResult(`❌ FAILED: ${error.message}`);
      toast({
        title: "Deployment Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsTestingDeployment(false);
    }
  };

  const handleTokenValidation = async () => {
    if (!testToken.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a token to test",
        variant: "destructive"
      });
      return;
    }

    setIsTestingValidation(true);
    setValidationResult(null);
    
    try {
      console.log("🎫 === TOKEN VALIDATION STARTED ===");
      console.log(`🎫 Testing token: ${testToken.substring(0, 8)}...`);
      
      const payload = { 
        token: testToken.trim(),
        email: "test@example.com"
      };
      
      console.log("📡 Calling set-invitation-token with payload:", {
        ...payload,
        token: payload.token.substring(0, 8) + "..."
      });
      
      const { data, error } = await supabase.functions.invoke('set-invitation-token', {
        body: JSON.stringify(payload)
      });
      
      if (error) {
        console.error("❌ Token validation failed:", error);
        setValidationResult(`❌ FAILED: ${error.message}`);
        toast({
          title: "Token Validation Failed",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      console.log("✅ Token validation result:", data);
      
      if (data?.valid) {
        setValidationResult("✅ SUCCESS: Token is valid and proposal found");
        toast({
          title: "Token Valid",
          description: "Token is valid and proposal was found",
        });
      } else {
        setValidationResult(`❌ INVALID: ${data?.error || "Token is not valid"}`);
        toast({
          title: "Token Invalid",
          description: data?.error || "Token is not valid",
          variant: "destructive"
        });
      }
      
    } catch (error: any) {
      console.error("❌ Token validation failed:", error);
      setValidationResult(`❌ FAILED: ${error.message}`);
      toast({
        title: "Token Validation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsTestingValidation(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Edge Function Deployment Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleDeploymentVerification}
            disabled={isTestingDeployment}
            className="w-full"
          >
            {isTestingDeployment ? "Testing Deployment..." : "Test Function Deployment"}
          </Button>
          
          {deploymentResult && (
            <Alert className={deploymentResult.includes("SUCCESS") ? "border-green-500" : "border-red-500"}>
              <AlertDescription>{deploymentResult}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Token Validation Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Enter invitation token to test"
            value={testToken}
            onChange={(e) => setTestToken(e.target.value)}
          />
          
          <Button 
            onClick={handleTokenValidation}
            disabled={isTestingValidation || !testToken.trim()}
            className="w-full"
          >
            {isTestingValidation ? "Validating Token..." : "Validate Token"}
          </Button>
          
          {validationResult && (
            <Alert className={validationResult.includes("SUCCESS") ? "border-green-500" : "border-red-500"}>
              <AlertDescription>{validationResult}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
