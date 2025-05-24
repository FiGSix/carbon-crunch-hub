import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInvitationToken } from '@/hooks/useInvitationToken';
import { supabase } from '@/integrations/supabase/client';

export function TokenTester() {
  const [testToken, setTestToken] = useState('');
  const [result, setResult] = useState<any>(null);
  const [connectivityResult, setConnectivityResult] = useState<boolean | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<string | null>(null);
  const [testHistory, setTestHistory] = useState<Array<{timestamp: string, token: string, result: any}>>([]);
  const { persistToken, testConnectivity, loading, error } = useInvitationToken();

  const handleConnectivityTest = async () => {
    console.log(`🩺 === CONNECTIVITY TEST STARTED ===`);
    const isHealthy = await testConnectivity();
    setConnectivityResult(isHealthy);
    console.log(`🩺 === CONNECTIVITY TEST RESULT === ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
  };

  const handleDeploymentVerification = async () => {
    console.log(`🔍 === DEPLOYMENT VERIFICATION STARTED ===`);
    setDeploymentStatus('testing');
    
    try {
      // Test direct function invocation to verify deployment
      const testPayload = { token: 'test-deployment-verification' };
      console.log(`📡 Testing function deployment with payload:`, testPayload);
      
      const { data, error: functionError } = await supabase.functions.invoke(
        'set-invitation-token',
        { 
          body: testPayload,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      if (functionError) {
        console.error(`❌ Deployment verification failed:`, functionError);
        setDeploymentStatus(`failed: ${functionError.message}`);
      } else {
        console.log(`✅ Function responded - deployment verified:`, data);
        setDeploymentStatus('verified');
      }
    } catch (error) {
      console.error(`💥 Deployment verification error:`, error);
      setDeploymentStatus(`error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTest = async () => {
    if (!testToken) return;
    
    const timestamp = new Date().toISOString();
    console.log(`🧪 === TOKEN TEST STARTED === ${timestamp}`);
    console.log('🔍 Testing token:', testToken.substring(0, 8) + '...');
    
    const result = await persistToken(testToken);
    setResult(result);
    
    // Add to test history
    setTestHistory(prev => [{
      timestamp,
      token: testToken.substring(0, 8) + '...',
      result
    }, ...prev.slice(0, 4)]); // Keep last 5 tests
    
    console.log(`🧪 === TOKEN TEST COMPLETED === ${timestamp}`, result);
  };

  const handleTestKnownToken = () => {
    // Use the token from the logs that we know exists
    setTestToken('950f0c91d41141a0b67b8e0064a6aefc5daf17dac2c44195a9c40414e91110dc');
  };

  const handleFullFlowTest = async () => {
    console.log(`🎯 === FULL FLOW TEST STARTED ===`);
    
    // Step 1: Connectivity
    console.log(`Step 1: Testing connectivity...`);
    const isHealthy = await testConnectivity();
    setConnectivityResult(isHealthy);
    
    if (!isHealthy) {
      console.error(`❌ Full flow test aborted - connectivity failed`);
      return;
    }
    
    // Step 2: Deployment verification
    console.log(`Step 2: Verifying deployment...`);
    await handleDeploymentVerification();
    
    // Step 3: Token test with known good token
    console.log(`Step 3: Testing with known token...`);
    const knownToken = '950f0c91d41141a0b67b8e0064a6aefc5daf17dac2c44195a9c40414e91110dc';
    setTestToken(knownToken);
    
    const result = await persistToken(knownToken);
    setResult(result);
    
    console.log(`🎯 === FULL FLOW TEST COMPLETED ===`, {
      connectivity: isHealthy,
      tokenResult: result
    });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🧪 Enhanced Token Tester & Deployment Verifier</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">🔧 Deployment Status Check</h3>
          <div className="flex gap-2">
            <Button 
              onClick={handleDeploymentVerification}
              disabled={loading}
              variant="secondary"
              className="flex-1"
            >
              {deploymentStatus === 'testing' ? 'Verifying...' : 'Verify Function Deployment'}
            </Button>
          </div>
          
          {deploymentStatus && (
            <Alert variant={deploymentStatus.includes('verified') ? "default" : "destructive"}>
              <AlertDescription>
                Deployment Status: {
                  deploymentStatus === 'verified' ? '✅ DEPLOYED & ACCESSIBLE' :
                  deploymentStatus === 'testing' ? '🔄 TESTING...' :
                  `❌ ${deploymentStatus.toUpperCase()}`
                }
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">🩺 Edge Function Connectivity Test</h3>
          <div className="flex gap-2">
            <Button 
              onClick={handleConnectivityTest}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              {loading ? 'Testing...' : 'Test Health Check Function'}
            </Button>
          </div>
          
          {connectivityResult !== null && (
            <Alert variant={connectivityResult ? "default" : "destructive"}>
              <AlertDescription>
                Health Check: {connectivityResult ? '✅ HEALTHY' : '❌ UNHEALTHY'}
                {!connectivityResult && ' - Edge function may not be properly deployed'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">🎯 Token Processing Test</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Enter invitation token"
              value={testToken}
              onChange={(e) => setTestToken(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleTestKnownToken}
              variant="outline"
              size="sm"
            >
              Use Known Token
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleTest} 
              disabled={loading || !testToken}
              className="flex-1"
            >
              {loading ? 'Testing...' : 'Test Token Processing'}
            </Button>
            <Button 
              onClick={handleFullFlowTest} 
              disabled={loading}
              variant="secondary"
              className="flex-1"
            >
              {loading ? 'Running...' : 'Run Full Flow Test'}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Error: {error}
            </AlertDescription>
          </Alert>
        )}
        
        {result && (
          <div className="space-y-2">
            <h4 className="font-semibold">Latest Test Result:</h4>
            <div className="p-3 bg-gray-100 rounded text-sm">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>
        )}

        {testHistory.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold">Test History:</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {testHistory.map((test, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                  <div className="font-mono text-gray-600 mb-1">
                    {test.timestamp} - Token: {test.token}
                  </div>
                  <div className={`p-1 rounded ${test.result.success ? 'bg-green-100' : 'bg-red-100'}`}>
                    Success: {test.result.success ? '✅' : '❌'} | 
                    Valid: {test.result.valid ? '✅' : '❌'}
                    {test.result.error && ` | Error: ${test.result.error}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Alert>
          <AlertDescription>
            💡 <strong>Deployment Verification Guide:</strong><br/>
            • Use "Verify Function Deployment" to confirm the function is accessible<br/>
            • Run "Test Health Check Function" to verify edge function infrastructure<br/>
            • "Run Full Flow Test" executes all verification steps sequentially<br/>
            • Check browser console for detailed execution logs from the deployed function<br/>
            • If deployment verification fails, the function needs redeployment
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
