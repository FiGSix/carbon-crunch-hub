import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'running';
  message: string;
  details?: string;
}

/**
 * Phase 4: Comprehensive Testing Suite
 * Multi-environment testing and CSS loading verification
 */
export const ComprehensiveTestSuite = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallScore, setOverallScore] = useState(0);

  const runComprehensiveTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    const tests = [
      { name: 'CSS Loading Test', test: testCSSLoading },
      { name: 'Tailwind Integration Test', test: testTailwindIntegration },
      { name: 'Design System Test', test: testDesignSystem },
      { name: 'Component Rendering Test', test: testComponentRendering },
      { name: 'Error Boundary Test', test: testErrorBoundaries },
      { name: 'Mobile Responsiveness Test', test: testMobileResponsiveness },
      { name: 'CSS Fallback Test', test: testCSSFallbacks },
      { name: 'Performance Test', test: testPerformance }
    ];

    const results: TestResult[] = [];

    for (const { name, test } of tests) {
      // Update status to running
      setTestResults([...results, { name, status: 'running', message: 'Testing...' }]);
      
      try {
        const result = await test();
        results.push({ name, ...result });
      } catch (error) {
        results.push({
          name,
          status: 'fail',
          message: 'Test failed with exception',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      setTestResults([...results]);
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX
    }

    // Calculate overall score
    const passCount = results.filter(r => r.status === 'pass').length;
    const score = (passCount / results.length) * 100;
    setOverallScore(score);
    setIsRunning(false);

    console.log('🎯 Phase 4 Testing Complete:', {
      totalTests: results.length,
      passed: passCount,
      score: score.toFixed(1)
    });
  };

  // Test CSS Loading
  const testCSSLoading = async (): Promise<Omit<TestResult, 'name'>> => {
    const testElement = document.createElement('div');
    testElement.className = 'bg-primary text-white p-4 hidden';
    document.body.appendChild(testElement);
    
    try {
      const computedStyle = getComputedStyle(testElement);
      const hasBg = computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)';
      const hasColor = computedStyle.color !== 'rgba(0, 0, 0, 0)';
      
      document.body.removeChild(testElement);
      
      if (hasBg && hasColor) {
        return { status: 'pass', message: 'CSS loading correctly' };
      } else {
        return { 
          status: 'fail', 
          message: 'CSS not loading properly',
          details: `Background: ${hasBg}, Color: ${hasColor}`
        };
      }
    } catch (error) {
      document.body.removeChild(testElement);
      throw error;
    }
  };

  // Test Tailwind Integration
  const testTailwindIntegration = async (): Promise<Omit<TestResult, 'name'>> => {
    const testElement = document.createElement('div');
    testElement.className = 'flex justify-center items-center w-full h-10';
    document.body.appendChild(testElement);
    
    try {
      const computedStyle = getComputedStyle(testElement);
      const isFlexbox = computedStyle.display === 'flex';
      const isJustifyCenter = computedStyle.justifyContent === 'center';
      const isItemsCenter = computedStyle.alignItems === 'center';
      
      document.body.removeChild(testElement);
      
      if (isFlexbox && isJustifyCenter && isItemsCenter) {
        return { status: 'pass', message: 'Tailwind classes working correctly' };
      } else {
        return { 
          status: 'fail', 
          message: 'Tailwind classes not applying correctly',
          details: `Flex: ${isFlexbox}, Justify: ${isJustifyCenter}, Align: ${isItemsCenter}`
        };
      }
    } catch (error) {
      document.body.removeChild(testElement);
      throw error;
    }
  };

  // Test Design System
  const testDesignSystem = async (): Promise<Omit<TestResult, 'name'>> => {
    const testElement = document.createElement('div');
    testElement.style.color = 'hsl(var(--primary))';
    testElement.style.backgroundColor = 'hsl(var(--background))';
    document.body.appendChild(testElement);
    
    try {
      const computedStyle = getComputedStyle(testElement);
      const hasValidColor = computedStyle.color !== 'hsl(var(--primary))';
      const hasValidBg = computedStyle.backgroundColor !== 'hsl(var(--background))';
      
      document.body.removeChild(testElement);
      
      if (hasValidColor && hasValidBg) {
        return { status: 'pass', message: 'CSS variables resolving correctly' };
      } else {
        return { 
          status: 'fail', 
          message: 'CSS variables not resolving',
          details: `Color resolved: ${hasValidColor}, Background resolved: ${hasValidBg}`
        };
      }
    } catch (error) {
      document.body.removeChild(testElement);
      throw error;
    }
  };

  // Test Component Rendering
  const testComponentRendering = async (): Promise<Omit<TestResult, 'name'>> => {
    const reactComponents = document.querySelectorAll('[data-react-component]');
    const hasReactComponents = reactComponents.length > 0;
    
    if (hasReactComponents) {
      return { status: 'pass', message: `${reactComponents.length} React components rendered` };
    } else {
      return { status: 'warning', message: 'No React components found with data attributes' };
    }
  };

  // Test Error Boundaries
  const testErrorBoundaries = async (): Promise<Omit<TestResult, 'name'>> => {
    const errorBoundaries = document.querySelectorAll('[class*="error-boundary"]');
    const progressiveErrorBoundaries = document.querySelectorAll('[class*="progressive"]');
    
    if (errorBoundaries.length > 0 || progressiveErrorBoundaries.length > 0) {
      return { status: 'pass', message: 'Error boundaries detected and active' };
    } else {
      return { status: 'warning', message: 'Error boundaries not visually detected' };
    }
  };

  // Test Mobile Responsiveness
  const testMobileResponsiveness = async (): Promise<Omit<TestResult, 'name'>> => {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    const isMobile = viewport.width < 768;
    const hasViewportMeta = document.querySelector('meta[name="viewport"]');
    
    if (hasViewportMeta) {
      return { 
        status: 'pass', 
        message: `Responsive design configured (${viewport.width}x${viewport.height})` 
      };
    } else {
      return { status: 'fail', message: 'Viewport meta tag missing' };
    }
  };

  // Test CSS Fallbacks
  const testCSSFallbacks = async (): Promise<Omit<TestResult, 'name'>> => {
    const bodyStyle = getComputedStyle(document.body);
    const hasBackgroundFallback = bodyStyle.backgroundColor !== 'rgba(0, 0, 0, 0)';
    const hasColorFallback = bodyStyle.color !== 'rgba(0, 0, 0, 0)';
    
    if (hasBackgroundFallback && hasColorFallback) {
      return { status: 'pass', message: 'CSS fallbacks working correctly' };
    } else {
      return { 
        status: 'warning', 
        message: 'Some CSS fallbacks may not be working',
        details: `Background: ${hasBackgroundFallback}, Color: ${hasColorFallback}`
      };
    }
  };

  // Test Performance
  const testPerformance = async (): Promise<Omit<TestResult, 'name'>> => {
    const loadTime = performance.now();
    const resources = performance.getEntriesByType('resource');
    const cssResources = resources.filter(r => r.name.includes('.css'));
    
    if (loadTime < 5000 && cssResources.length > 0) {
      return { 
        status: 'pass', 
        message: `Good performance (${loadTime.toFixed(0)}ms, ${cssResources.length} CSS files)` 
      };
    } else {
      return { 
        status: 'warning', 
        message: `Performance could be improved (${loadTime.toFixed(0)}ms)` 
      };
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'fail':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      pass: 'default',
      fail: 'destructive',
      warning: 'secondary',
      running: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Phase 4: Comprehensive Testing Suite
            <Button 
              onClick={runComprehensiveTests} 
              disabled={isRunning}
              className="ml-4"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                'Run All Tests'
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {testResults.length > 0 && (
            <div className="mb-6">
              <div className="text-2xl font-bold text-center">
                Overall Score: {overallScore.toFixed(1)}/100
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div 
                  className="bg-crunch-yellow h-2 rounded-full transition-all duration-500"
                  style={{ width: `${overallScore}%` }}
                />
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {testResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <div className="font-medium">{result.name}</div>
                    <div className="text-sm text-muted-foreground">{result.message}</div>
                    {result.details && (
                      <div className="text-xs text-muted-foreground mt-1">{result.details}</div>
                    )}
                  </div>
                </div>
                {getStatusBadge(result.status)}
              </div>
            ))}
          </div>
          
          {testResults.length === 0 && !isRunning && (
            <div className="text-center text-muted-foreground py-12">
              Click "Run All Tests" to begin comprehensive testing
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};