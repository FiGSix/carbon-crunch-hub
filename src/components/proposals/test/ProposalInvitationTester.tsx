
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProposalInvitations } from "../hooks/useProposalInvitations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyInvitationSent, testInvitationToken, testTokenLinkAccess } from "@/utils/testUtils";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface TestResult {
  name: string;
  success: boolean;
  message: string;
}

export function ProposalInvitationTester() {
  const [proposalId, setProposalId] = useState<string>("");
  const [testToken, setTestToken] = useState<string>("");
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const { handleSendInvitation, sending } = useProposalInvitations();

  const runSendTest = async () => {
    if (!proposalId) return;
    
    setIsRunning(true);
    setResults([]);
    
    try {
      // First, send the invitation
      await handleSendInvitation(proposalId);
      
      // Add initial result
      setResults(prev => [...prev, {
        name: "Invitation Sending",
        success: true,
        message: "Invitation send request completed without throwing exceptions"
      }]);
      
      // Then verify it was properly recorded
      const verificationResult = await verifyInvitationSent(proposalId);
      
      setResults(prev => [...prev, {
        name: "Database Verification",
        success: verificationResult.success,
        message: verificationResult.success 
          ? "Invitation data correctly stored in database" 
          : `Failed: ${verificationResult.error}`
      }]);
    } catch (error) {
      setResults(prev => [...prev, {
        name: "Test Execution",
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }]);
    } finally {
      setIsRunning(false);
    }
  };
  
  const runTokenTest = async () => {
    if (!testToken) return;
    
    setIsRunning(true);
    setResults([]);
    
    try {
      // Test 1: Validate token
      const tokenResult = await testInvitationToken(testToken);
      
      setResults(prev => [...prev, {
        name: "Token Validation",
        success: tokenResult.valid,
        message: tokenResult.valid 
          ? `Valid token for proposal: ${tokenResult.proposalId}` 
          : "Invalid or expired token"
      }]);
      
      // Test 2: Test link access
      const accessResult = await testTokenLinkAccess(testToken);
      
      setResults(prev => [...prev, {
        name: "Proposal Access",
        success: accessResult.accessible,
        message: accessResult.accessible 
          ? "Successfully accessed proposal data using token" 
          : `Access failed: ${accessResult.error}`
      }]);
    } catch (error) {
      setResults(prev => [...prev, {
        name: "Test Execution",
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }]);
    } finally {
      setIsRunning(false);
    }
  };
  
  return (
    <Card className="retro-card mb-8">
      <CardHeader>
        <CardTitle>Proposal Invitation Testing Tool</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Test Sending Invitation</h3>
            <div className="grid gap-2">
              <Label htmlFor="proposalId">Proposal ID</Label>
              <Input 
                id="proposalId" 
                value={proposalId} 
                onChange={(e) => setProposalId(e.target.value)} 
                placeholder="Enter proposal ID to test"
              />
            </div>
            <Button 
              onClick={runSendTest} 
              disabled={!proposalId || isRunning || sending}
            >
              {isRunning || sending ? "Testing..." : "Test Send Invitation"}
            </Button>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Test Token Validation</h3>
            <div className="grid gap-2">
              <Label htmlFor="testToken">Invitation Token</Label>
              <Input 
                id="testToken" 
                value={testToken} 
                onChange={(e) => setTestToken(e.target.value)} 
                placeholder="Enter token to validate"
              />
            </div>
            <Button 
              onClick={runTokenTest} 
              disabled={!testToken || isRunning}
              variant="outline"
            >
              {isRunning ? "Testing..." : "Test Token"}
            </Button>
          </div>
          
          {results.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-medium">Test Results</h3>
              <div className="border rounded-md p-4 space-y-3">
                {results.map((result, index) => (
                  <div key={index} className={`flex items-start gap-2 p-2 rounded ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                    {result.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    )}
                    <div>
                      <div className="font-medium">{result.name}</div>
                      <div className="text-sm text-gray-600">{result.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-6 text-sm text-gray-500">
            <p>This testing tool helps validate the proposal invitation system. Use it during development to verify functionality.</p>
            <p className="mt-2"><strong>Note:</strong> For complete testing, also manually verify that emails are being received and the proposal view page loads properly when clicking the invitation link.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
