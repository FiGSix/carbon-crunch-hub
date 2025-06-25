
/**
 * Integration testing tool for end-to-end functionality verification
 * Tests complete user workflows and system integration
 */

interface IntegrationTestResult {
  workflow: string;
  steps: Array<{
    stepName: string;
    passed: boolean;
    duration: number;
    error?: string;
  }>;
  overallPassed: boolean;
  totalDuration: number;
}

class IntegrationTester {
  private results: IntegrationTestResult[] = [];
  
  async runIntegrationTests(): Promise<IntegrationTestResult[]> {
    console.log('🔄 Starting integration tests...');
    
    // Test complete user workflows
    await this.testCarbonCalculationWorkflow();
    await this.testProposalCreationWorkflow();
    await this.testUserAuthenticationWorkflow();
    await this.testDataPersistenceWorkflow();
    
    return this.results;
  }
  
  private async runWorkflowTest(
    workflowName: string,
    steps: Array<{ name: string; testFn: () => Promise<void> }>
  ): Promise<void> {
    const workflowStart = performance.now();
    const stepResults: Array<{
      stepName: string;
      passed: boolean;
      duration: number;
      error?: string;
    }> = [];
    
    let workflowPassed = true;
    
    for (const step of steps) {
      const stepStart = performance.now();
      
      try {
        await step.testFn();
        const stepDuration = performance.now() - stepStart;
        
        stepResults.push({
          stepName: step.name,
          passed: true,
          duration: stepDuration
        });
        
        console.log(`  ✅ ${step.name} (${stepDuration.toFixed(2)}ms)`);
      } catch (error) {
        const stepDuration = performance.now() - stepStart;
        workflowPassed = false;
        
        stepResults.push({
          stepName: step.name,
          passed: false,
          duration: stepDuration,
          error: error instanceof Error ? error.message : String(error)
        });
        
        console.error(`  ❌ ${step.name} - ${error}`);
      }
    }
    
    const totalDuration = performance.now() - workflowStart;
    
    this.results.push({
      workflow: workflowName,
      steps: stepResults,
      overallPassed: workflowPassed,
      totalDuration
    });
    
    const status = workflowPassed ? '✅' : '❌';
    console.log(`${status} ${workflowName} workflow (${totalDuration.toFixed(2)}ms)`);
  }
  
  private async testCarbonCalculationWorkflow(): Promise<void> {
    await this.runWorkflowTest('Carbon Calculation', [
      {
        name: 'Import calculation service',
        testFn: async () => {
          const { UnifiedCarbonService } = await import('@/services/calculations/UnifiedCarbonService');
          if (!UnifiedCarbonService) {
            throw new Error('UnifiedCarbonService not available');
          }
        }
      },
      {
        name: 'Normalize system size',
        testFn: async () => {
          const { UnifiedCarbonService } = await import('@/services/calculations/UnifiedCarbonService');
          const normalized = UnifiedCarbonService.normalizeToKWp('100kWp');
          if (normalized !== 100) {
            throw new Error(`Expected 100, got ${normalized}`);
          }
        }
      },
      {
        name: 'Calculate annual energy',
        testFn: async () => {
          const { UnifiedCarbonService } = await import('@/services/calculations/UnifiedCarbonService');
          const energy = UnifiedCarbonService.calculateAnnualEnergy(100);
          if (energy <= 0) {
            throw new Error(`Invalid energy calculation: ${energy}`);
          }
        }
      },
      {
        name: 'Calculate carbon credits',
        testFn: async () => {
          const { UnifiedCarbonService } = await import('@/services/calculations/UnifiedCarbonService');
          const credits = UnifiedCarbonService.calculateCarbonCredits(100);
          if (credits <= 0) {
            throw new Error(`Invalid carbon credits: ${credits}`);
          }
        }
      },
      {
        name: 'Complete calculation with portfolio',
        testFn: async () => {
          const { UnifiedCarbonService } = await import('@/services/calculations/UnifiedCarbonService');
          const result = await UnifiedCarbonService.calculateComplete({
            sizeKwp: 100,
            commissionDate: '2024-01-01'
          }, 500);
          
          if (!result.annualEnergy || !result.carbonCredits || !result.revenueByYear) {
            throw new Error('Incomplete calculation result');
          }
          
          const totalRevenue = Object.values(result.revenueByYear).reduce((sum, val) => sum + val, 0);
          if (totalRevenue <= 0) {
            throw new Error('Invalid revenue calculation');
          }
        }
      }
    ]);
  }
  
  private async testProposalCreationWorkflow(): Promise<void> {
    await this.runWorkflowTest('Proposal Creation', [
      {
        name: 'Load calculation services',
        testFn: async () => {
          const { calculateResults } = await import('@/lib/calculations/carbon/index');
          if (!calculateResults) {
            throw new Error('calculateResults function not available');
          }
        }
      },
      {
        name: 'Generate proposal data',
        testFn: async () => {
          const { calculateResults } = await import('@/lib/calculations/carbon/index');
          const commissionDate = new Date('2024-01-01');
          const results = calculateResults(100, commissionDate);
          
          if (!results.annualGeneration || !results.carbonCredits || !results.yearsData) {
            throw new Error('Invalid proposal calculation results');
          }
          
          if (results.yearsData.length === 0) {
            throw new Error('No years data generated');
          }
        }
      },
      {
        name: 'Validate revenue distribution',
        testFn: async () => {
          const { UnifiedCarbonService } = await import('@/services/calculations/UnifiedCarbonService');
          
          const clientShare = UnifiedCarbonService.getClientSharePercentage(100, 500);
          const agentCommission = UnifiedCarbonService.getAgentCommissionPercentage(500);
          
          if (clientShare < 50 || clientShare > 100) {
            throw new Error(`Invalid client share: ${clientShare}%`);
          }
          
          if (agentCommission < 0 || agentCommission > 50) {
            throw new Error(`Invalid agent commission: ${agentCommission}%`);
          }
        }
      }
    ]);
  }
  
  private async testUserAuthenticationWorkflow(): Promise<void> {
    await this.runWorkflowTest('User Authentication', [
      {
        name: 'Load authentication utilities',
        testFn: async () => {
          const { RoleValidator } = await import('@/services/unified/utils/RoleValidator');
          if (!RoleValidator) {
            throw new Error('RoleValidator not available');
          }
        }
      },
      {
        name: 'Test role validation',
        testFn: async () => {
          const { RoleValidator } = await import('@/services/unified/utils/RoleValidator');
          
          if (!RoleValidator.isAdmin('admin')) {
            throw new Error('Admin role validation failed');
          }
          
          if (!RoleValidator.isAgent('agent')) {
            throw new Error('Agent role validation failed');
          }
          
          if (RoleValidator.isAdmin('client')) {
            throw new Error('Client should not validate as admin');
          }
        }
      },
      {
        name: 'Test permission checks',
        testFn: async () => {
          const { RoleValidator } = await import('@/services/unified/utils/RoleValidator');
          
          const mockProposal = {
            agent_id: 'agent-123',
            client_id: 'client-456'
          };
          
          // Admin should access all proposals
          if (!RoleValidator.canAccessProposal('admin', 'any-user', mockProposal)) {
            throw new Error('Admin access validation failed');
          }
          
          // Agent should access own proposals
          if (!RoleValidator.canAccessProposal('agent', 'agent-123', mockProposal)) {
            throw new Error('Agent self-access validation failed');
          }
          
          // Agent should not access others' proposals
          if (RoleValidator.canAccessProposal('agent', 'different-agent', mockProposal)) {
            throw new Error('Agent cross-access validation failed');
          }
        }
      }
    ]);
  }
  
  private async testDataPersistenceWorkflow(): Promise<void> {
    await this.runWorkflowTest('Data Persistence', [
      {
        name: 'Test cache functionality',
        testFn: async () => {
          const { CacheManager } = await import('@/services/unified/cache/CacheManager');
          
          const testKey = 'integration-test-key';
          const testData = { test: true, timestamp: Date.now() };
          
          // Set data
          CacheManager.setCache(testKey, testData);
          
          // Retrieve data
          const retrieved = CacheManager.getFromCache(testKey);
          
          if (!retrieved || retrieved.test !== true) {
            throw new Error('Cache set/get failed');
          }
        }
      },
      {
        name: 'Test cache statistics',
        testFn: async () => {
          const { CacheManager } = await import('@/services/unified/cache/CacheManager');
          
          const stats = CacheManager.getStats();
          
          if (typeof stats.size !== 'number' || typeof stats.hitCount !== 'number') {
            throw new Error('Invalid cache statistics');
          }
        }
      },
      {
        name: 'Test optimized cache',
        testFn: async () => {
          const { optimizedCache } = await import('@/services/cache/OptimizedCacheService');
          
          const testKey = 'optimized-test-key';
          const testData = { optimized: true };
          
          optimizedCache.set(testKey, testData);
          const retrieved = optimizedCache.get(testKey);
          
          if (!retrieved || !retrieved.optimized) {
            throw new Error('Optimized cache failed');
          }
        }
      }
    ]);
  }
  
  generateIntegrationReport(): string {
    const totalWorkflows = this.results.length;
    const passedWorkflows = this.results.filter(r => r.overallPassed).length;
    const failedWorkflows = this.results.filter(r => !r.overallPassed).length;
    
    let report = `
🔄 INTEGRATION TEST REPORT
═════════════════════════

📊 SUMMARY
├─ Total Workflows: ${totalWorkflows}
├─ Passed: ${passedWorkflows}
├─ Failed: ${failedWorkflows}
└─ Success Rate: ${((passedWorkflows/totalWorkflows)*100).toFixed(1)}%

📋 WORKFLOW RESULTS
`;

    this.results.forEach(result => {
      const status = result.overallPassed ? '✅' : '❌';
      const totalSteps = result.steps.length;
      const passedSteps = result.steps.filter(s => s.passed).length;
      
      report += `
${status} ${result.workflow} (${result.totalDuration.toFixed(2)}ms)
├─ Steps: ${passedSteps}/${totalSteps}
`;
      
      result.steps.forEach(step => {
        const stepStatus = step.passed ? '✅' : '❌';
        report += `├─ ${stepStatus} ${step.stepName} (${step.duration.toFixed(2)}ms)\n`;
        
        if (!step.passed && step.error) {
          report += `│  └─ Error: ${step.error}\n`;
        }
      });
    });

    if (failedWorkflows > 0) {
      report += `
⚠️ FAILED WORKFLOWS ANALYSIS
`;
      this.results.filter(r => !r.overallPassed).forEach(result => {
        const failedSteps = result.steps.filter(s => !s.passed);
        report += `
${result.workflow}:
├─ Failed steps: ${failedSteps.length}
`;
        failedSteps.forEach(step => {
          report += `├─ ${step.stepName}: ${step.error}\n`;
        });
      });
    }

    return report;
  }
}

export const integrationTester = new IntegrationTester();
