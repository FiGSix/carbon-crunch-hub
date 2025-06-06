
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface ClientCreationStats {
  totalProposals: number;
  proposalsWithClients: number;
  proposalsMissingClients: number;
  duplicateClients: number;
  inconsistentEmails: number;
}

/**
 * Monitors client creation and database consistency
 */
export async function getClientCreationStats(): Promise<ClientCreationStats> {
  const monitorLogger = logger.withContext({
    component: 'ClientCreationMonitor'
  });

  try {
    // Get total proposals
    const { count: totalProposals } = await supabase
      .from('proposals')
      .select('*', { count: 'exact', head: true })
      .not('deleted_at', 'is', null);

    // Get proposals with client_reference_id
    const { count: proposalsWithClients } = await supabase
      .from('proposals')
      .select('*', { count: 'exact', head: true })
      .not('client_reference_id', 'is', null)
      .not('deleted_at', 'is', null);

    // Get proposals missing client_reference_id
    const { count: proposalsMissingClients } = await supabase
      .from('proposals')
      .select('*', { count: 'exact', head: true })
      .is('client_reference_id', null)
      .not('deleted_at', 'is', null);

    // Check for duplicate client emails
    const { data: emailCounts } = await supabase
      .from('clients')
      .select('email')
      .not('email', 'is', null);

    const emailFrequency = emailCounts?.reduce((acc, { email }) => {
      acc[email] = (acc[email] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const duplicateClients = Object.values(emailFrequency).filter(count => count > 1).length;

    // Check for email inconsistencies between proposals and clients
    const { data: proposalEmails } = await supabase
      .from('proposals')
      .select('id, content, client_reference_id')
      .not('client_reference_id', 'is', null)
      .not('deleted_at', 'is', null);

    let inconsistentEmails = 0;
    
    if (proposalEmails) {
      for (const proposal of proposalEmails) {
        const proposalEmail = proposal.content?.clientInfo?.email;
        if (proposalEmail && proposal.client_reference_id) {
          const { data: client } = await supabase
            .from('clients')
            .select('email')
            .eq('id', proposal.client_reference_id)
            .single();

          if (client && client.email.toLowerCase() !== proposalEmail.toLowerCase()) {
            inconsistentEmails++;
          }
        }
      }
    }

    const stats: ClientCreationStats = {
      totalProposals: totalProposals || 0,
      proposalsWithClients: proposalsWithClients || 0,
      proposalsMissingClients: proposalsMissingClients || 0,
      duplicateClients,
      inconsistentEmails
    };

    monitorLogger.info("Client creation stats collected", stats);
    return stats;

  } catch (error) {
    monitorLogger.error("Failed to collect client creation stats", { error });
    return {
      totalProposals: 0,
      proposalsWithClients: 0,
      proposalsMissingClients: 0,
      duplicateClients: 0,
      inconsistentEmails: 0
    };
  }
}

/**
 * Runs a health check on client creation and returns issues found
 */
export async function runClientCreationHealthCheck(): Promise<{
  isHealthy: boolean;
  issues: string[];
  recommendations: string[];
}> {
  const stats = await getClientCreationStats();
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check for missing client references
  if (stats.proposalsMissingClients > 0) {
    issues.push(`${stats.proposalsMissingClients} proposals are missing client references`);
    recommendations.push("Run the populate_missing_client_references() function to fix missing references");
  }

  // Check for duplicate clients
  if (stats.duplicateClients > 0) {
    issues.push(`${stats.duplicateClients} duplicate client email addresses found`);
    recommendations.push("Review and merge duplicate client records");
  }

  // Check for email inconsistencies
  if (stats.inconsistentEmails > 0) {
    issues.push(`${stats.inconsistentEmails} proposals have email mismatches with their linked clients`);
    recommendations.push("Review and fix email inconsistencies between proposals and clients");
  }

  // Check completion rate
  const completionRate = stats.totalProposals > 0 
    ? (stats.proposalsWithClients / stats.totalProposals) * 100 
    : 0;

  if (completionRate < 95) {
    issues.push(`Only ${completionRate.toFixed(1)}% of proposals have proper client references`);
    recommendations.push("Investigate and fix client creation workflow issues");
  }

  const isHealthy = issues.length === 0;

  logger.withContext({ component: 'ClientCreationHealthCheck' }).info("Health check completed", {
    isHealthy,
    issuesCount: issues.length,
    completionRate
  });

  return {
    isHealthy,
    issues,
    recommendations
  };
}
