
import { logger } from "@/lib/logger";

/**
 * Create a logger instance for proposal data operations
 */
export function createProposalDataLogger() {
  return logger.withContext({
    component: 'useProposalData',
    feature: 'proposals'
  });
}

/**
 * Log proposal fetch start
 */
export function logProposalFetchStart(proposalId?: string, invitationToken?: string | null) {
  const proposalLogger = createProposalDataLogger();
  
  proposalLogger.info("🔄 Fetching proposal", { 
    proposalId, 
    hasToken: !!invitationToken,
    tokenPrefix: invitationToken ? invitationToken.substring(0, 8) : null
  });
}

/**
 * Log proposal fetch error
 */
export function logProposalFetchError(
  err: unknown, 
  proposalId?: string, 
  invitationToken?: string | null
) {
  const proposalLogger = createProposalDataLogger();
  
  let errorMessage = "Failed to load the proposal. Please try again.";
  
  if (err instanceof Error) {
    errorMessage = err.message;
  } else if (typeof err === 'string') {
    errorMessage = err;
  }
  
  proposalLogger.error("❌ Error fetching proposal", { 
    error: err,
    errorMessage,
    hasToken: !!invitationToken,
    hasProposalId: !!proposalId
  });
  
  return errorMessage;
}
