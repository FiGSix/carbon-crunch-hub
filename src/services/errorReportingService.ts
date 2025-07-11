/**
 * Phase 1: Error reporting service for production monitoring
 * Centralizes error handling and reporting
 */

interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  userId?: string;
  userAgent: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

class ErrorReportingService {
  private isProduction = import.meta.env.PROD;
  private apiEndpoint = '/api/error-reports'; // Would be configured in production

  /**
   * Report an error to the logging service
   */
  async reportError(error: Error, context?: Record<string, any>, severity: ErrorReport['severity'] = 'medium') {
    const report: ErrorReport = {
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      severity,
      context
    };

    // In development, just log to console
    if (!this.isProduction) {
      console.error('🚨 Error Report:', report);
      return;
    }

    // In production, send to error reporting service
    try {
      // This would typically be sent to Sentry, LogRocket, or similar service
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report)
      });
    } catch (reportingError) {
      // Fallback: log to console if error reporting fails
      console.error('Failed to report error:', reportingError);
      console.error('Original error:', report);
    }
  }

  /**
   * Report authentication errors
   */
  reportAuthError(error: Error, userId?: string) {
    this.reportError(error, { type: 'authentication', userId }, 'high');
  }

  /**
   * Report API errors
   */
  reportApiError(error: Error, endpoint: string, method: string) {
    this.reportError(error, { type: 'api', endpoint, method }, 'medium');
  }

  /**
   * Report UI errors
   */
  reportUIError(error: Error, component: string) {
    this.reportError(error, { type: 'ui', component }, 'low');
  }

  /**
   * Report critical system errors
   */
  reportCriticalError(error: Error, context?: Record<string, any>) {
    this.reportError(error, { type: 'critical', ...context }, 'critical');
  }
}

export const errorReportingService = new ErrorReportingService();