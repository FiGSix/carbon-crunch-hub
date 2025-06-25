
import { supabase } from '@/integrations/supabase/client';

/**
 * Security validation utility for database operations
 */
export class SecurityValidator {
  /**
   * Validate user session and role before database operations
   */
  static async validateUserSession(): Promise<{
    isValid: boolean;
    userId: string | null;
    userRole: string | null;
    error?: string;
  }> {
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        return {
          isValid: false,
          userId: null,
          userRole: null,
          error: 'Session validation failed'
        };
      }

      if (!session?.user) {
        return {
          isValid: false,
          userId: null,
          userRole: null,
          error: 'No active session'
        };
      }

      // Get user role from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        return {
          isValid: false,
          userId: session.user.id,
          userRole: null,
          error: 'Failed to get user role'
        };
      }

      return {
        isValid: true,
        userId: session.user.id,
        userRole: profile.role
      };
    } catch (error) {
      return {
        isValid: false,
        userId: null,
        userRole: null,
        error: 'Security validation failed'
      };
    }
  }

  /**
   * Test RLS policies are working correctly
   */
  static async testRLSPolicies(): Promise<{
    success: boolean;
    results: Array<{
      test_name: string;
      table_name: string;
      operation: string;
      role: string;
      result: string;
      success: boolean;
    }>;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('test_rls_policies');
      
      if (error) {
        return {
          success: false,
          results: [],
          error: error.message
        };
      }

      return {
        success: true,
        results: data || []
      };
    } catch (error) {
      return {
        success: false,
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
