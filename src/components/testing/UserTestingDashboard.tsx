import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Play, 
  Download,
  Bug,
  Shield,
  Zap,
  Eye,
  Users
} from "lucide-react";
import { ComprehensiveUserTesting } from '@/testing/ComprehensiveUserTesting';

interface UserTestingDashboardProps {
  className?: string;
}

export function UserTestingDashboard({ className }: UserTestingDashboardProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [currentTest, setCurrentTest] = useState('');
  
  const tester = new ComprehensiveUserTesting();
  
  const runTests = async () => {
    setIsRunning(true);
    setProgress(0);
    setCurrentTest('Initializing tests...');
    
    try {
      // Simulate progress updates
      const progressSteps = [
        'Testing user journeys...',
        'Checking cross-browser compatibility...',
        'Validating responsive design...',
        'Analyzing performance...',
        'Evaluating usability...',
        'Testing error handling...',
        'Checking security...',
        'Validating accessibility...',
        'Testing integrations...',
        'Generating report...'
      ];
      
      for (let i = 0; i < progressSteps.length; i++) {
        setCurrentTest(progressSteps[i]);
        setProgress((i / progressSteps.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const testReport = await tester.runAllTests();
      setReport(testReport);
      setProgress(100);
      setCurrentTest('Testing complete!');
    } catch (error) {
      console.error('Testing failed:', error);
      setCurrentTest('Testing failed');
    } finally {
      setIsRunning(false);
    }
  };
  
  const downloadReport = () => {
    if (!report) return;
    
    const reportData = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      ...report
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `user-testing-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Testing Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive testing suite mimicking real-world user interactions
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isRunning ? 'Running Tests...' : 'Run Tests'}
          </Button>
          {report && (
            <Button 
              variant="outline" 
              onClick={downloadReport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Report
            </Button>
          )}
        </div>
      </div>
      
      {/* Testing Progress */}
      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{currentTest}</span>
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Test Results */}
      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.totalTests}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Passed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{report.summary.passed}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{report.summary.failed}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Warnings</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{report.summary.warnings}</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Detailed Results */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="bugs" className="flex items-center gap-1">
                <Bug className="h-3 w-3" />
                Bugs ({report.bugs.length})
              </TabsTrigger>
              <TabsTrigger value="usability" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                UX ({report.usabilityIssues.length})
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Performance ({report.performanceIssues.length})
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Security ({report.securityIssues.length})
              </TabsTrigger>
              <TabsTrigger value="accessibility" className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                A11y ({report.accessibilityIssues.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4">
                {report.results.map((result: any, index: number) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          <CardTitle className="text-base">{result.testName}</CardTitle>
                          <Badge variant={getSeverityColor(result.severity)}>
                            {result.severity}
                          </Badge>
                        </div>
                        <Badge variant="outline">{result.category}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground mb-3">
                        {result.message}
                      </p>
                      {result.recommendations && result.recommendations.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium">Recommendations:</h5>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {result.recommendations.map((rec: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="bugs" className="space-y-4">
              {report.bugs.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>No bugs found!</AlertTitle>
                  <AlertDescription>
                    All tests passed without detecting any critical issues.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {report.bugs.map((bug: any, index: number) => (
                    <Alert key={index} variant="destructive">
                      <Bug className="h-4 w-4" />
                      <AlertTitle>{bug.testName}</AlertTitle>
                      <AlertDescription className="mt-2">
                        <p>{bug.message}</p>
                        {bug.recommendations && (
                          <ul className="mt-2 space-y-1">
                            {bug.recommendations.map((rec: string, i: number) => (
                              <li key={i}>• {rec}</li>
                            ))}
                          </ul>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="usability" className="space-y-4">
              {report.usabilityIssues.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Great usability!</AlertTitle>
                  <AlertDescription>
                    No significant usability issues detected.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {report.usabilityIssues.map((issue: any, index: number) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <CardTitle className="text-base">{issue.testName}</CardTitle>
                          <Badge variant={getSeverityColor(issue.severity)}>
                            {issue.severity}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          {issue.message}
                        </p>
                        {issue.recommendations && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium">Improvements:</h5>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {issue.recommendations.map((rec: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-primary">•</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="performance" className="space-y-4">
              {report.performanceIssues.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Excellent performance!</AlertTitle>
                  <AlertDescription>
                    No performance issues detected.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {report.performanceIssues.map((issue: any, index: number) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          <CardTitle className="text-base">{issue.testName}</CardTitle>
                          <Badge variant={getSeverityColor(issue.severity)}>
                            {issue.severity}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          {issue.message}
                        </p>
                        {issue.recommendations && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium">Optimizations:</h5>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {issue.recommendations.map((rec: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-primary">•</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="security" className="space-y-4">
              {report.securityIssues.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Secure application!</AlertTitle>
                  <AlertDescription>
                    No security vulnerabilities detected.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {report.securityIssues.map((issue: any, index: number) => (
                    <Alert key={index} variant="destructive">
                      <Shield className="h-4 w-4" />
                      <AlertTitle>{issue.testName}</AlertTitle>
                      <AlertDescription className="mt-2">
                        <p>{issue.message}</p>
                        {issue.recommendations && (
                          <ul className="mt-2 space-y-1">
                            {issue.recommendations.map((rec: string, i: number) => (
                              <li key={i}>• {rec}</li>
                            ))}
                          </ul>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="accessibility" className="space-y-4">
              {report.accessibilityIssues.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Accessible design!</AlertTitle>
                  <AlertDescription>
                    No accessibility issues detected.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {report.accessibilityIssues.map((issue: any, index: number) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          <CardTitle className="text-base">{issue.testName}</CardTitle>
                          <Badge variant={getSeverityColor(issue.severity)}>
                            {issue.severity}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          {issue.message}
                        </p>
                        {issue.recommendations && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium">Accessibility Improvements:</h5>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {issue.recommendations.map((rec: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-primary">•</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}