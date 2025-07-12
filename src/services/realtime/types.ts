/**
 * Types and interfaces for the realtime service
 */
export interface SubscriptionConfig {
  channelKey: string;
  userId: string;
  userRole?: string;
  onUpdate: (payload: any) => void;
}

export interface ChannelSubscription {
  channel: any;
  count: number;
}

export type SubscriptionEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface PostgresChangesConfig {
  event: SubscriptionEvent;
  schema: string;
  table: string;
  filter?: string;
}