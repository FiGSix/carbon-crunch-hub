import React from 'react';
import { ComprehensiveTestSuite } from '@/components/testing/ComprehensiveTestSuite';
import { CSSFailureSimulator } from '@/components/testing/CSSFailureSimulator';
import { DisplayDiagnostics } from '@/components/diagnostics/DisplayDiagnostics';
import { CSSFallbackDiagnostics } from '@/components/diagnostics/CSSFallbackDiagnostics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Phase 4: Comprehensive Testing Page
 * Multi-environment testing and failure simulation
 */
const TestingSuite = () => {
  console.log("[TestingSuite] Loading comprehensive testing suite");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Phase 4: Comprehensive Testing Suite
          </h1>
          <p className="text-xl text-muted-foreground">
            Multi-environment testing and CSS failure resilience verification
          </p>
        </div>

        <Tabs defaultValue="comprehensive" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="comprehensive">Comprehensive Tests</TabsTrigger>
            <TabsTrigger value="failure-sim">Failure Simulation</TabsTrigger>
            <TabsTrigger value="diagnostics">Live Diagnostics</TabsTrigger>
            <TabsTrigger value="css-diagnostics">CSS Diagnostics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="comprehensive" className="mt-6">
            <ComprehensiveTestSuite />
          </TabsContent>
          
          <TabsContent value="failure-sim" className="mt-6">
            <CSSFailureSimulator />
          </TabsContent>
          
          <TabsContent value="diagnostics" className="mt-6">
            <div className="max-w-4xl mx-auto">
              <DisplayDiagnostics />
            </div>
          </TabsContent>
          
          <TabsContent value="css-diagnostics" className="mt-6">
            <div className="max-w-4xl mx-auto">
              <CSSFallbackDiagnostics />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TestingSuite;