import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'pong';
  table?: string;
  userId?: string;
  userRole?: string;
  filter?: string;
  timestamp?: number;
}

interface ActiveSubscription {
  userId: string;
  userRole: string;
  table: string;
  filter?: string;
  socket: WebSocket;
}

class RealtimeWebSocketServer {
  private activeSubscriptions = new Map<string, ActiveSubscription>();
  private supabase: any;

  constructor() {
    // Initialize Supabase client with service role for real-time access
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  async handleConnection(request: Request): Promise<Response> {
    const { headers } = request;
    const upgradeHeader = headers.get("upgrade") || "";

    if (upgradeHeader.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket connection", { status: 400 });
    }

    // Verify authentication
    const authHeader = headers.get("authorization");
    if (!authHeader) {
      return new Response("Authentication required", { status: 401 });
    }

    const { socket, response } = Deno.upgradeWebSocket(request);
    
    socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    socket.onmessage = (event) => {
      this.handleMessage(socket, event.data);
    };

    socket.onclose = () => {
      this.cleanupSocketSubscriptions(socket);
      console.log("WebSocket connection closed");
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.cleanupSocketSubscriptions(socket);
    };

    return response;
  }

  private async handleMessage(socket: WebSocket, data: string) {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      switch (message.type) {
        case 'subscribe':
          await this.handleSubscribe(socket, message);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(socket, message);
          break;
        case 'ping':
          this.handlePing(socket, message);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      socket.send(JSON.stringify({ 
        type: 'error', 
        message: 'Invalid message format' 
      }));
    }
  }

  private async handleSubscribe(socket: WebSocket, message: WebSocketMessage) {
    const { table, userId, userRole, filter } = message;
    
    if (!table || !userId || !userRole) {
      socket.send(JSON.stringify({ 
        type: 'error', 
        message: 'Missing required subscription parameters' 
      }));
      return;
    }

    const subscriptionKey = `${table}-${userId}-${userRole}`;
    
    // Store subscription
    this.activeSubscriptions.set(subscriptionKey, {
      userId,
      userRole,
      table,
      filter,
      socket
    });

    // Setup Supabase real-time subscription with enhanced filtering
    const channel = this.supabase
      .channel(subscriptionKey)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: this.buildFilter(table, userId, userRole, filter)
        },
        (payload: any) => {
          // Enhanced payload processing
          const enhancedPayload = this.enhancePayload(payload, table);
          
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'update',
              table,
              data: enhancedPayload,
              timestamp: Date.now()
            }));
          }
        }
      )
      .subscribe();

    console.log(`Subscription created: ${subscriptionKey}`);
    
    socket.send(JSON.stringify({ 
      type: 'subscribed', 
      table,
      subscriptionKey 
    }));
  }

  private buildFilter(table: string, userId: string, userRole: string, customFilter?: string): string | undefined {
    if (customFilter) return customFilter;

    switch (table) {
      case 'proposals':
        if (userRole === 'agent') {
          return `agent_id=eq.${userId}`;
        } else if (userRole === 'client') {
          return `or(client_id.eq.${userId},client_reference_id.eq.${userId})`;
        }
        return undefined; // Admin gets all
      
      case 'notifications':
        return `user_id=eq.${userId}`;
      
      case 'profiles':
        if (userRole === 'admin') {
          return 'role=eq.agent'; // Admin sees all agents
        }
        return `id=eq.${userId}`; // Users see own profile
      
      default:
        return undefined;
    }
  }

  private enhancePayload(payload: any, table: string): any {
    // Add table-specific enhancements
    const enhanced = {
      ...payload,
      enhanced: true,
      processedAt: Date.now()
    };

    // Add performance metadata
    if (table === 'proposals') {
      enhanced.significanceLevel = this.calculateSignificanceLevel(payload);
    }

    return enhanced;
  }

  private calculateSignificanceLevel(payload: any): 'high' | 'medium' | 'low' {
    if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
      return 'high';
    }

    const criticalFields = ['status', 'signed_at', 'archived_at', 'deleted_at'];
    const importantFields = ['title', 'carbon_credits', 'system_size_kwp'];

    if (criticalFields.some(field => payload.old?.[field] !== payload.new?.[field])) {
      return 'high';
    }

    if (importantFields.some(field => payload.old?.[field] !== payload.new?.[field])) {
      return 'medium';
    }

    return 'low';
  }

  private handleUnsubscribe(socket: WebSocket, message: WebSocketMessage) {
    const { table, userId, userRole } = message;
    const subscriptionKey = `${table}-${userId}-${userRole}`;
    
    this.activeSubscriptions.delete(subscriptionKey);
    console.log(`Subscription removed: ${subscriptionKey}`);
    
    socket.send(JSON.stringify({ 
      type: 'unsubscribed', 
      table,
      subscriptionKey 
    }));
  }

  private handlePing(socket: WebSocket, message: WebSocketMessage) {
    socket.send(JSON.stringify({ 
      type: 'pong', 
      timestamp: Date.now(),
      originalTimestamp: message.timestamp 
    }));
  }

  private cleanupSocketSubscriptions(socket: WebSocket) {
    const toDelete: string[] = [];
    
    for (const [key, subscription] of this.activeSubscriptions.entries()) {
      if (subscription.socket === socket) {
        toDelete.push(key);
      }
    }
    
    toDelete.forEach(key => {
      this.activeSubscriptions.delete(key);
      console.log(`Cleaned up subscription: ${key}`);
    });
  }
}

// Initialize the WebSocket server
const server = new RealtimeWebSocketServer();

serve(async (req) => {
  return server.handleConnection(req);
});