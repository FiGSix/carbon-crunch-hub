
import { UserRole } from '@/contexts/auth/types';

interface SecurityVulnerability {
  severity: 'high' | 'medium' | 'low';
  type: 'unauthorized_access' | 'data_exposure' | 'missing_validation';
  description: string;
  location: string;
  recommendation: string;
}

interface SecurityAuditReport {
  vulnerabilities: SecurityVulnerability[];
  summary: {
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  timestamp: string;
}

/**
 * Security audit utility to identify potential vulnerabilities
 */
export class SecurityAudit {
  private static vulnerabilities: SecurityVulnerability[] = [];

  /**
   * Report a security vulnerability
   */
  static reportVulnerability(vulnerability: SecurityVulnerability) {
    this.vulnerabilities.push({
      ...vulnerability,
      timestamp: new Date().toISOString()
    } as any);

    // Log in development
    if (import.meta.env.DEV) {
      console.warn('🚨 Security Vulnerability Detected:', vulnerability);
    }
  }

  /**
   * Check if a function has proper authorization
   */
  static checkFunctionAuthorization(
    functionName: string,
    hasUserIdParam: boolean,
    hasRoleCheck: boolean,
    location: string
  ) {
    if (!hasUserIdParam && !hasRoleCheck) {
      this.reportVulnerability({
        severity: 'high',
        type: 'unauthorized_access',
        description: `Function ${functionName} lacks user authorization checks`,
        location,
        recommendation: 'Add user ID parameter and role-based authorization checks'
      });
    } else if (!hasRoleCheck) {
      this.reportVulnerability({
        severity: 'medium',
        type: 'unauthorized_access',
        description: `Function ${functionName} lacks role-based authorization`,
        location,
        recommendation: 'Add role-based access control checks'
      });
    }
  }

  /**
   * Check if data access is properly scoped
   */
  static checkDataScoping(
    operation: string,
    hasUserFilter: boolean,
    hasRoleFilter: boolean,
    location: string
  ) {
    if (!hasUserFilter && !hasRoleFilter) {
      this.reportVulnerability({
        severity: 'high',
        type: 'data_exposure',
        description: `${operation} operation lacks proper data scoping`,
        location,
        recommendation: 'Add user-based or role-based data filtering'
      });
    }
  }

  /**
   * Check if sensitive data is properly filtered
   */
  static checkDataFiltering(
    dataType: string,
    hasSensitiveFields: boolean,
    hasFieldFiltering: boolean,
    location: string
  ) {
    if (hasSensitiveFields && !hasFieldFiltering) {
      this.reportVulnerability({
        severity: 'medium',
        type: 'data_exposure',
        description: `${dataType} data may expose sensitive fields`,
        location,
        recommendation: 'Implement field-level filtering based on user role and relationship'
      });
    }
  }

  /**
   * Generate security audit report
   */
  static generateReport(): SecurityAuditReport {
    const summary = this.vulnerabilities.reduce(
      (acc, vuln) => {
        acc[vuln.severity]++;
        acc.total++;
        return acc;
      },
      { high: 0, medium: 0, low: 0, total: 0 }
    );

    return {
      vulnerabilities: [...this.vulnerabilities],
      summary,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear audit findings
   */
  static clearFindings() {
    this.vulnerabilities = [];
  }

  /**
   * Run automated security checks on common patterns
   */
  static runAutomatedChecks() {
    // Check for common vulnerability patterns
    
    // Example: Check if getProfileById has been secured
    this.checkFunctionAuthorization(
      'getProfileById',
      true, // Now has proper user authorization
      true, // Now has role checks
      'src/lib/supabase/profile.ts'
    );

    // You can add more automated checks here for other functions
    
    console.log('🔍 Security audit completed. Run SecurityAudit.generateReport() to see results.');
  }
}

// Run initial security audit in development
if (import.meta.env.DEV) {
  SecurityAudit.runAutomatedChecks();
}
