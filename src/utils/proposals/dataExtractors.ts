
/**
 * Utility functions for extracting data from proposal objects
 */

/**
 * Extract and convert system size from various sources
 */
export function extractSystemSize(proposal: any): number {
  // First check if system_size_kwp column has a value
  if (proposal.system_size_kwp && proposal.system_size_kwp > 0) {
    return Number(proposal.system_size_kwp);
  }
  
  // Fall back to project_info.size if available
  if (proposal.project_info?.size) {
    const sizeString = proposal.project_info.size.toString().trim();
    
    // Extract numeric value from string (handle cases like "350 kWp", "14.8 MWp", etc.)
    const numericMatch = sizeString.match(/^(\d+(?:\.\d+)?)/);
    if (numericMatch) {
      const numericValue = parseFloat(numericMatch[1]);
      
      // Check if it's in MWp and convert to kWp
      if (sizeString.toLowerCase().includes('mwp') || sizeString.toLowerCase().includes('mw')) {
        return numericValue * 1000;
      }
      
      // Default to kWp
      return numericValue;
    }
  }
  
  // Also check content.projectInfo.size as a fallback
  if (proposal.content?.projectInfo?.size) {
    const sizeString = proposal.content.projectInfo.size.toString().trim();
    
    const numericMatch = sizeString.match(/^(\d+(?:\.\d+)?)/);
    if (numericMatch) {
      const numericValue = parseFloat(numericMatch[1]);
      
      if (sizeString.toLowerCase().includes('mwp') || sizeString.toLowerCase().includes('mw')) {
        return numericValue * 1000;
      }
      
      return numericValue;
    }
  }
  
  // Return 0 if no valid size found
  return 0;
}

/**
 * Extract client name from multiple sources with proper fallback hierarchy
 */
export function extractClientName(proposal: any, clientProfile: any): string {
  // First try: client profile from client_id/client_reference_id
  if (clientProfile) {
    const profileName = `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim();
    if (profileName) {
      return profileName;
    }
  }
  
  // Second try: company name from proposal content
  if (proposal.content?.clientInfo?.companyName) {
    return proposal.content.clientInfo.companyName;
  }
  
  // Third try: client name from proposal content
  if (proposal.content?.clientInfo?.name) {
    return proposal.content.clientInfo.name;
  }
  
  // Final fallback
  return 'Unknown Client';
}
