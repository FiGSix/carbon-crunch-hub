import { supabase } from '@/integrations/supabase/client';
import { UserProfile, UserRole } from '@/contexts/auth/types';
import { ErrorHandler } from '../unified/utils/ErrorHandler';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';

interface AuditLogEntry {
  type: 'access_denied' | 'unauthorized_access';
  userId: string;
  targetProfileId: string;
  userRole: UserRole;
  timestamp: string;
  success: boolean;
  reason?: string;
}

/**
 * Secure profile service with authorization and audit logging
 */
export class SecureProfileService {
  private static auditLogs: AuditLogEntry[] = [];

  private static logAuditEvent(entry: AuditLogEntry) {
    this.auditLogs.push(entry);
    
    // Log to console in development for debugging
    if (import.meta.env.DEV) {
      devLogger.api.info('🔒 Profile Access Audit:', entry);
    }

    // In production, this could be sent to a logging service
    ErrorHandler.logSecurityEvent({
      type: entry.type,
      userId: entry.userId,
      resource: 'profile',
      action: 'access',
      details: {
        targetProfileId: entry.targetProfileId,
        userRole: entry.userRole,
        success: entry.success,
        reason: entry.reason
      }
    });
  }

  /**
   * Check if current user can access another user's profile
   */
  private static canAccessProfile(
    currentUserId: string,
    currentUserRole: UserRole,
    targetProfileId: string
  ): { canAccess: boolean; reason?: string } {
    // Users can always access their own profile
    if (currentUserId === targetProfileId) {
      return { canAccess: true };
    }

    // Admins can access any profile
    if (currentUserRole === 'admin') {
      return { canAccess: true };
    }

    // Agents can access client profiles (this would need additional business logic)
    // For now, we'll be restrictive and only allow admin access to other profiles
    return { 
      canAccess: false, 
      reason: `User role '${currentUserRole}' cannot access other user profiles` 
    };
  }

  /**
   * Filter profile fields based on user role and relationship
   */
  private static filterProfileFields(
    profile: UserProfile,
    currentUserId: string,
    currentUserRole: UserRole,
    targetProfileId: string
  ): Partial<UserProfile> {
    // Users accessing their own profile get full access
    if (currentUserId === targetProfileId) {
      return profile;
    }

    // Admins get full access
    if (currentUserRole === 'admin') {
      return profile;
    }

    // For other roles, return limited public information
    return {
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      company_name: profile.company_name,
      role: profile.role,
      // Remove sensitive fields like email, phone, etc.
    };
  }

  /**
   * Securely get profile by ID with authorization checks
   */
  static async getProfileById(
    targetProfileId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ profile: Partial<UserProfile> | null; error?: string }> {
    const timestamp = new Date().toISOString();

    try {
      // Check authorization
      const authCheck = this.canAccessProfile(currentUserId, currentUserRole, targetProfileId);
      
      if (!authCheck.canAccess) {
        // Log unauthorized access attempt
        this.logAuditEvent({
          type: 'unauthorized_access',
          userId: currentUserId,
          targetProfileId,
          userRole: currentUserRole,
          timestamp,
          success: false,
          reason: authCheck.reason
        });

        return { 
          profile: null, 
          error: 'Unauthorized: You do not have permission to access this profile' 
        };
      }

      // Fetch the profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetProfileId)
        .single();

      if (error) {
        this.logAuditEvent({
          type: 'access_denied',
          userId: currentUserId,
          targetProfileId,
          userRole: currentUserRole,
          timestamp,
          success: false,
          reason: `Database error: ${error.message}`
        });

        return { profile: null, error: error.message };
      }

      if (!data) {
        this.logAuditEvent({
          type: 'access_denied',
          userId: currentUserId,
          targetProfileId,
          userRole: currentUserRole,
          timestamp,
          success: false,
          reason: 'Profile not found'
        });

        return { profile: null, error: 'Profile not found' };
      }

      // Convert to UserProfile format
      const fullProfile: UserProfile = {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        company_name: data.company_name,
        company_logo_url: data.company_logo_url,
        avatar_url: data.avatar_url,
        role: data.role as UserRole,
        terms_accepted_at: data.terms_accepted_at,
        created_at: data.created_at,
        intro_video_viewed: data.intro_video_viewed,
        intro_video_viewed_at: data.intro_video_viewed_at
      };

      // Filter fields based on authorization level
      const filteredProfile = this.filterProfileFields(
        fullProfile,
        currentUserId,
        currentUserRole,
        targetProfileId
      );

      // Log successful access - using 'access_denied' type with success: true
      // This maintains consistency with ErrorHandler expectations
      this.logAuditEvent({
        type: 'access_denied', // Using available type but with success: true
        userId: currentUserId,
        targetProfileId,
        userRole: currentUserRole,
        timestamp,
        success: true
      });

      return { profile: filteredProfile };

    } catch (error) {
      this.logAuditEvent({
        type: 'access_denied',
        userId: currentUserId,
        targetProfileId,
        userRole: currentUserRole,
        timestamp,
        success: false,
        reason: error instanceof Error ? error.message : 'Unknown error'
      });

      return { 
        profile: null, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get audit logs (admin only)
   */
  static getAuditLogs(currentUserRole: UserRole): AuditLogEntry[] {
    if (currentUserRole !== 'admin') {
      return [];
    }
    return [...this.auditLogs];
  }

  /**
   * Clear audit logs (admin only)
   */
  static clearAuditLogs(currentUserRole: UserRole): boolean {
    if (currentUserRole !== 'admin') {
      return false;
    }
    this.auditLogs = [];
    return true;
  }
}
