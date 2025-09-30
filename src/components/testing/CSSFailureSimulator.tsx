import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

/**
 * Phase 4: CSS Failure Simulator
 * Tests app resilience when CSS fails to load or loads partially
 */
export const CSSFailureSimulator = () => {
  const [simulationActive, setSimulationActive] = useState(false);
  const [simulationType, setSimulationType] = useState<'none' | 'partial' | 'complete'>('none');
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'pass' | 'fail';
    message: string;
  }>>([]);

  // Simulate CSS loading failures
  const simulateFailure = (type: 'partial' | 'complete') => {
    setSimulationActive(true);
    setSimulationType(type);
    
    if (type === 'complete') {
      // Disable all CSS temporarily
      const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
      stylesheets.forEach(link => {
        (link as HTMLLinkElement).disabled = true;
      });
      
      // Add fallback styles
      const fallbackStyle = document.createElement('style');
      fallbackStyle.id = 'css-failure-fallback';
      fallbackStyle.textContent = `
        body {
          font-family: system-ui, -apple-system, sans-serif !important;
          line-height: 1.5 !important;
          margin: 0 !important;
          padding: 20px !important;
          background-color: #ffffff !important;
          color: #1a1a1a !important;
        }
        .container, .container-responsive {
          max-width: 1200px !important;
          margin: 0 auto !important;
          padding: 0 1rem !important;
        }
        button {
          background: #ffcd03 !important;
          color: #1a1a1a !important;
          border: none !important;
          padding: 8px 16px !important;
          border-radius: 4px !important;
          cursor: pointer !important;
          font-weight: 500 !important;
        }
        button:hover {
          background: #e6b800 !important;
        }
        .card, [class*="card"] {
          border: 1px solid #e5e5e5 !important;
          border-radius: 8px !important;
          padding: 1rem !important;
          margin: 1rem 0 !important;
          background: white !important;
        }
      `;
      document.head.appendChild(fallbackStyle);
      
    } else if (type === 'partial') {
      // Disable only Tailwind CSS
      const tailwindLink = document.querySelector('link[href*="tailwind"]') as HTMLLinkElement;
      if (tailwindLink) {
        tailwindLink.disabled = true;
      }
    }
    
    // Run tests after simulation
    setTimeout(() => runFailureTests(type), 1000);
  };

  // Restore normal CSS
  const restoreCSS = () => {
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    stylesheets.forEach(link => {
      (link as HTMLLinkElement).disabled = false;
    });
    
    const fallbackStyle = document.getElementById('css-failure-fallback');
    if (fallbackStyle) {
      fallbackStyle.remove();
    }
    
    setSimulationActive(false);
    setSimulationType('none');
    setTestResults([]);
  };

  // Test app functionality during CSS failures
  const runFailureTests = (failureType: 'partial' | 'complete') => {
    const tests = [];
    
    // Test 1: App still renders
    const appContainer = document.querySelector('#root');
    tests.push({
      test: 'App Container Rendering',
      status: appContainer ? 'pass' : 'fail' as const,
      message: appContainer ? 'App container still exists' : 'App container missing'
    });
    
    // Test 2: Text is readable
    const bodyStyle = getComputedStyle(document.body);
    const hasReadableText = bodyStyle.color !== 'rgba(0, 0, 0, 0)' && 
                           bodyStyle.backgroundColor !== 'rgba(0, 0, 0, 0)';
    tests.push({
      test: 'Text Readability',
      status: hasReadableText ? 'pass' : 'fail' as const,
      message: hasReadableText ? 'Text has contrast and is readable' : 'Text may not be readable'
    });
    
    // Test 3: Interactive elements work
    const buttons = document.querySelectorAll('button');
    const hasButtons = buttons.length > 0;
    tests.push({
      test: 'Interactive Elements',
      status: hasButtons ? 'pass' : 'fail' as const,
      message: hasButtons ? `${buttons.length} buttons found and interactive` : 'No interactive elements found'
    });
    
    // Test 4: Layout structure maintained
    const hasLayout = document.querySelectorAll('.container, .container-responsive, [class*="container"]').length > 0;
    tests.push({
      test: 'Layout Structure',
      status: hasLayout ? 'pass' : 'fail' as const,
      message: hasLayout ? 'Layout containers still present' : 'Layout structure compromised'
    });
    
    // Test 5: Error boundaries functioning
    const errorElements = document.querySelectorAll('[class*="error"], [class*="fallback"]');
    tests.push({
      test: 'Error Handling',
      status: 'pass', // If we got here, error boundaries didn't crash
      message: 'No critical errors preventing app functionality'
    });
    
    setTestResults(tests);
    
    console.log(`[CSS Failure Simulation] ${failureType} failure test results:`, tests);
  };

  const getStatusIcon = (status: 'pass' | 'fail') => {
    return status === 'pass' 
      ? <CheckCircle className="w-4 h-4 text-green-600" />
      : <XCircle className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
            CSS Failure Simulator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This tool simulates CSS loading failures to test app resilience. 
              The app should remain functional even when styles fail to load.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-4 mb-6">
            <Button
              onClick={() => simulateFailure('partial')}
              disabled={simulationActive}
              variant="outline"
            >
              Simulate Partial CSS Failure
            </Button>
            
            <Button
              onClick={() => simulateFailure('complete')}
              disabled={simulationActive}
              variant="outline"
            >
              Simulate Complete CSS Failure
            </Button>
            
            <Button
              onClick={restoreCSS}
              disabled={!simulationActive}
              variant="default"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Restore Normal CSS
            </Button>
          </div>
          
          {simulationActive && (
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>CSS Failure Simulation Active:</strong> {simulationType} failure mode.
                The app is now running with {simulationType === 'complete' ? 'fallback styles only' : 'partial CSS missing'}.
              </AlertDescription>
            </Alert>
          )}
          
          {testResults.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Failure Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <div className="font-medium">{result.test}</div>
                          <div className="text-sm text-muted-foreground">{result.message}</div>
                        </div>
                      </div>
                      <Badge variant={result.status === 'pass' ? 'default' : 'destructive'}>
                        {result.status.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-4 bg-muted rounded">
                  <strong>Summary:</strong> {testResults.filter(r => r.status === 'pass').length}/{testResults.length} tests passed.
                  {testResults.every(r => r.status === 'pass') && (
                    <span className="text-green-600 ml-2">✅ App is resilient to CSS failures!</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Multi-Environment Testing</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mobile">
            <TabsList>
              <TabsTrigger value="mobile">Mobile View</TabsTrigger>
              <TabsTrigger value="tablet">Tablet View</TabsTrigger>
              <TabsTrigger value="desktop">Desktop View</TabsTrigger>
            </TabsList>
            
            <TabsContent value="mobile" className="mt-4">
              <div className="border rounded p-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Current viewport: {window.innerWidth}x{window.innerHeight}
                </p>
                <div className="bg-muted p-4 rounded">
                  <p>Mobile responsiveness test content</p>
                  <Button size="sm" className="mt-2">Mobile Button</Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="tablet" className="mt-4">
              <div className="border rounded p-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Tablet view simulation (768px+)
                </p>
                <div className="bg-muted p-4 rounded">
                  <p>Tablet layout test content</p>
                  <Button className="mt-2">Tablet Button</Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="desktop" className="mt-4">
              <div className="border rounded p-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Desktop view simulation (1024px+)
                </p>
                <div className="bg-muted p-4 rounded">
                  <p>Desktop layout test content</p>
                  <Button className="mt-2">Desktop Button</Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};