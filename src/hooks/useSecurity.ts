
import { useState, useEffect } from 'react';
import { performSecurityAudit, quickSecurityCheck, SecurityAuditResult } from '@/lib/security/audit';
import { authLogger } from '@/lib/logger';

interface SecurityStatus {
  isSecure: boolean;
  lastAudit?: SecurityAuditResult;
  warnings: string[];
  isLoading: boolean;
  error?: string;
}

/**
 * Hook for monitoring application security status
 */
export function useSecurity() {
  const [status, setStatus] = useState<SecurityStatus>({
    isSecure: true,
    warnings: [],
    isLoading: false,
  });

  // Perform quick security check on mount
  useEffect(() => {
    const quickCheck = quickSecurityCheck();
    
    if (quickCheck.critical || quickCheck.warnings.length > 0) {
      setStatus(prev => ({
        ...prev,
        isSecure: !quickCheck.critical,
        warnings: quickCheck.warnings,
      }));

      if (quickCheck.critical) {
        authLogger.error('Critical security issues detected', {
          warnings: quickCheck.warnings,
        });
      }
    }
  }, []);

  const runFullAudit = async (): Promise<SecurityAuditResult> => {
    setStatus(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const auditResult = await performSecurityAudit();
      
      setStatus(prev => ({
        ...prev,
        isSecure: auditResult.passed,
        lastAudit: auditResult,
        warnings: auditResult.checks
          .filter(check => !check.passed)
          .map(check => check.message),
        isLoading: false,
      }));

      return auditResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during security audit';
      
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        isSecure: false,
      }));

      authLogger.error('Security audit failed', { error: errorMessage });
      throw error;
    }
  };

  return {
    ...status,
    runFullAudit,
  };
}
