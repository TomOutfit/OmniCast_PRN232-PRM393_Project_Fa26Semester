// ============================================================
// OmniCast - Live Stream WebSocket Gateway
// ============================================================
//
// Real-time WebSocket gateway for live streaming notifications.
// When Admin/Staff starts or stops a live stream, this gateway
// broadcasts events to all connected viewers so they can:
//   - See LIVE badge appear/disappear
//   - Auto-switch to the live stream
//   - Get real-time viewer count updates
//
// Events emitted:
//   - live:started   → when Admin starts streaming
//   - live:stopped   → when Admin stops streaming
//   - live:viewerCount → periodic viewer count update
//
// Events listened:
//   - subscribe:channel    → join a channel room
//   - unsubscribe:channel  → leave a channel room
// ============================================================

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

export interface LiveEventPayload {
  eventId: string;
  title: string;
  streamUrl: string;
  hlsUrl?: string;
  thumbnailUrl?: string;
  startedAt: string;
  duration?: number;
}

export interface LiveStoppedPayload {
  eventId: string;
  reason?: string;
  stoppedAt: string;
}

export interface ViewerCountPayload {
  channelSlug: string;
  viewerCount: number;
}

interface ClientInfo {
  userId?: string;
  channelSlug?: string;
  joinedAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/live',
  pingInterval: 25000,
  pingTimeout: 20000,
})
export class LiveStreamGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(LiveStreamGateway.name);
  private readonly connectedClients = new Map<string, ClientInfo>();

  constructor(private readonly configService: ConfigService) {}

  // ============================================================
  // Connection Lifecycle
  // ============================================================

  handleConnection(client: Socket) {
    this.connectedClients.set(client.id, {
      joinedAt: new Date(),
    });
    this.logger.log(`Client connected: ${client.id} (total: ${this.connectedClients.size})`);
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    this.connectedClients.delete(client.id);
    this.logger.log(
      `Client disconnected: ${client.id} (was on channel: ${clientInfo?.channelSlug ?? 'none'}) (total: ${this.connectedClients.size})`,
    );
  }

  // ============================================================
  // Channel Subscription
  // ============================================================

  @SubscribeMessage('subscribe:channel')
  handleSubscribeChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() channelSlug: string,
  ) {
    const roomName = `channel:${channelSlug}`;
    client.join(roomName);

    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      clientInfo.channelSlug = channelSlug;
    }

    const viewerCount = this.getRoomSize(channelSlug);
    this.logger.log(`Client ${client.id} subscribed to ${roomName} (viewers: ${viewerCount})`);

    // Send current live status to newly connected viewer
    // This will be populated by LiveStudioService when events are active
    return {
      event: 'subscribed',
      data: {
        channelSlug,
        viewerCount,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @SubscribeMessage('unsubscribe:channel')
  handleUnsubscribeChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() channelSlug: string,
  ) {
    const roomName = `channel:${channelSlug}`;
    client.leave(roomName);

    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      clientInfo.channelSlug = undefined;
    }

    this.logger.log(`Client ${client.id} unsubscribed from ${roomName}`);
    return { event: 'unsubscribed', data: { channelSlug } };
  }

  // ============================================================
  // WebRTC Signaling Events (for mobile push-to-live)
  // ============================================================

  /**
   * Handle incoming WebRTC offer from mobile broadcaster.
   * Mobile sends offer → Server relays to viewers → Viewers send answer back.
   */
  @SubscribeMessage('webrtc:offer')
  handleWebRtcOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelSlug: string; sdp: string },
  ) {
    const roomName = `channel:${data.channelSlug}`;
    
    // Log the event
    this.logger.log(
      `WebRTC offer from ${client.id} for channel ${data.channelSlug}`,
    );

    // Broadcast offer to all viewers in the channel
    // Viewers will respond with 'webrtc:answer'
    client.to(roomName).emit('webrtc:offer', {
      broadcasterId: client.id,
      sdp: data.sdp,
      timestamp: new Date().toISOString(),
    });

    return { event: 'webrtc:offer-ack', data: { received: true } };
  }

  /**
   * Handle incoming WebRTC answer from a viewer.
   * Viewer sends answer → Server relays to the broadcaster.
   */
  @SubscribeMessage('webrtc:answer')
  handleWebRtcAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { broadcasterId: string; sdp: string },
  ) {
    this.logger.log(
      `WebRTC answer from viewer ${client.id} to broadcaster ${data.broadcasterId}`,
    );

    // Send answer back to the specific broadcaster
    this.server.to(data.broadcasterId).emit('webrtc:answer', {
      viewerId: client.id,
      sdp: data.sdp,
      timestamp: new Date().toISOString(),
    });

    return { event: 'webrtc:answer-ack', data: { received: true } };
  }

  /**
   * Handle ICE candidate exchange.
   * Bidirectional: broadcaster ↔ viewers.
   */
  @SubscribeMessage('webrtc:ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetId?: string; channelSlug?: string; candidate: any },
  ) {
    if (data.targetId) {
      // Direct message to specific client
      this.server.to(data.targetId).emit('webrtc:ice-candidate', {
        fromId: client.id,
        candidate: data.candidate,
      });
    } else if (data.channelSlug) {
      // Broadcast to channel room (for broadcaster sending to all viewers)
      const roomName = `channel:${data.channelSlug}`;
      client.to(roomName).emit('webrtc:ice-candidate', {
        fromId: client.id,
        candidate: data.candidate,
      });
    }

    return { event: 'webrtc:ice-ack', data: { received: true } };
  }

  // ============================================================
  // Heartbeat / Health Check
  // ============================================================

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { event: 'pong', data: { timestamp: Date.now() } };
  }

  // ============================================================
  // Public Broadcast Methods (called by services)
  // ============================================================

  /**
   * Broadcast "live started" event to all viewers of a channel.
   * Called by LiveStudioService when Admin starts a live stream.
   */
  notifyLiveStarted(channelSlug: string, payload: LiveEventPayload) {
    const roomName = `channel:${channelSlug}`;
    const broadcastData = {
      ...payload,
      channelSlug,
      timestamp: new Date().toISOString(),
    };
    this.server.to(roomName).emit('live:started', broadcastData);
    // Broadcast globally to all connected viewers so in-app notifications appear everywhere
    this.server.emit('live:started', broadcastData);
    this.logger.log(
      `Broadcast live:started globally and to ${roomName} - "${payload.title}" (eventId: ${payload.eventId})`,
    );
  }

  /**
   * Broadcast "live stopped" event to all viewers of a channel.
   * Called by LiveStudioService when Admin stops a live stream.
   */
  notifyLiveStopped(channelSlug: string, payload: LiveStoppedPayload) {
    const roomName = `channel:${channelSlug}`;
    const broadcastData = {
      ...payload,
      channelSlug,
      timestamp: new Date().toISOString(),
    };
    this.server.to(roomName).emit('live:stopped', broadcastData);
    this.server.emit('live:stopped', broadcastData);
    this.logger.log(
      `Broadcast live:stopped globally and to ${roomName} - (eventId: ${payload.eventId})`,
    );
  }

  /**
   * Broadcast viewer count update to all viewers of a channel.
   * Can be called periodically by a background job.
   */
  notifyViewerCount(channelSlug: string, viewerCount: number) {
    const roomName = `channel:${channelSlug}`;
    this.server.to(roomName).emit('live:viewerCount', {
      channelSlug,
      viewerCount,
      timestamp: new Date().toISOString(),
    } as ViewerCountPayload);
  }

  /**
   * Send a direct message to a specific client (e.g., for auth errors).
   */
  sendToClient(clientId: string, event: string, data: unknown) {
    this.server.to(clientId).emit(event, data);
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * Get the number of connected clients in a channel room.
   */
  getRoomSize(channelSlug: string): number {
    const room = this.server.sockets.adapter.rooms.get(`channel:${channelSlug}`);
    return room?.size ?? 0;
  }

  /**
   * Get all channel slugs that currently have active viewers.
   */
  getActiveChannels(): string[] {
    const channels: string[] = [];
    this.server.sockets.adapter.rooms.forEach((_: any, roomName: string) => {
      if (roomName.startsWith('channel:')) {
        channels.push(roomName.replace('channel:', ''));
      }
    });
    return channels;
  }

  /**
   * Get total connected clients across all channels.
   */
  getTotalConnections(): number {
    return this.connectedClients.size;
  }
}
