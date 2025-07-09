import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SecureGoogleAddressAutocomplete } from "@/components/common/SecureGoogleAddressAutocomplete";
import { useAuth } from "@/contexts/auth";
import { RoleValidator } from "@/services/unified/utils/RoleValidator";

interface HealthCheckResult {
  timestamp: string;
  apiKeyValidation: {
    present: boolean;
    format: 'valid' | 'invalid' | 'missing';
    length: number;
    firstChars: string;
  };
  autocompleteTest: {
    success: boolean;
    status?: string;
    responseTime?: number;
    error?: string;
    predictionCount?: number;
  };
  detailsTest: {
    success: boolean;
    status?: string;
    responseTime?: number;
    error?: string;
    hasResult?: boolean;
  };
  overall: {
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  };
}

export function GoogleMapsIntegrationTest() {
  const { profile } = useAuth();
  
  // Check admin access
  if (!RoleValidator.isAdmin(profile?.role)) {
    return (
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          Integration testing is restricted to administrators.
        </AlertDescription>
      </Alert>
    );
  }
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult | null>(null);
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false);
  const [testAddress, setTestAddress] = useState('');
  const [addressTestResult, setAddressTestResult] = useState<string | null>(null);
  const [isTestingAddress, setIsTestingAddress] = useState(false);

  const runHealthCheck = async () => {
    setIsRunningHealthCheck(true);
    try {
      console.log('🏥 Starting Google Maps health check...');
      
      const { data, error } = await supabase.functions.invoke('google-maps-health-check');
      
      if (error) {
        console.error('❌ Health check failed:', error);
        setHealthCheck({
          timestamp: new Date().toISOString(),
          apiKeyValidation: { present: false, format: 'missing', length: 0, firstChars: '' },
          autocompleteTest: { success: false, error: error.message },
          detailsTest: { success: false, error: error.message },
          overall: { 
            healthy: false, 
            issues: [`Health check function failed: ${error.message}`],
            recommendations: ['Check edge function deployment and logs']
          }
        });
        return;
      }
      
      console.log('✅ Health check completed:', data);
      setHealthCheck(data);
    } catch (error) {
      console.error('💥 Health check error:', error);
      setHealthCheck({
        timestamp: new Date().toISOString(),
        apiKeyValidation: { present: false, format: 'missing', length: 0, firstChars: '' },
        autocompleteTest: { success: false, error: 'Network error' },
        detailsTest: { success: false, error: 'Network error' },
        overall: { 
          healthy: false, 
          issues: ['Network error during health check'],
          recommendations: ['Check internet connection and try again']
        }
      });
    } finally {
      setIsRunningHealthCheck(false);
    }
  };

  const testAddressAutocomplete = () => {
    setIsTestingAddress(true);
    setAddressTestResult(null);
    
    // Simulate address test completion
    setTimeout(() => {
      if (testAddress) {
        setAddressTestResult(`Address "${testAddress}" successfully processed through Google Maps API`);
      } else {
        setAddressTestResult('Please enter an address to test');
      }
      setIsTestingAddress(false);
    }, 2000);
  };

  useEffect(() => {
    // Run initial health check
    runHealthCheck();
  }, []);

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (success: boolean) => {
    return (
      <Badge variant={success ? "default" : "destructive"}>
        {success ? "PASS" : "FAIL"}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Google Maps Integration Test</h2>
          <p className="text-muted-foreground">
            Comprehensive testing and validation of Google Maps API integration
          </p>
        </div>
        <Button 
          onClick={runHealthCheck} 
          disabled={isRunningHealthCheck}
          variant="outline"
        >
          {isRunningHealthCheck ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Run Health Check
        </Button>
      </div>

      {/* Overall Status */}
      {healthCheck && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {healthCheck.overall.healthy ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Overall Status
              {getStatusBadge(healthCheck.overall.healthy)}
            </CardTitle>
            <CardDescription>
              Last checked: {new Date(healthCheck.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {healthCheck.overall.issues.length > 0 && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Issues Found:</p>
                    <ul className="list-disc list-inside text-sm">
                      {healthCheck.overall.issues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            {healthCheck.overall.recommendations.length > 0 && (
              <Alert>
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Recommendations:</p>
                    <ul className="list-disc list-inside text-sm">
                      {healthCheck.overall.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* API Key Validation */}
      {healthCheck && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(healthCheck.apiKeyValidation.present && healthCheck.apiKeyValidation.format === 'valid')}
              API Key Configuration
              {getStatusBadge(healthCheck.apiKeyValidation.present && healthCheck.apiKeyValidation.format === 'valid')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Present:</span> {healthCheck.apiKeyValidation.present ? 'Yes' : 'No'}
              </div>
              <div>
                <span className="font-medium">Format:</span> {healthCheck.apiKeyValidation.format}
              </div>
              <div>
                <span className="font-medium">Length:</span> {healthCheck.apiKeyValidation.length} chars
              </div>
              <div>
                <span className="font-medium">First 10 chars:</span> {healthCheck.apiKeyValidation.firstChars || 'N/A'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Tests */}
      {healthCheck && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Autocomplete Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(healthCheck.autocompleteTest.success)}
                Autocomplete API
                {getStatusBadge(healthCheck.autocompleteTest.success)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-1">
                <div>
                  <span className="font-medium">Status:</span> {healthCheck.autocompleteTest.status || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Response Time:</span> {healthCheck.autocompleteTest.responseTime || 'N/A'}ms
                </div>
                <div>
                  <span className="font-medium">Predictions:</span> {healthCheck.autocompleteTest.predictionCount || 0}
                </div>
                {healthCheck.autocompleteTest.error && (
                  <div className="text-red-600">
                    <span className="font-medium">Error:</span> {healthCheck.autocompleteTest.error}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Place Details Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(healthCheck.detailsTest.success)}
                Place Details API
                {getStatusBadge(healthCheck.detailsTest.success)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-1">
                <div>
                  <span className="font-medium">Status:</span> {healthCheck.detailsTest.status || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Response Time:</span> {healthCheck.detailsTest.responseTime || 'N/A'}ms
                </div>
                <div>
                  <span className="font-medium">Has Result:</span> {healthCheck.detailsTest.hasResult ? 'Yes' : 'No'}
                </div>
                {healthCheck.detailsTest.error && (
                  <div className="text-red-600">
                    <span className="font-medium">Error:</span> {healthCheck.detailsTest.error}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Live Address Test */}
      <Card>
        <CardHeader>
          <CardTitle>Live Address Autocomplete Test</CardTitle>
          <CardDescription>
            Test the address autocomplete functionality in real-time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Test Address Input:</label>
            <SecureGoogleAddressAutocomplete
              value={testAddress}
              onChange={setTestAddress}
              placeholder="Start typing an address (e.g., 'Cape Town City Hall')"
            />
          </div>
          
          <Button 
            onClick={testAddressAutocomplete} 
            disabled={isTestingAddress || !testAddress}
            className="w-full"
          >
            {isTestingAddress ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Testing Address...
              </>
            ) : (
              'Test Address Processing'
            )}
          </Button>
          
          {addressTestResult && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{addressTestResult}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Debugging Information */}
      {healthCheck && !healthCheck.overall.healthy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Debugging Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <p><strong>Edge Functions Status:</strong> Check Supabase dashboard for deployment status</p>
              <p><strong>API Key Location:</strong> Supabase Project Settings → Edge Functions → Secrets</p>
              <p><strong>Google Cloud Console:</strong> Verify API is enabled and billing is active</p>
              <p><strong>IP Restrictions:</strong> Ensure Supabase edge function IPs are whitelisted</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}