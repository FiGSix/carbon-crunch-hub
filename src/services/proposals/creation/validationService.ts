
import { validateClientCreation, fixClientCreationIssues } from "../client/clientCreationValidator";
import { logger } from "@/lib/logger";

export async function validateAndFixClient(
  proposalId: string,
  clientEmail: string,
  clientId?: string
): Promise<void> {
  const proposalLogger = logger.withContext({
    component: 'ValidationService',
    method: 'validateAndFixClient'
  });

  // Validate client creation and linkage
  const validationResult = await validateClientCreation({
    proposalId,
    expectedClientEmail: clientEmail,
    clientId
  });

  if (!validationResult.isValid) {
    proposalLogger.warn("Client validation failed, attempting to fix", {
      errors: validationResult.errors,
      warnings: validationResult.warnings
    });

    // Attempt to fix the issues
    const fixResult = await fixClientCreationIssues({
      proposalId,
      expectedClientEmail: clientEmail,
      clientId
    });

    if (fixResult.fixed) {
      proposalLogger.info("Client issues fixed", { actions: fixResult.actions });
      
      // Re-validate after fixes
      const reValidationResult = await validateClientCreation({
        proposalId,
        expectedClientEmail: clientEmail,
        clientId
      });

      if (!reValidationResult.isValid) {
        proposalLogger.error("Client validation still failing after fixes", {
          errors: reValidationResult.errors
        });
      }
    }
  }
}
