/**
 * Enterprise reliability infrastructure exports
 */

export { RetryService } from './RetryService';
export type { RetryConfig, RetryResult } from './RetryService';

export { BackgroundTaskManager } from './BackgroundTaskManager';
export type { BackgroundTask, TaskStatus } from './BackgroundTaskManager';

export { ConnectionManager } from './ConnectionManager';
export type { ConnectionHealth } from './ConnectionManager';

// Initialize services on import
import { ConnectionManager } from './ConnectionManager';
import { BackgroundTaskManager } from './BackgroundTaskManager';

// Start connection monitoring
ConnectionManager.getInstance();

// Initialize task manager
BackgroundTaskManager.getInstance();