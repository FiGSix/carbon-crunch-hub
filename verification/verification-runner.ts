
/**
 * Main verification runner that orchestrates all testing suites
 * Provides a comprehensive overview of application health
 */

import { testRunner } from './test-runner';
import { browserTestSuite } from './browser-test-suite';
import { performanceMonitor } from './performance-monitor';
import { securityAudit } from './security-audit';
import { integrationTester } from './integration-tester';

interface VerificationResults {
  unitTests: any[];
  uiTests: any[];
  performanceReport: any;
  securityResults: any[];
  integrationResults: any[];
  overallScore: number;
  criticalIssues: string[];
  recommendations: string[];
}

class VerificationRunner {
  async runCompleteVerification(): Promise<VerificationResults> {
    console.log('🎯 Starting Complete Application Verification');
    console.log('═'.repeat(50));
    
    // Initialize performance monitoring
    performanceMonitor.startMonitoring();
    
    try {
      // Run all test suites
      console.log('\n1️⃣ Running Unit Tests...');
      const unitTests = await testRunner.runAllTests();
      
      console.log('\n2️⃣ Running UI Tests...');
      const uiTests = await browserTestSuite.runUITests();
      
      console.log('\n3️⃣ Running Performance Tests...');
      await performanceMonitor.testCalculationPerformance();
      await performanceMonitor.testDataLoadingPerformance();
      await performanceMonitor.testRenderingPerformance();
      const performanceReport = performanceMonitor.generateReport();
      
      console.log('\n4️⃣ Running Security Audit...');
      const securityResults = await securityAudit.runSecurityTests();
      
      console.log('\n5️⃣ Running Integration Tests...');
      const integrationResults = await integrationTester.runIntegrationTests();
      
      // Calculate overall score and gather insights
      const results = this.analyzeResults({
        unitTests,
        uiTests,
        performanceReport,
        securityResults,
        integrationResults
      });
      
      // Generate and display comprehensive report
      this.displayComprehensiveReport(results);
      
      return results;
      
    } finally {
      performanceMonitor.stopMonitoring();
    }
  }
  
  private analyzeResults(rawResults: any): VerificationResults {
    const { unitTests, uiTests, performanceReport, securityResults, integrationResults } = rawResults;
    
    let overallScore = 100;
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];
    
    // Analyze unit tests
    const unitTestsPassed = unitTests.filter((t: any) => t.passed).length;
    const unitTestsTotal = unitTests.length;
    const unitTestScore = unitTestsTotal > 0 ? (unitTestsPassed / unitTestsTotal) * 100 : 100;
    
    if (unitTestScore < 100) {
      overallScore -= (100 - unitTestScore) * 0.3; // 30% weight
      if (unitTestScore < 80) {
        criticalIssues.push(`${unitTestsTotal - unitTestsPassed} unit tests failing`);
      }
      recommendations.push('Address failing unit tests to improve code reliability');
    }
    
    // Analyze UI tests
    const uiTestsPassed = uiTests.filter((t: any) => t.passed).length;
    const uiTestsTotal = uiTests.length;
    const uiTestScore = uiTestsTotal > 0 ? (uiTestsPassed / uiTestsTotal) * 100 : 100;
    
    if (uiTestScore < 100) {
      overallScore -= (100 - uiTestScore) * 0.2; // 20% weight
      if (uiTestScore < 70) {
        criticalIssues.push(`${uiTestsTotal - uiTestsPassed} UI tests failing`);
      }
      recommendations.push('Fix UI test failures to ensure proper user experience');
    }
    
    // Analyze performance
    if (performanceReport.overallScore < 100) {
      overallScore -= (100 - performanceReport.overallScore) * 0.2; // 20% weight
      if (performanceReport.overallScore < 60) {
        criticalIssues.push('Poor performance metrics detected');
      }
      recommendations.push(...performanceReport.recommendations);
    }
    
    // Analyze security
    const securityPassed = securityResults.filter((s: any) => s.passed).length;
    const securityTotal = securityResults.length;
    const criticalSecurityIssues = securityResults.filter((s: any) => !s.passed && s.severity === 'critical').length;
    const highSecurityIssues = securityResults.filter((s: any) => !s.passed && s.severity === 'high').length;
    
    if (criticalSecurityIssues > 0) {
      overallScore -= criticalSecurityIssues * 20; // Major penalty for critical issues
      criticalIssues.push(`${criticalSecurityIssues} critical security issues found`);
    }
    
    if (highSecurityIssues > 0) {
      overallScore -= highSecurityIssues * 10; // Penalty for high severity issues
      criticalIssues.push(`${highSecurityIssues} high-severity security issues found`);
    }
    
    if (securityPassed < securityTotal) {
      recommendations.push('Address security vulnerabilities immediately');
    }
    
    // Analyze integration tests
    const integrationPassed = integrationResults.filter((i: any) => i.overallPassed).length;
    const integrationTotal = integrationResults.length;
    const integrationScore = integrationTotal > 0 ? (integrationPassed / integrationTotal) * 100 : 100;
    
    if (integrationScore < 100) {
      overallScore -= (100 - integrationScore) * 0.3; // 30% weight
      if (integrationScore < 80) {
        criticalIssues.push(`${integrationTotal - integrationPassed} integration workflows failing`);
      }
      recommendations.push('Fix integration test failures to ensure system reliability');
    }
    
    // Ensure score doesn't go below 0
    overallScore = Math.max(0, overallScore);
    
    return {
      unitTests,
      uiTests,
      performanceReport,
      securityResults,
      integrationResults,
      overallScore,
      criticalIssues,
      recommendations
    };
  }
  
  private displayComprehensiveReport(results: VerificationResults): void {
    const {
      unitTests,
      uiTests,
      performanceReport,
      securityResults,
      integrationResults,
      overallScore,
      criticalIssues,
      recommendations
    } = results;
    
    console.log(`
🎯 COMPREHENSIVE APPLICATION VERIFICATION REPORT
═════════════════════════════════════════════════

🏆 OVERALL SCORE: ${overallScore.toFixed(1)}/100

📊 DETAILED BREAKDOWN
├─ Unit Tests: ${unitTests.filter(t => t.passed).length}/${unitTests.length} passed
├─ UI Tests: ${uiTests.filter(t => t.passed).length}/${uiTests.length} passed
├─ Performance Score: ${performanceReport.overallScore}/100
├─ Security Tests: ${securityResults.filter(s => s.passed).length}/${securityResults.length} passed
└─ Integration Tests: ${integrationResults.filter(i => i.overallPassed).length}/${integrationResults.length} passed

${criticalIssues.length > 0 ? `
🚨 CRITICAL ISSUES
${criticalIssues.map(issue => `├─ ${issue}`).join('\n')}
` : '✅ NO CRITICAL ISSUES FOUND'}

${recommendations.length > 0 ? `
💡 RECOMMENDATIONS
${recommendations.map(rec => `├─ ${rec}`).join('\n')}
` : ''}

📈 PERFORMANCE INSIGHTS
${performanceReport.issues.length > 0 ? `
Issues:
${performanceReport.issues.map(issue => `├─ ${issue}`).join('\n')}
` : '├─ No performance issues detected'}

${performanceReport.recommendations.length > 0 ? `
Recommendations:
${performanceReport.recommendations.map(rec => `├─ ${rec}`).join('\n')}
` : ''}

🔒 SECURITY STATUS
${securityResults.filter(s => !s.passed && s.severity === 'critical').length > 0 ? '🚨 CRITICAL SECURITY ISSUES DETECTED' : 
  securityResults.filter(s => !s.passed && s.severity === 'high').length > 0 ? '⚠️ HIGH PRIORITY SECURITY ISSUES' :
  securityResults.filter(s => !s.passed).length > 0 ? '⚡ SECURITY IMPROVEMENTS NEEDED' :
  '✅ SECURITY STATUS GOOD'}

🎖️ OVERALL ASSESSMENT
${overallScore >= 90 ? '🌟 EXCELLENT - Application is in great shape!' :
  overallScore >= 80 ? '👍 GOOD - Minor issues to address' :
  overallScore >= 70 ? '⚠️ FAIR - Several issues need attention' :
  overallScore >= 60 ? '🔧 POOR - Significant issues require immediate attention' :
  '🚨 CRITICAL - Major problems must be resolved immediately'}

📅 NEXT STEPS
${overallScore >= 90 ? 
  '├─ Continue regular monitoring\n├─ Consider additional optimizations\n└─ Plan for future enhancements' :
  '├─ Address critical issues first\n├─ Implement recommended fixes\n├─ Re-run verification after fixes\n└─ Monitor ongoing performance'}
`);
    
    // Also display individual reports for detailed analysis
    console.log('\n' + '─'.repeat(50));
    console.log('📋 DETAILED REPORTS AVAILABLE:');
    console.log('├─ testRunner.generateReport() - Unit test details');
    console.log('├─ performanceMonitor.printReport() - Performance metrics');
    console.log('├─ securityAudit.generateSecurityReport() - Security analysis');
    console.log('└─ integrationTester.generateIntegrationReport() - Integration details');
  }
  
  // Quick health check method
  async quickHealthCheck(): Promise<{score: number, critical: string[], status: string}> {
    console.log('⚡ Running Quick Health Check...');
    
    try {
      // Run minimal tests for quick feedback
      const basicTests = await testRunner.runAllTests();
      const basicSecurity = await securityAudit.runSecurityTests();
      
      const testsPassed = basicTests.filter(t => t.passed).length;
      const testsTotal = basicTests.length;
      const testScore = testsTotal > 0 ? (testsPassed / testsTotal) * 100 : 100;
      
      const criticalSecurityIssues = basicSecurity.filter(s => !s.passed && s.severity === 'critical');
      
      let score = testScore;
      const critical: string[] = [];
      
      if (testScore < 80) {
        critical.push(`${testsTotal - testsPassed} tests failing`);
      }
      
      if (criticalSecurityIssues.length > 0) {
        score -= criticalSecurityIssues.length * 20;
        critical.push(`${criticalSecurityIssues.length} critical security issues`);
      }
      
      const status = score >= 80 ? 'Healthy' : score >= 60 ? 'Needs Attention' : 'Critical Issues';
      
      console.log(`⚡ Quick Health Check Complete: ${score.toFixed(1)}/100 - ${status}`);
      
      return { score, critical, status };
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return { score: 0, critical: ['Health check failed'], status: 'Error' };
    }
  }
}

// Export singleton instance
export const verificationRunner = new VerificationRunner();

// Export convenience functions
export const runCompleteVerification = () => verificationRunner.runCompleteVerification();
export const runQuickHealthCheck = () => verificationRunner.quickHealthCheck();
