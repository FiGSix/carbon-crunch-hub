
/**
 * Security audit and validation tool
 * Tests security measures and identifies potential vulnerabilities
 */

interface SecurityTestResult {
  testName: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  passed: boolean;
  details: string;
  recommendation?: string;
}

class SecurityAudit {
  private results: SecurityTestResult[] = [];
  
  async runSecurityTests(): Promise<SecurityTestResult[]> {
    console.log('🔒 Starting security audit...');
    
    // Authentication Tests
    await this.testAuthenticationSecurity();
    
    // Authorization Tests
    await this.testAuthorizationControls();
    
    // Input Validation Tests
    await this.testInputValidation();
    
    // Client-Side Security Tests
    await this.testClientSideSecurity();
    
    // Data Protection Tests
    await this.testDataProtection();
    
    return this.results;
  }
  
  private addResult(
    testName: string,
    category: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    passed: boolean,
    details: string,
    recommendation?: string
  ): void {
    this.results.push({
      testName,
      category,
      severity,
      passed,
      details,
      recommendation
    });
    
    const status = passed ? '✅' : '❌';
    const severityIcon = severity === 'critical' ? '🚨' : severity === 'high' ? '⚠️' : '⚡';
    console.log(`${status} ${severityIcon} ${testName}: ${details}`);
  }
  
  private async testAuthenticationSecurity(): Promise<void> {
    // Test authentication implementation
    try {
      const { RoleValidator } = await import('@/services/unified/utils/RoleValidator');
      
      // Test role validation logic
      const adminTest = RoleValidator.isAdmin('admin');
      const agentTest = RoleValidator.isAgent('agent');
      const clientTest = RoleValidator.isClient('client');
      
      this.addResult(
        'Role Validation Functions',
        'Authentication',
        'high',
        adminTest && agentTest && clientTest,
        'Role validation functions are properly implemented',
        adminTest && agentTest && clientTest ? undefined : 'Review role validation logic'
      );
      
      // Test permission checks
      const mockProposal = { agent_id: 'test-agent', client_id: 'test-client' };
      const accessTest = RoleValidator.canAccessProposal('admin', 'any-user', mockProposal);
      
      this.addResult(
        'Permission Access Controls',
        'Authentication',
        'high',
        accessTest,
        'Permission checks are implemented for proposal access',
        accessTest ? undefined : 'Review access control implementation'
      );
      
    } catch (error) {
      this.addResult(
        'Authentication System Availability',
        'Authentication',
        'critical',
        false,
        `Authentication system error: ${error}`,
        'Fix authentication system implementation'
      );
    }
  }
  
  private async testAuthorizationControls(): Promise<void> {
    try {
      const { RoleValidator } = await import('@/services/unified/utils/RoleValidator');
      
      // Test that unauthorized users cannot perform restricted actions
      const canClientCreateProposal = RoleValidator.canCreateProposal('client');
      const canAgentCreateProposal = RoleValidator.canCreateProposal('agent');
      const canAdminAccessSettings = RoleValidator.canAccessSystemSettings('admin');
      const canClientAccessSettings = RoleValidator.canAccessSystemSettings('client');
      
      this.addResult(
        'Creation Permissions',
        'Authorization',
        'high',
        !canClientCreateProposal && canAgentCreateProposal,
        'Proposal creation properly restricted to agents/admins',
        (!canClientCreateProposal && canAgentCreateProposal) ? undefined : 'Review proposal creation permissions'
      );
      
      this.addResult(
        'Admin Settings Access',
        'Authorization',
        'high',
        canAdminAccessSettings && !canClientAccessSettings,
        'System settings properly restricted to admins',
        (canAdminAccessSettings && !canClientAccessSettings) ? undefined : 'Review admin settings access controls'
      );
      
    } catch (error) {
      this.addResult(
        'Authorization System',
        'Authorization',
        'high',
        false,
        `Authorization system error: ${error}`,
        'Fix authorization implementation'
      );
    }
  }
  
  private async testInputValidation(): Promise<void> {
    // Test that validation functions exist and work
    try {
      const { UnifiedCarbonService } = await import('@/services/calculations/UnifiedCarbonService');
      
      // Test system size validation
      const validSize = UnifiedCarbonService.validateSystemSize(100);
      const invalidSize = UnifiedCarbonService.validateSystemSize(-10);
      
      this.addResult(
        'System Size Validation',
        'Input Validation',
        'medium',
        validSize.isValid && !invalidSize.isValid,
        'System size validation properly rejects invalid inputs',
        (validSize.isValid && !invalidSize.isValid) ? undefined : 'Review system size validation logic'
      );
      
      // Test size normalization handles edge cases
      try {
        const normalizedValid = UnifiedCarbonService.normalizeToKWp('100kWp');
        const normalizedZero = UnifiedCarbonService.normalizeToKWp('0kWp');
        
        this.addResult(
          'Size Normalization Safety',
          'Input Validation',
          'medium',
          normalizedValid === 100 && normalizedZero === 0,
          'Size normalization handles valid inputs correctly',
          (normalizedValid === 100) ? undefined : 'Review size normalization for edge cases'
        );
      } catch (error) {
        this.addResult(
          'Size Normalization Error Handling',
          'Input Validation',
          'medium',
          false,
          `Size normalization failed: ${error}`,
          'Add proper error handling for size normalization'
        );
      }
      
    } catch (error) {
      this.addResult(
        'Input Validation System',
        'Input Validation',
        'medium',
        false,
        `Input validation error: ${error}`,
        'Implement proper input validation'
      );
    }
  }
  
  private async testClientSideSecurity(): Promise<void> {
    // Test for common client-side security issues
    
    // Check for exposed sensitive data in localStorage/sessionStorage
    const localStorageKeys = Object.keys(localStorage);
    const sessionStorageKeys = Object.keys(sessionStorage);
    
    const sensitivePatterns = ['password', 'token', 'secret', 'key', 'auth'];
    const exposedSensitiveData = [...localStorageKeys, ...sessionStorageKeys]
      .filter(key => sensitivePatterns.some(pattern => key.toLowerCase().includes(pattern)));
    
    this.addResult(
      'Sensitive Data in Storage',
      'Client-Side Security',
      'high',
      exposedSensitiveData.length === 0,
      exposedSensitiveData.length === 0 
        ? 'No sensitive data found in browser storage'
        : `Found potentially sensitive keys: ${exposedSensitiveData.join(', ')}`,
      exposedSensitiveData.length === 0 ? undefined : 'Review and encrypt sensitive data in browser storage'
    );
    
    // Check for console.log statements (potential information disclosure)
    const hasConsoleStatements = document.documentElement.innerHTML.includes('console.log');
    
    this.addResult(
      'Debug Information Disclosure',
      'Client-Side Security',
      'low',
      !hasConsoleStatements,
      hasConsoleStatements 
        ? 'Console statements detected - may expose information'
        : 'No obvious console statements in production code',
      hasConsoleStatements ? 'Remove console.log statements from production code' : undefined
    );
    
    // Check for HTTPS usage
    const isHTTPS = window.location.protocol === 'https:';
    
    this.addResult(
      'HTTPS Usage',
      'Client-Side Security',
      'high',
      isHTTPS || window.location.hostname === 'localhost',
      isHTTPS 
        ? 'Application is served over HTTPS'
        : 'Application is not using HTTPS (may be development environment)',
      (!isHTTPS && window.location.hostname !== 'localhost') ? 'Enable HTTPS for production' : undefined
    );
  }
  
  private async testDataProtection(): Promise<void> {
    // Test cache security
    try {
      const { CacheManager } = await import('@/services/unified/cache/CacheManager');
      
      // Test that cache can be cleared (important for logout)
      CacheManager.clearCache();
      const stats = CacheManager.getStats();
      
      this.addResult(
        'Cache Clearing Functionality',
        'Data Protection',
        'medium',
        stats.size === 0,
        'Cache can be properly cleared for security',
        stats.size === 0 ? undefined : 'Fix cache clearing mechanism'
      );
      
    } catch (error) {
      this.addResult(
        'Cache Security System',
        'Data Protection',
        'medium',
        false,
        `Cache security error: ${error}`,
        'Implement proper cache security measures'
      );
    }
    
    // Test for potential XSS vectors
    const scriptTags = document.querySelectorAll('script');
    const inlineScripts = Array.from(scriptTags).filter(script => 
      script.innerHTML.length > 0 && !script.src
    );
    
    this.addResult(
      'Inline Script Usage',
      'Data Protection',
      'medium',
      inlineScripts.length === 0,
      inlineScripts.length === 0
        ? 'No inline scripts detected'
        : `Found ${inlineScripts.length} inline scripts`,
      inlineScripts.length === 0 ? undefined : 'Review inline scripts for XSS vulnerabilities'
    );
  }
  
  generateSecurityReport(): string {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.filter(r => !r.passed).length;
    
    const criticalIssues = this.results.filter(r => !r.passed && r.severity === 'critical').length;
    const highIssues = this.results.filter(r => !r.passed && r.severity === 'high').length;
    const mediumIssues = this.results.filter(r => !r.passed && r.severity === 'medium').length;
    const lowIssues = this.results.filter(r => !r.passed && r.severity === 'low').length;
    
    let report = `
🔒 SECURITY AUDIT REPORT
═══════════════════════

📊 SUMMARY
├─ Total Tests: ${totalTests}
├─ Passed: ${passedTests}
├─ Failed: ${failedTests}
└─ Success Rate: ${((passedTests/totalTests)*100).toFixed(1)}%

🚨 SECURITY ISSUES BY SEVERITY
├─ Critical: ${criticalIssues}
├─ High: ${highIssues}
├─ Medium: ${mediumIssues}
└─ Low: ${lowIssues}

📋 DETAILED RESULTS
`;

    const categories = [...new Set(this.results.map(r => r.category))];
    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      const categoryPassed = categoryResults.filter(r => r.passed).length;
      
      report += `
${category} (${categoryPassed}/${categoryResults.length} passed):
`;
      
      categoryResults.forEach(result => {
        const status = result.passed ? '✅' : '❌';
        const severityIcon = result.severity === 'critical' ? '🚨' : 
                             result.severity === 'high' ? '⚠️' : 
                             result.severity === 'medium' ? '⚡' : 'ℹ️';
        
        report += `├─ ${status} ${severityIcon} ${result.testName}\n`;
        report += `│  └─ ${result.details}\n`;
        
        if (!result.passed && result.recommendation) {
          report += `│     💡 ${result.recommendation}\n`;
        }
      });
    });

    if (criticalIssues > 0 || highIssues > 0) {
      report += `
🚨 URGENT SECURITY RECOMMENDATIONS
`;
      this.results
        .filter(r => !r.passed && (r.severity === 'critical' || r.severity === 'high'))
        .forEach(result => {
          report += `
${result.severity.toUpperCase()}: ${result.testName}
├─ Issue: ${result.details}
└─ Action: ${result.recommendation || 'Review and address immediately'}
`;
        });
    }

    return report;
  }
}

export const securityAudit = new SecurityAudit();
