
/**
 * Security Audit Utility
 * 
 * This module provides utilities for auditing security configurations
 * and detecting potential security issues.
 */

import { supabase } from '@/integrations/supabase/client';
import { SecurityConfig, validateSecurityConfig } from '@/lib/config/security';
import { authLogger } from '@/lib/logger';

export interface SecurityAuditResult {
  passed: boolean;
  timestamp: Date;
  checks: {
    name: string;
    passed: boolean;
    message: string;
    severity: 'info' | 'warning' | 'error';
  }[];
}

/**
 * Perform a comprehensive security audit
 */
export async function performSecurityAudit(): Promise<SecurityAuditResult> {
  const checks: SecurityAuditResult['checks'] = [];
  
  // Check 1: Environment configuration
  const envValidation = validateSecurityConfig();
  checks.push({
    name: 'Environment Configuration',
    passed: envValidation.isValid,
    message: envValidation.isValid 
      ? 'Environment configuration is valid'
      : `Issues found: ${envValidation.issues.join(', ')}`,
    severity: envValidation.isValid ? 'info' : 'warning',
  });

  // Check 2: Supabase client configuration
  const supabaseConfig = supabase.supabaseUrl && supabase.supabaseKey;
  checks.push({
    name: 'Supabase Configuration',
    passed: !!supabaseConfig,
    message: supabaseConfig 
      ? 'Supabase client is properly configured'
      : 'Supabase client configuration is missing',
    severity: supabaseConfig ? 'info' : 'error',
  });

  // Check 3: Session persistence
  try {
    const { data: { session } } = await supabase.auth.getSession();
    checks.push({
      name: 'Session Management',
      passed: true,
      message: session 
        ? 'Active session found and properly managed'
        : 'No active session (normal for unauthenticated users)',
      severity: 'info',
    });
  } catch (error) {
    checks.push({
      name: 'Session Management',
      passed: false,
      message: `Session management error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
    });
  }

  // Check 4: Local storage security
  try {
    const keys = Object.keys(localStorage);
    const sensitiveKeys = keys.filter(key => 
      key.includes('password') || 
      key.includes('secret') || 
      key.includes('private')
    );
    
    checks.push({
      name: 'Local Storage Security',
      passed: sensitiveKeys.length === 0,
      message: sensitiveKeys.length === 0
        ? 'No sensitive data detected in localStorage'
        : `Potential sensitive data in localStorage: ${sensitiveKeys.join(', ')}`,
      severity: sensitiveKeys.length === 0 ? 'info' : 'warning',
    });
  } catch (error) {
    checks.push({
      name: 'Local Storage Security',
      passed: false,
      message: 'Could not audit localStorage',
      severity: 'warning',
    });
  }

  // Check 5: HTTPS usage (in production)
  const isHttps = window.location.protocol === 'https:';
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  checks.push({
    name: 'HTTPS Usage',
    passed: isHttps || isLocalDev,
    message: isHttps 
      ? 'Application is served over HTTPS'
      : isLocalDev 
        ? 'Local development environment (HTTP is acceptable)'
        : 'Application should be served over HTTPS in production',
    severity: isHttps || isLocalDev ? 'info' : 'error',
  });

  const auditResult: SecurityAuditResult = {
    passed: checks.every(check => check.passed),
    timestamp: new Date(),
    checks,
  };

  // Log audit results
  authLogger.info('Security audit completed', {
    passed: auditResult.passed,
    checksCount: checks.length,
    failedChecks: checks.filter(c => !c.passed).length,
  });

  return auditResult;
}

/**
 * Quick security check for critical issues
 */
export function quickSecurityCheck(): {
  critical: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  let critical = false;

  // Check for critical security issues
  if (!supabase.supabaseUrl || !supabase.supabaseKey) {
    warnings.push('Supabase configuration is missing');
    critical = true;
  }

  if (import.meta.env.PROD && window.location.protocol !== 'https:') {
    warnings.push('Application is not served over HTTPS in production');
    critical = true;
  }

  // Check for localStorage availability
  try {
    localStorage.setItem('__test__', 'test');
    localStorage.removeItem('__test__');
  } catch {
    warnings.push('localStorage is not available for session persistence');
  }

  return { critical, warnings };
}
