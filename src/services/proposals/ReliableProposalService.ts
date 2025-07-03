/**
 * Enterprise-grade proposal service with invisible reliability
 * Handles all failures automatically with professional UX
 */

import { RetryService } from '@/lib/reliability/RetryService';
import { BackgroundTaskManager } from '@/lib/reliability/BackgroundTaskManager';
import { ConnectionManager } from '@/lib/reliability/ConnectionManager';
import { createProposal, searchClients } from './unifiedProposalService';
import { EligibilityCriteria, ClientInformation, ProjectInformation } from '@/types/proposals';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

export interface ReliableProposalResult {
  success: boolean;
  proposalId?: string;
  taskId?: string;
  error?: string;
  isBackground?: boolean;
}

export interface ProposalProgress {
  stage: 'validating' | 'creating_client' | 'calculating' | 'saving' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
}

export class ReliableProposalService {
  private static instance: ReliableProposalService;
  private connectionManager: ConnectionManager;
  private taskManager: BackgroundTaskManager;
  private progressCallbacks = new Map<string, (progress: ProposalProgress) => void>();

  constructor() {
    this.connectionManager = ConnectionManager.getInstance();
    this.taskManager = BackgroundTaskManager.getInstance();
  }

  static getInstance(): ReliableProposalService {
    if (!this.instance) {
      this.instance = new ReliableProposalService();
    }
    return this.instance;
  }

  /**
   * Create proposal with enterprise reliability
   */
  async createProposalReliably(
    proposalTitle: string,
    agentId: string,
    eligibilityCriteria: EligibilityCriteria,
    projectInfo: ProjectInformation,
    clientInfo: ClientInformation,
    selectedClientId?: string,
    onProgress?: (progress: ProposalProgress) => void
  ): Promise<ReliableProposalResult> {
    const operationId = `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const serviceLogger = logger.withContext({
      component: 'ReliableProposalService',
      operation: 'createProposal',
      operationId
    });

    // Register progress callback
    if (onProgress) {
      this.progressCallbacks.set(operationId, onProgress);
    }

    try {
      // Quick validation first
      this.updateProgress(operationId, {
        stage: 'validating',
        progress: 10,
        message: 'Validating proposal data...'
      });

      if (!agentId || !proposalTitle.trim()) {
        throw new Error('Invalid proposal data');
      }

      // Try immediate creation first (fast path)
      const immediateResult = await this.tryImmediateCreation(
        proposalTitle,
        agentId,
        eligibilityCriteria,
        projectInfo,
        clientInfo,
        selectedClientId,
        operationId
      );

      if (immediateResult.success) {
        this.updateProgress(operationId, {
          stage: 'completed',
          progress: 100,
          message: 'Proposal created successfully!'
        });

        serviceLogger.info('Proposal created via fast path', { proposalId: immediateResult.proposalId });
        return immediateResult;
      }

      serviceLogger.warn('Fast path failed, using background processing', { error: immediateResult.error });

      // Fall back to background processing
      return await this.createProposalInBackground(
        proposalTitle,
        agentId,
        eligibilityCriteria,
        projectInfo,
        clientInfo,
        selectedClientId,
        operationId
      );

    } catch (error) {
      serviceLogger.error('Proposal creation failed', { error });
      
      this.updateProgress(operationId, {
        stage: 'failed',
        progress: 0,
        message: 'Failed to create proposal',
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create proposal'
      };
    } finally {
      // Cleanup progress callback
      setTimeout(() => {
        this.progressCallbacks.delete(operationId);
      }, 5000);
    }
  }

  /**
   * Try immediate creation (fast path)
   */
  private async tryImmediateCreation(
    proposalTitle: string,
    agentId: string,
    eligibilityCriteria: EligibilityCriteria,
    projectInfo: ProjectInformation,
    clientInfo: ClientInformation,
    selectedClientId: string | undefined,
    operationId: string
  ): Promise<ReliableProposalResult> {
    
    return await RetryService.executeWithRetry(
      async () => {
        this.updateProgress(operationId, {
          stage: 'creating_client',
          progress: 30,
          message: 'Processing client information...'
        });

        await this.connectionManager.waitForHealthyConnection(5000);

        this.updateProgress(operationId, {
          stage: 'calculating',
          progress: 60,
          message: 'Calculating carbon credits...'
        });

        const result = await createProposal(
          proposalTitle,
          agentId,
          eligibilityCriteria,
          projectInfo,
          clientInfo,
          selectedClientId
        );

        if (!result.success) {
          throw new Error(result.error || 'Proposal creation failed');
        }

        this.updateProgress(operationId, {
          stage: 'saving',
          progress: 90,
          message: 'Finalizing proposal...'
        });

        return {
          success: true,
          proposalId: result.proposalId
        };
      },
      {
        maxAttempts: 2,
        baseDelay: 500,
        timeoutMs: 15000
      }
    ).then(result => {
      if (result.success) {
        return { success: true, proposalId: result.data!.proposalId };
      } else {
        return { success: false, error: result.error?.message };
      }
    });
  }

  /**
   * Create proposal in background with full reliability
   */
  private async createProposalInBackground(
    proposalTitle: string,
    agentId: string,
    eligibilityCriteria: EligibilityCriteria,
    projectInfo: ProjectInformation,
    clientInfo: ClientInformation,
    selectedClientId: string | undefined,
    operationId: string
  ): Promise<ReliableProposalResult> {

    this.updateProgress(operationId, {
      stage: 'saving',
      progress: 20,
      message: 'Processing in background for reliability...'
    });

    const taskId = await this.taskManager.queueTask({
      id: operationId,
      priority: 'high',
      maxRetries: 3,
      operation: async () => {
        await this.connectionManager.waitForHealthyConnection();

        this.updateProgress(operationId, {
          stage: 'creating_client',
          progress: 40,
          message: 'Creating client profile...'
        });

        const result = await createProposal(
          proposalTitle,
          agentId,
          eligibilityCriteria,
          projectInfo,
          clientInfo,
          selectedClientId
        );

        if (!result.success) {
          throw new Error(result.error || 'Background creation failed');
        }

        this.updateProgress(operationId, {
          stage: 'completed',
          progress: 100,
          message: 'Proposal created successfully!'
        });

        return result.proposalId;
      },
      onError: (error) => {
        this.updateProgress(operationId, {
          stage: 'failed',
          progress: 0,
          message: 'Failed to create proposal',
          error: error.message
        });
      }
    });

    return {
      success: true,
      taskId,
      isBackground: true
    };
  }

  /**
   * Update progress for operation
   */
  private updateProgress(operationId: string, progress: ProposalProgress): void {
    const callback = this.progressCallbacks.get(operationId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string) {
    return this.taskManager.getTaskStatus(taskId);
  }

  /**
   * Wait for background task completion
   */
  async waitForTask<T>(taskId: string, timeoutMs = 30000): Promise<T> {
    return this.taskManager.waitForTask<T>(taskId, timeoutMs);
  }

  /**
   * Search clients with reliability
   */
  async searchClientsReliably(searchTerm: string): Promise<any[]> {
    const result = await RetryService.executeWithRetry(
      () => this.connectionManager.executeWithHealthCheck(() => searchClients(searchTerm)),
      {
        maxAttempts: 2,
        baseDelay: 300,
        timeoutMs: 10000
      }
    );

    if (result.success) {
      return result.data || [];
    } else {
      logger.error('Client search failed', { error: result.error?.message });
      return [];
    }
  }

  /**
   * Submit proposal for review with reliability
   */
  async submitProposalReliably(proposalId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const result = await RetryService.executeWithRetry(
      () => this.connectionManager.executeWithHealthCheck(async () => {
        const { data, error } = await supabase
          .from('proposals')
          .update({ status: 'pending' })
          .eq('id', proposalId)
          .eq('agent_id', userId)
          .eq('status', 'draft')
          .select();

        if (error) throw error;
        return data;
      }),
      {
        maxAttempts: 3,
        baseDelay: 1000,
        timeoutMs: 15000
      }
    );

    return {
      success: result.success,
      error: result.error?.message
    };
  }
}