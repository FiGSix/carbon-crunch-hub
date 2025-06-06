
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface ClientCreationValidationResult {
  isValid: boolean;
  clientId?: string;
  errors: string[];
  warnings: string[];
}

export interface ProposalClientValidation {
  proposalId: string;
  expectedClientEmail: string;
  clientId?: string;
}

/**
 * Validates that a client was properly created and linked to a proposal
 */
export async function validateClientCreation(
  validation: ProposalClientValidation
): Promise<ClientCreationValidationResult> {
  const validationLogger = logger.withContext({
    component: 'ClientCreationValidator',
    proposalId: validation.proposalId
  });

  const errors: string[] = [];
  const warnings: string[] = [];
  let clientId: string | undefined;

  try {
    validationLogger.info("Starting client creation validation", {
      expectedEmail: validation.expectedClientEmail,
      providedClientId: validation.clientId
    });

    // 1. Verify the proposal exists and has a client_reference_id
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('id, client_reference_id, content')
      .eq('id', validation.proposalId)
      .single();

    if (proposalError) {
      errors.push(`Proposal not found: ${proposalError.message}`);
      return { isValid: false, errors, warnings };
    }

    if (!proposal.client_reference_id) {
      errors.push("Proposal is missing client_reference_id");
    } else {
      clientId = proposal.client_reference_id;
    }

    // 2. If we have a client ID, verify the client exists and matches the email
    if (clientId) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, email, first_name, last_name')
        .eq('id', clientId)
        .single();

      if (clientError) {
        errors.push(`Client not found in clients table: ${clientError.message}`);
      } else {
        // Verify email matches
        if (client.email.toLowerCase() !== validation.expectedClientEmail.toLowerCase()) {
          errors.push(`Client email mismatch: expected ${validation.expectedClientEmail}, found ${client.email}`);
        }

        // Check if client has basic required information
        if (!client.first_name || client.first_name.trim() === '') {
          warnings.push("Client is missing first name");
        }

        validationLogger.info("Client validation completed", {
          clientId: client.id,
          clientEmail: client.email,
          hasFirstName: !!client.first_name
        });
      }
    }

    // 3. Check for email consistency in proposal content
    const contentEmail = proposal.content?.clientInfo?.email;
    if (contentEmail && contentEmail.toLowerCase() !== validation.expectedClientEmail.toLowerCase()) {
      warnings.push(`Proposal content email (${contentEmail}) doesn't match expected email (${validation.expectedClientEmail})`);
    }

    // 4. Additional validation: check if this email exists multiple times in clients table
    const { data: duplicateClients, error: duplicateError } = await supabase
      .from('clients')
      .select('id, email')
      .eq('email', validation.expectedClientEmail.toLowerCase());

    if (!duplicateError && duplicateClients && duplicateClients.length > 1) {
      warnings.push(`Multiple clients found with email ${validation.expectedClientEmail} (${duplicateClients.length} total)`);
    }

    const isValid = errors.length === 0;
    
    validationLogger.info("Client creation validation completed", {
      isValid,
      clientId,
      errorsCount: errors.length,
      warningsCount: warnings.length
    });

    return {
      isValid,
      clientId,
      errors,
      warnings
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    validationLogger.error("Client creation validation failed", { error: errorMessage });
    
    errors.push(`Validation error: ${errorMessage}`);
    return { isValid: false, errors, warnings };
  }
}

/**
 * Attempts to fix common client creation issues
 */
export async function fixClientCreationIssues(
  validation: ProposalClientValidation
): Promise<{ fixed: boolean; actions: string[] }> {
  const fixLogger = logger.withContext({
    component: 'ClientCreationFixer',
    proposalId: validation.proposalId
  });

  const actions: string[] = [];

  try {
    fixLogger.info("Attempting to fix client creation issues");

    // 1. Try to find the client by email if proposal is missing client_reference_id
    const { data: proposal } = await supabase
      .from('proposals')
      .select('id, client_reference_id, content, agent_id')
      .eq('id', validation.proposalId)
      .single();

    if (!proposal?.client_reference_id) {
      // Try to find existing client by email
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('email', validation.expectedClientEmail.toLowerCase())
        .maybeSingle();

      if (existingClient) {
        // Update proposal with existing client reference
        const { error: updateError } = await supabase
          .from('proposals')
          .update({ client_reference_id: existingClient.id })
          .eq('id', validation.proposalId);

        if (!updateError) {
          actions.push(`Linked proposal to existing client ${existingClient.id}`);
        }
      } else if (proposal?.content?.clientInfo && proposal.agent_id) {
        // Create a new client from proposal content
        const clientInfo = proposal.content.clientInfo;
        const { data: newClient, error: createError } = await supabase
          .from('clients')
          .insert({
            email: validation.expectedClientEmail.toLowerCase(),
            first_name: clientInfo.name || 'Unknown',
            company_name: clientInfo.companyName || null,
            phone: clientInfo.phone || null,
            created_by: proposal.agent_id
          })
          .select('id')
          .single();

        if (!createError && newClient) {
          // Update proposal with new client reference
          const { error: updateError } = await supabase
            .from('proposals')
            .update({ client_reference_id: newClient.id })
            .eq('id', validation.proposalId);

          if (!updateError) {
            actions.push(`Created new client ${newClient.id} and linked to proposal`);
          }
        }
      }
    }

    fixLogger.info("Client creation fix completed", { actionsCount: actions.length });
    return { fixed: actions.length > 0, actions };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    fixLogger.error("Client creation fix failed", { error: errorMessage });
    return { fixed: false, actions: [`Fix failed: ${errorMessage}`] };
  }
}
