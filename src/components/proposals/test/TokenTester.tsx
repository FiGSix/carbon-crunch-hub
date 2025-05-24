
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInvitationToken } from '@/hooks/useInvitationToken';

export function TokenTester() {
  const [testToken, setTestToken] = useState('');
  const [result, setResult] = useState<any>(null);
  const [connectivityResult, setConnectivityResult] = useState<boolean | null>(null);
  const [testHistory, setTestHistory] = useState<Array<{timestamp: string, token: string, result: any}>>([]);
  const { persistToken, testConnectivity, loading, error } = useInvitationToken();

  const handleConnectivityTest = async () => {
    console.log(`🩺 === CONNECTIVITY TEST STARTED ===`);
    const isHealthy = await testConnectivity();
    setConnectivityResult(isHealthy);
    console.log(`🩺 === CONNECTIVITY TEST RESULT === ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
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

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🧪 Token Tester & Function Diagnostics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Edge Function Connectivity Test</h3>
          <div className="flex gap-2">
            <Button 
              onClick={handleConnectivityTest}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              {loading ? 'Testing...' : 'Test Function Connectivity'}
            </Button>
          </div>
          
          {connectivityResult !== null && (
            <Alert variant={connectivityResult ? "default" : "destructive"}>
              <AlertDescription>
                Function connectivity: {connectivityResult ? '✅ HEALTHY' : '❌ UNHEALTHY'}
                {!connectivityResult && ' - Edge function may not be properly deployed'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Test Token Processing</h3>
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
              {loading ? 'Testing...' : 'Test Token'}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Hook Error: {error}
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
            💡 <strong>Deployment Validation Tips:</strong><br/>
            • First run connectivity test to verify edge function deployment<br/>
            • Check browser console for detailed request/response logs<br/>
            • "Use Known Token" button uses a valid token from email logs<br/>
            • If connectivity fails, the edge function needs redeployment
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
