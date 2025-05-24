
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInvitationToken } from '@/hooks/useInvitationToken';

export function TokenTester() {
  const [testToken, setTestToken] = useState('');
  const [result, setResult] = useState<any>(null);
  const { persistToken, loading } = useInvitationToken();

  const handleTest = async () => {
    if (!testToken) return;
    
    console.log('Testing token:', testToken.substring(0, 8) + '...');
    const result = await persistToken(testToken);
    setResult(result);
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Token Tester</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Enter invitation token"
          value={testToken}
          onChange={(e) => setTestToken(e.target.value)}
        />
        <Button 
          onClick={handleTest} 
          disabled={loading || !testToken}
          className="w-full"
        >
          {loading ? 'Testing...' : 'Test Token'}
        </Button>
        
        {result && (
          <div className="mt-4 p-3 bg-gray-100 rounded">
            <pre className="text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
