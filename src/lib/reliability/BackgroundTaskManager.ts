/**
 * Background task manager for invisible processing
 * Handles long-running operations without blocking UI
 */

import { logger } from '@/lib/logger';

export interface BackgroundTask<T = any> {
  id: string;
  operation: () => Promise<T>;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  maxRetries?: number;
  priority?: 'low' | 'normal' | 'high';
}

export interface TaskStatus<T = any> {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
  result?: T;
  error?: Error;
  progress?: number;
  retryCount?: number;
  startedAt?: Date;
  completedAt?: Date;
}

export class BackgroundTaskManager {
  private static instance: BackgroundTaskManager;
  private tasks = new Map<string, TaskStatus>();
  private queue: BackgroundTask[] = [];
  private running = new Set<string>();
  private maxConcurrent = 3;

  static getInstance(): BackgroundTaskManager {
    if (!this.instance) {
      this.instance = new BackgroundTaskManager();
    }
    return this.instance;
  }

  /**
   * Queue a background task for execution
   */
  async queueTask<T>(task: BackgroundTask<T>): Promise<string> {
    const taskLogger = logger.withContext({
      component: 'BackgroundTaskManager',
      taskId: task.id
    });

    this.tasks.set(task.id, {
      id: task.id,
      status: 'pending',
      retryCount: 0
    });

    this.queue.push(task);
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return (priorityOrder[b.priority || 'normal'] || 2) - (priorityOrder[a.priority || 'normal'] || 2);
    });

    taskLogger.info('Task queued', { priority: task.priority });
    
    // Start processing queue
    this.processQueue();
    
    return task.id;
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): TaskStatus | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Process the task queue
   */
  private async processQueue(): Promise<void> {
    if (this.running.size >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.running.add(task.id);
    
    const taskStatus = this.tasks.get(task.id);
    if (taskStatus) {
      taskStatus.status = 'running';
      taskStatus.startedAt = new Date();
    }

    const taskLogger = logger.withContext({
      component: 'BackgroundTaskManager',
      taskId: task.id
    });

    try {
      taskLogger.info('Starting background task');
      
      const result = await task.operation();
      
      const status = this.tasks.get(task.id);
      if (status) {
        status.status = 'completed';
        status.result = result;
        status.completedAt = new Date();
      }

      taskLogger.info('Background task completed successfully');
      
      if (task.onSuccess) {
        task.onSuccess(result);
      }
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      const status = this.tasks.get(task.id);
      const retryCount = (status?.retryCount || 0) + 1;
      const maxRetries = task.maxRetries || 2;

      if (retryCount <= maxRetries) {
        taskLogger.warn(`Background task failed, retrying (${retryCount}/${maxRetries})`, { error: err.message });
        
        if (status) {
          status.status = 'retrying';
          status.retryCount = retryCount;
          status.error = err;
        }

        // Re-queue with delay
        setTimeout(() => {
          this.queue.unshift(task);
          this.processQueue();
        }, Math.pow(2, retryCount) * 1000);
        
      } else {
        taskLogger.error('Background task failed permanently', { error: err.message, retryCount });
        
        if (status) {
          status.status = 'failed';
          status.error = err;
          status.completedAt = new Date();
        }

        if (task.onError) {
          task.onError(err);
        }
      }
    } finally {
      this.running.delete(task.id);
      
      if (task.onComplete) {
        task.onComplete();
      }
      
      // Continue processing queue
      this.processQueue();
    }
  }

  /**
   * Wait for a task to complete
   */
  async waitForTask<T>(taskId: string, timeoutMs = 30000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Task ${taskId} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const checkStatus = () => {
        const status = this.tasks.get(taskId);
        if (!status) {
          clearTimeout(timeout);
          reject(new Error(`Task ${taskId} not found`));
          return;
        }

        if (status.status === 'completed') {
          clearTimeout(timeout);
          resolve(status.result);
        } else if (status.status === 'failed') {
          clearTimeout(timeout);
          reject(status.error || new Error(`Task ${taskId} failed`));
        } else {
          // Check again in 100ms
          setTimeout(checkStatus, 100);
        }
      };

      checkStatus();
    });
  }
}