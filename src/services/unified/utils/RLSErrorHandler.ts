
/**
 * Utility to handle RLS-related errors gracefully
 */
export class RLSErrorHandler {
  static isRLSError(error: any): boolean {
    return error?.code === 'PGRST116' || 
           error?.code === '42501' || 
           error?.message?.includes('permission') ||
           error?.message?.includes('row-level security');
  }

  static handleRLSError(error: any, context: string): {
    shouldReturnEmpty: boolean;
    message: string;
  } {
    if (this.isRLSError(error)) {
      console.log(`RLS permission issue in ${context} - handling gracefully`);
      return {
        shouldReturnEmpty: true,
        message: 'Access restricted - please ensure you are properly authenticated'
      };
    }

    return {
      shouldReturnEmpty: false,
      message: error.message || 'An unexpected error occurred'
    };
  }
}
