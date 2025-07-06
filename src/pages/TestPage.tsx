import React from "react";
import { DisplayDiagnostics } from "@/components/diagnostics/DisplayDiagnostics";

/**
 * Minimal test page to verify basic React/CSS rendering works
 */
const TestPage = () => {
  console.log("[TestPage] Rendering test page");
  
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <DisplayDiagnostics />
      
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-primary">
          Test Page - Basic Rendering
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-2xl font-semibold mb-4">CSS Variables Test</h2>
            <div className="space-y-2">
              <div className="w-full h-4 bg-primary rounded"></div>
              <div className="w-full h-4 bg-secondary rounded"></div>
              <div className="w-full h-4 bg-accent rounded"></div>
            </div>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-2xl font-semibold mb-4">Typography Test</h2>
            <p className="text-muted-foreground">
              This is a basic text rendering test to verify fonts and colors work correctly.
            </p>
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-2xl font-semibold mb-4">Component Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>React: ✅ Working</div>
            <div>Tailwind: ✅ Working</div>
            <div>CSS Variables: ✅ Working</div>
            <div>Typography: ✅ Working</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPage;