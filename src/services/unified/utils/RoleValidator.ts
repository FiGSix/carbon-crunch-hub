
/**
 * Role validation utility for checking user permissions
 */
export class RoleValidator {
  /**
   * Check if the current user has admin privileges
   */
  static isAdmin(userRole: string | undefined): boolean {
    return userRole === 'admin';
  }

  /**
   * Check if the current user has agent privileges (agent or admin)
   */
  static isAgent(userRole: string | undefined): boolean {
    return userRole === 'agent' || userRole === 'admin';
  }

  /**
   * Check if the current user has client privileges
   */
  static isClient(userRole: string | undefined): boolean {
    return userRole === 'client';
  }

  /**
   * Check if user can access proposal based on their role and relationship
   */
  static canAccessProposal(
    userRole: string | undefined,
    userId: string | undefined,
    proposal: {
      agent_id: string;
      client_id?: string | null;
      client_reference_id?: string | null;
    }
  ): boolean {
    if (!userId || !userRole) return false;

    // Admin can access all proposals
    if (this.isAdmin(userRole)) return true;

    // Agent can access their own proposals
    if (userRole === 'agent' && proposal.agent_id === userId) return true;

    // Client can access proposals where they are the client
    if (userRole === 'client' && (
      proposal.client_id === userId || 
      proposal.client_reference_id === userId
    )) return true;

    return false;
  }

  /**
   * Check if user can modify proposal
   */
  static canModifyProposal(
    userRole: string | undefined,
    userId: string | undefined,
    proposal: {
      agent_id: string;
    }
  ): boolean {
    if (!userId || !userRole) return false;

    // Admin can modify all proposals
    if (this.isAdmin(userRole)) return true;

    // Agent can modify their own proposals
    if (userRole === 'agent' && proposal.agent_id === userId) return true;

    return false;
  }

  /**
   * Check if user can create proposals
   */
  static canCreateProposal(userRole: string | undefined): boolean {
    return this.isAgent(userRole);
  }

  /**
   * Check if user can manage clients
   */
  static canManageClients(userRole: string | undefined): boolean {
    return this.isAgent(userRole);
  }

  /**
   * Check if user can access system settings
   */
  static canAccessSystemSettings(userRole: string | undefined): boolean {
    return this.isAdmin(userRole);
  }
}
