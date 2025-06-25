
/**
 * Comprehensive Test Runner for Application Verification
 * Tests all critical functionality without modifying application code
 */

import { UnifiedCarbonService } from '@/services/calculations/UnifiedCarbonService';
import { UnifiedDataService } from '@/services/unified/UnifiedDataService';
import { CacheManager } from '@/services/unified/cache/CacheManager';
import { optimizedCache } from '@/services/cache/OptimizedCacheService';
import { SecurityValidator } from '@/services/unified/utils/SecurityValidator';
import { RoleValidator } from '@/services/unified/utils/RoleValidator';

interface TestResult {
  testName: string;
  category: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

class ApplicationTestRunner {
  private results: TestResult[] = [];
  
  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting comprehensive application verification...');
    
    // Core Business Logic Tests
    await this.testCarbonCalculations();
    await this.testPortfolioCalculations();
    await this.testRevenueCalculations();
    
    // Data Service Tests
    await this.testUnifiedDataService();
    await this.testClientServices();
    
    // Cache Performance Tests
    await this.testCachePerformance();
    await this.testCacheEviction();
    
    // Security Tests
    await this.testRoleValidation();
    await this.testSecurityValidation();
    
    // Integration Tests
    await this.testServiceIntegration();
    
    // Performance Tests
    await this.testCalculationPerformance();
    
    return this.results;
  }
  
  private async runTest(
    testName: string, 
    category: string, 
    testFn: () => Promise<void>
  ): Promise<void> {
    const startTime = performance.now();
    
    try {
      await testFn();
      const duration = performance.now() - startTime;
      
      this.results.push({
        testName,
        category,
        passed: true,
        duration
      });
      
      console.log(`✅ ${testName} - ${duration.toFixed(2)}ms`);
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.results.push({
        testName,
        category,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });
      
      console.error(`❌ ${testName} - ${error}`);
    }
  }
  
  // Carbon Calculation Tests
  private async testCarbonCalculations(): Promise<void> {
    await this.runTest('System Size Normalization', 'Carbon Calculations', async () => {
      const result1 = UnifiedCarbonService.normalizeToKWp('100kWp');
      const result2 = UnifiedCarbonService.normalizeToKWp('0.1MWp');
      const result3 = UnifiedCarbonService.normalizeToKWp(100);
      
      if (result1 !== 100 || result2 !== 100 || result3 !== 100) {
        throw new Error(`Normalization failed: ${result1}, ${result2}, ${result3}`);
      }
    });
    
    await this.runTest('Annual Energy Calculation', 'Carbon Calculations', async () => {
      const energy = UnifiedCarbonService.calculateAnnualEnergy(100);
      
      if (energy <= 0 || isNaN(energy)) {
        throw new Error(`Invalid energy calculation: ${energy}`);
      }
    });
    
    await this.runTest('Carbon Credits Calculation', 'Carbon Calculations', async () => {
      const credits = UnifiedCarbonService.calculateCarbonCredits(100);
      
      if (credits <= 0 || isNaN(credits)) {
        throw new Error(`Invalid carbon credits: ${credits}`);
      }
    });
    
    await this.runTest('Complete Calculation', 'Carbon Calculations', async () => {
      const result = await UnifiedCarbonService.calculateComplete({
        sizeKwp: 100,
        commissionDate: '2024-01-01'
      });
      
      if (!result.annualEnergy || !result.carbonCredits || !result.revenueByYear) {
        throw new Error('Incomplete calculation result');
      }
    });
  }
  
  // Portfolio Calculation Tests
  private async testPortfolioCalculations(): Promise<void> {
    await this.runTest('Client Share Calculation', 'Portfolio Calculations', async () => {
      const share = UnifiedCarbonService.getClientSharePercentage(100, 500);
      
      if (share < 50 || share > 100) {
        throw new Error(`Invalid client share: ${share}%`);
      }
    });
    
    await this.runTest('Agent Commission Calculation', 'Portfolio Calculations', async () => {
      const commission = UnifiedCarbonService.getAgentCommissionPercentage(1000);
      
      if (commission < 0 || commission > 50) {
        throw new Error(`Invalid commission rate: ${commission}%`);
      }
    });
    
    await this.runTest('Portfolio Total Calculation', 'Portfolio Calculations', async () => {
      const mockProposals = [
        { system_size_kwp: 100, status: 'approved' },
        { system_size_kwp: 200, status: 'approved' },
        { system_size_kwp: 50, status: 'pending' }
      ];
      
      const totals = UnifiedCarbonService.calculatePortfolioTotals(mockProposals as any);
      
      if (totals.totalKWp !== 350 || totals.approvedKWp !== 300) {
        throw new Error(`Portfolio calculation error: ${JSON.stringify(totals)}`);
      }
    });
  }
  
  // Revenue Calculation Tests
  private async testRevenueCalculations(): Promise<void> {
    await this.runTest('Revenue Distribution', 'Revenue Calculations', async () => {
      const result = await UnifiedCarbonService.calculateComplete({
        sizeKwp: 100,
        commissionDate: '2024-01-01'
      }, 500);
      
      const totalRevenue = Object.values(result.revenueByYear).reduce((sum, val) => sum + val, 0);
      
      if (totalRevenue <= 0) {
        throw new Error(`Invalid revenue calculation: ${totalRevenue}`);
      }
    });
  }
  
  // Data Service Tests
  private async testUnifiedDataService(): Promise<void> {
    await this.runTest('Cache Key Generation', 'Data Services', async () => {
      const key1 = CacheManager.getCacheKey('test', 'param1', 'param2');
      const key2 = CacheManager.getCacheKey('test', 'param1', 'param2');
      const key3 = CacheManager.getCacheKey('test', 'param1', 'different');
      
      if (key1 !== key2 || key1 === key3) {
        throw new Error('Cache key generation inconsistent');
      }
    });
    
    await this.runTest('System Size Formatting', 'Data Services', async () => {
      const format1 = UnifiedDataService.formatSystemSize(100);
      const format2 = UnifiedDataService.formatSystemSize(1500);
      
      if (!format1.includes('100') || !format2.includes('1.5')) {
        throw new Error(`Formatting error: ${format1}, ${format2}`);
      }
    });
  }
  
  // Client Service Tests
  private async testClientServices(): Promise<void> {
    await this.runTest('Client Search Validation', 'Client Services', async () => {
      // Test empty search
      const emptyResults = await UnifiedDataService.searchClients('');
      
      if (!Array.isArray(emptyResults)) {
        throw new Error('Search should return array');
      }
    });
  }
  
  // Cache Performance Tests
  private async testCachePerformance(): Promise<void> {
    await this.runTest('Cache Set/Get Performance', 'Cache Performance', async () => {
      const testData = { test: 'data', timestamp: Date.now() };
      const key = 'perf-test-key';
      
      // Test set operation
      const setStart = performance.now();
      optimizedCache.set(key, testData);
      const setDuration = performance.now() - setStart;
      
      // Test get operation
      const getStart = performance.now();
      const retrieved = optimizedCache.get(key);
      const getDuration = performance.now() - getStart;
      
      if (!retrieved || setDuration > 10 || getDuration > 5) {
        throw new Error(`Cache performance issue: set=${setDuration}ms, get=${getDuration}ms`);
      }
    });
    
    await this.runTest('Cache Statistics', 'Cache Performance', async () => {
      const stats = optimizedCache.getStats();
      
      if (typeof stats.size !== 'number' || typeof stats.memoryUsage !== 'number') {
        throw new Error('Invalid cache statistics');
      }
    });
  }
  
  // Cache Eviction Tests
  private async testCacheEviction(): Promise<void> {
    await this.runTest('Cache Expiration', 'Cache Management', async () => {
      const key = 'expiry-test';
      optimizedCache.set(key, 'test-data', 100); // 100ms TTL
      
      // Should exist immediately
      if (!optimizedCache.get(key)) {
        throw new Error('Cache should contain data');
      }
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be expired
      if (optimizedCache.get(key)) {
        throw new Error('Cache should have expired');
      }
    });
  }
  
  // Security Tests
  private async testRoleValidation(): Promise<void> {
    await this.runTest('Role Validation Logic', 'Security', async () => {
      if (!RoleValidator.isAdmin('admin')) {
        throw new Error('Admin role validation failed');
      }
      
      if (!RoleValidator.isAgent('agent')) {
        throw new Error('Agent role validation failed');
      }
      
      if (RoleValidator.isAdmin('client')) {
        throw new Error('Client should not be admin');
      }
    });
    
    await this.runTest('Permission Checks', 'Security', async () => {
      const mockProposal = {
        agent_id: 'agent-123',
        client_id: 'client-456'
      };
      
      if (!RoleValidator.canAccessProposal('admin', 'any-user', mockProposal)) {
        throw new Error('Admin should access all proposals');
      }
      
      if (!RoleValidator.canAccessProposal('agent', 'agent-123', mockProposal)) {
        throw new Error('Agent should access own proposals');
      }
      
      if (RoleValidator.canAccessProposal('agent', 'different-agent', mockProposal)) {
        throw new Error('Agent should not access others\' proposals');
      }
    });
  }
  
  // Security Validation Tests
  private async testSecurityValidation(): Promise<void> {
    await this.runTest('Security Validator Structure', 'Security', async () => {
      if (typeof SecurityValidator.validateUserSession !== 'function') {
        throw new Error('SecurityValidator missing validateUserSession method');
      }
      
      if (typeof SecurityValidator.testRLSPolicies !== 'function') {
        throw new Error('SecurityValidator missing testRLSPolicies method');
      }
    });
  }
  
  // Service Integration Tests
  private async testServiceIntegration(): Promise<void> {
    await this.runTest('Service Cross-Communication', 'Integration', async () => {
      // Test that services can work together
      const systemSize = UnifiedCarbonService.normalizeToKWp('100kWp');
      const formatted = UnifiedDataService.formatSystemSize(systemSize);
      
      if (!formatted.includes('100')) {
        throw new Error('Service integration failed');
      }
    });
    
    await this.runTest('Cache Integration', 'Integration', async () => {
      // Clear cache
      CacheManager.clearCache();
      
      // Test cache stats
      const stats = CacheManager.getStats();
      
      if (stats.size !== 0) {
        throw new Error('Cache should be empty after clear');
      }
    });
  }
  
  // Performance Tests
  private async testCalculationPerformance(): Promise<void> {
    await this.runTest('Bulk Calculation Performance', 'Performance', async () => {
      const startTime = performance.now();
      
      // Perform multiple calculations
      for (let i = 0; i < 100; i++) {
        UnifiedCarbonService.calculateAnnualEnergy(100 + i);
        UnifiedCarbonService.calculateCarbonCredits(100 + i);
      }
      
      const duration = performance.now() - startTime;
      
      if (duration > 1000) { // Should complete in under 1 second
        throw new Error(`Calculations too slow: ${duration}ms`);
      }
    });
    
    await this.runTest('Memory Usage Stability', 'Performance', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Perform memory-intensive operations
      const largeData = [];
      for (let i = 0; i < 1000; i++) {
        largeData.push(await UnifiedCarbonService.calculateComplete({
          sizeKwp: 100,
          commissionDate: '2024-01-01'
        }));
      }
      
      // Clear references
      largeData.length = 0;
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Allow for some memory increase but not excessive
      if (memoryIncrease > 50 * 1024 * 1024) { // 50MB threshold
        throw new Error(`Excessive memory usage: ${memoryIncrease / 1024 / 1024}MB`);
      }
    });
  }
  
  // Generate comprehensive report
  generateReport(): string {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.filter(r => r.failed).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    const categories = [...new Set(this.results.map(r => r.category))];
    
    let report = `
🧪 COMPREHENSIVE APPLICATION VERIFICATION REPORT
═══════════════════════════════════════════════

📊 SUMMARY
├─ Total Tests: ${totalTests}
├─ Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)
├─ Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)
└─ Total Duration: ${totalDuration.toFixed(2)}ms

📋 RESULTS BY CATEGORY
`;

    categories.forEach(category => {
      const categoryTests = this.results.filter(r => r.category === category);
      const categoryPassed = categoryTests.filter(r => r.passed).length;
      const categoryTotal = categoryTests.length;
      
      report += `
${category}:
├─ Tests: ${categoryTotal}
├─ Passed: ${categoryPassed}/${categoryTotal}
`;
      
      categoryTests.forEach(test => {
        const status = test.passed ? '✅' : '❌';
        const duration = test.duration.toFixed(2);
        report += `├─ ${status} ${test.testName} (${duration}ms)\n`;
        
        if (!test.passed && test.error) {
          report += `│  └─ Error: ${test.error}\n`;
        }
      });
    });

    if (failedTests > 0) {
      report += `
⚠️  FAILED TESTS DETAILS
`;
      this.results.filter(r => !r.passed).forEach(test => {
        report += `
${test.category} > ${test.testName}
├─ Duration: ${test.duration.toFixed(2)}ms
└─ Error: ${test.error}
`;
      });
    }

    report += `
🎯 RECOMMENDATIONS
`;

    if (passedTests === totalTests) {
      report += `
✨ All tests passed! The application is functioning correctly.
├─ Core business logic is working properly
├─ Security measures are in place
├─ Performance is within acceptable limits
└─ Integration between services is successful
`;
    } else {
      report += `
🔧 Issues found that need attention:
├─ ${failedTests} test(s) failed
├─ Review failed tests for critical issues
└─ Address performance or functionality problems
`;
    }

    return report;
  }
}

// Export the test runner
export const testRunner = new ApplicationTestRunner();
