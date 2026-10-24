// ============================================================
// OmniCast - Live Stream WebSocket Gateway
// ============================================================
//
// Real-time WebSocket gateway for live streaming notifications,
// two-way chat, reactions, and viewer counts.
//
// Events emitted to room `event:{eventId}`:
//   - live:chat:new       → new comment in the live event
//   - live:reaction:new   → reaction updated in the live event
//   - broadcaster:message → pinned announcement from Staff/Admin
//   - chat:deleted        → moderated comment removed
//   - live:viewerCount    → live viewer count update
//
// Events emitted to room `channel:{channelSlug}` and globally:
//   - live:started        → when Admin starts streaming
//   - live:stopped        → when Admin stops streaming
//
// Events listened:
//   - subscribe:event / unsubscribe:event
//   - subscribe:channel / unsubscribe:channel
//   - live:chat
//   - live:reaction
//   - broadcaster:message
//   - chat:delete
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
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SocialService } from '../programs/social.service';
import { ReactionType } from '@prisma/client';

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
  channelSlug?: string;
  eventId?: string;
  viewerCount: number;
  timestamp: string;
}

interface ClientInfo {
  userId?: string;
  role?: string;
  name?: string;
  channelSlug?: string;
  eventId?: string;
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
export class LiveStreamGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(LiveStreamGateway.name);
  private readonly connectedClients = new Map<string, ClientInfo>();

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SocialService))
    private readonly socialService: SocialService,
  ) {}

  // ============================================================
  // Connection Lifecycle
  // ============================================================

  async handleConnection(client: Socket) {
    const rawToken =
      (client.handshake.auth?.token as string) ||
      (client.handshake.headers?.authorization
        ? (client.handshake.headers.authorization as string).replace(
            /^Bearer\s+/i,
            '',
          )
        : null);

    let userId: string | undefined;
    let role: string | undefined;
    let name: string | undefined;

    if (rawToken && rawToken.trim()) {
      try {
        const decoded: any = await this.jwtService.verifyAsync(
          rawToken.trim(),
          {
            secret: this.configService.get<string>('JWT_SECRET'),
          },
        );
        userId = decoded.sub || decoded.userId || decoded.id;
        role = decoded.role;
        name = decoded.name || decoded.fullName;
        client.data = { userId, role, name };
      } catch (err) {
        this.logger.warn(
          `Invalid/expired JWT token on socket ${client.id}: ${(err as Error).message}`,
        );
        client.emit('auth:error', {
          message: 'Invalid or expired authentication token',
        });
        client.disconnect(true);
        return;
      }
    }

    this.connectedClients.set(client.id, {
      userId,
      role,
      name,
      joinedAt: new Date(),
    });

    this.logger.log(
      `Client connected: ${client.id} (user: ${userId ?? 'guest'}, role: ${role ?? 'none'}) (total: ${this.connectedClients.size})`,
    );
  }

  async handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    this.connectedClients.delete(client.id);

    if (clientInfo?.eventId) {
      const remainingCount = this.getEventRoomSize(clientInfo.eventId);
      this.notifyViewerCountForEvent(clientInfo.eventId, remainingCount);
    }

    this.logger.log(
      `Client disconnected: ${client.id} (event: ${clientInfo?.eventId ?? 'none'}, channel: ${clientInfo?.channelSlug ?? 'none'}) (total: ${this.connectedClients.size})`,
    );
  }

  // ============================================================
  // Event-specific Room Subscription (event:{eventId})
  // ============================================================

  @SubscribeMessage('subscribe:event')
  async handleSubscribeEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { eventId?: string } | string,
  ) {
    const eventId =
      typeof payload === 'string' ? payload : payload?.eventId;
    if (!eventId) {
      return { error: 'eventId is required' };
    }

    const roomName = `event:${eventId}`;
    await client.join(roomName);

    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      clientInfo.eventId = eventId;
    }

    const viewerCount = this.getEventRoomSize(eventId);
    this.logger.log(
      `Client ${client.id} joined ${roomName} (viewers: ${viewerCount})`,
    );

    // Broadcast updated viewer count to everyone in the live event room
    this.notifyViewerCountForEvent(eventId, viewerCount);

    return {
      event: 'subscribed:event',
      data: {
        eventId,
        viewerCount,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @SubscribeMessage('unsubscribe:event')
  async handleUnsubscribeEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { eventId?: string } | string,
  ) {
    const eventId =
      typeof payload === 'string' ? payload : payload?.eventId;
    if (!eventId) {
      return { error: 'eventId is required' };
    }

    const roomName = `event:${eventId}`;
    await client.leave(roomName);

    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo && clientInfo.eventId === eventId) {
      clientInfo.eventId = undefined;
    }

    const viewerCount = this.getEventRoomSize(eventId);
    this.notifyViewerCountForEvent(eventId, viewerCount);

    this.logger.log(`Client ${client.id} left ${roomName}`);
    return { event: 'unsubscribed:event', data: { eventId } };
  }

  // ============================================================
  // Two-way Real-time Chat & Reactions
  // ============================================================

  @SubscribeMessage('live:chat')
  async handleLiveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      eventId: string;
      content: string;
      parentId?: string;
    },
  ) {
    const userId = client.data?.userId;
    if (!userId) {
      return { error: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để bình luận' };
    }
    if (!payload?.eventId || !payload?.content?.trim()) {
      return { error: 'BAD_REQUEST', message: 'Nội dung bình luận không được rỗng' };
    }

    try {
      const comment = await this.socialService.createCommentForLiveEvent(
        payload.eventId,
        userId,
        {
          content: payload.content.trim(),
          parentId: payload.parentId,
        },
      );

      return { success: true, comment };
    } catch (err) {
      this.logger.warn(`Failed to post live chat: ${(err as Error).message}`);
      return {
        error: 'CHAT_FAILED',
        message: (err as Error).message || 'Không thể gửi bình luận',
      };
    }
  }

  @SubscribeMessage('live:reaction')
  async handleLiveReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      eventId: string;
      type: ReactionType;
    },
  ) {
    const userId = client.data?.userId;
    if (!userId) {
      return { error: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để thả cảm xúc' };
    }
    if (!payload?.eventId || !payload?.type) {
      return { error: 'BAD_REQUEST', message: 'Thiếu eventId hoặc loại cảm xúc' };
    }

    try {
      const res = await this.socialService.toggleReactionByLiveEvent(
        payload.eventId,
        userId,
        payload.type,
      );

      return { success: true, ...res };
    } catch (err) {
      this.logger.warn(`Failed to toggle reaction: ${(err as Error).message}`);
      return { error: 'REACTION_FAILED', message: (err as Error).message };
    }
  }

  @SubscribeMessage('broadcaster:message')
  async handleBroadcasterMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      eventId: string;
      message: string;
    },
  ) {
    const role = client.data?.role;
    if (role !== 'STAFF' && role !== 'ADMIN') {
      return {
        error: 'FORBIDDEN',
        message: 'Chỉ Staff hoặc Admin mới có quyền phát thông điệp trên live stream',
      };
    }
    if (!payload?.eventId || !payload?.message?.trim()) {
      return { error: 'BAD_REQUEST', message: 'Nội dung thông điệp không được rỗng' };
    }

    const roomName = `event:${payload.eventId}`;
    const broadcastPayload = {
      eventId: payload.eventId,
      message: payload.message.trim(),
      senderName: client.data?.name || 'Broadcaster',
      senderRole: role,
      timestamp: new Date().toISOString(),
    };

    this.server.to(roomName).emit('broadcaster:message', broadcastPayload);
    this.logger.log(
      `Broadcaster message in ${roomName} from ${client.id} (${client.data?.name}): "${payload.message}"`,
    );

    return { success: true, ...broadcastPayload };
  }

  @SubscribeMessage('chat:delete')
  async handleChatDelete(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      eventId: string;
      commentId: string;
    },
  ) {
    const userId = client.data?.userId;
    const role = client.data?.role;
    if (!userId) {
      return { error: 'UNAUTHORIZED' };
    }
    if (role !== 'STAFF' && role !== 'ADMIN') {
      return {
        error: 'FORBIDDEN',
        message: 'Chỉ Staff hoặc Admin mới có quyền xoá bình luận',
      };
    }

    try {
      await this.socialService.deleteComment(
        payload.commentId,
        userId,
        role,
      );

      return { success: true, commentId: payload.commentId };
    } catch (err) {
      return { error: 'DELETE_FAILED', message: (err as Error).message };
    }
  }

  // ============================================================
  // Channel Subscription (Legacy & Channel Viewfinder)
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
    this.logger.log(
      `Client ${client.id} subscribed to ${roomName} (viewers: ${viewerCount})`,
    );

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
  // WebRTC Signaling Events
  // ============================================================

  @SubscribeMessage('webrtc:offer')
  handleWebRtcOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelSlug: string; sdp: string },
  ) {
    const roomName = `channel:${data.channelSlug}`;
    client.to(roomName).emit('webrtc:offer', {
      broadcasterId: client.id,
      sdp: data.sdp,
      timestamp: new Date().toISOString(),
    });
    return { event: 'webrtc:offer-ack', data: { received: true } };
  }

  @SubscribeMessage('webrtc:answer')
  handleWebRtcAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { broadcasterId: string; sdp: string },
  ) {
    this.server.to(data.broadcasterId).emit('webrtc:answer', {
      viewerId: client.id,
      sdp: data.sdp,
      timestamp: new Date().toISOString(),
    });
    return { event: 'webrtc:answer-ack', data: { received: true } };
  }

  @SubscribeMessage('webrtc:ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { targetId?: string; channelSlug?: string; candidate: any },
  ) {
    if (data.targetId) {
      this.server.to(data.targetId).emit('webrtc:ice-candidate', {
        fromId: client.id,
        candidate: data.candidate,
      });
    } else if (data.channelSlug) {
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

  notifyLiveStarted(channelSlug: string, payload: LiveEventPayload) {
    const roomName = `channel:${channelSlug}`;
    const broadcastData = {
      ...payload,
      channelSlug,
      timestamp: new Date().toISOString(),
    };
    this.server?.to(roomName).emit('live:started', broadcastData);
    this.server?.emit('live:started', broadcastData);
    this.logger.log(
      `Broadcast live:started globally and to ${roomName} - "${payload.title}" (eventId: ${payload.eventId})`,
    );
  }

  notifyLiveStopped(channelSlug: string, payload: LiveStoppedPayload) {
    const roomName = `channel:${channelSlug}`;
    const broadcastData = {
      ...payload,
      channelSlug,
      timestamp: new Date().toISOString(),
    };
    this.server?.to(roomName).emit('live:stopped', broadcastData);
    this.server?.emit('live:stopped', broadcastData);
    this.logger.log(
      `Broadcast live:stopped globally and to ${roomName} - (eventId: ${payload.eventId})`,
    );
  }

  notifyViewerCount(channelSlug: string, viewerCount: number) {
    const roomName = `channel:${channelSlug}`;
    this.server?.to(roomName).emit('live:viewerCount', {
      channelSlug,
      viewerCount,
      timestamp: new Date().toISOString(),
    } as ViewerCountPayload);
  }

  /**
   * Broadcast viewer count update to an event room and persist to DB.
   */
  async notifyViewerCountForEvent(eventId: string, viewerCount?: number) {
    const count =
      typeof viewerCount === 'number'
        ? viewerCount
        : this.getEventRoomSize(eventId);

    const roomName = `event:${eventId}`;
    this.server?.to(roomName).emit('live:viewerCount', {
      eventId,
      viewerCount: count,
      timestamp: new Date().toISOString(),
    });

    try {
      await this.prisma.liveEvent.update({
        where: { id: eventId },
        data: { viewerCount: count },
      });
    } catch (_) {
      // Non-fatal if event row doesn't exist
    }
  }

  sendToClient(clientId: string, event: string, data: unknown) {
    this.server?.to(clientId).emit(event, data);
  }

  notifyCommentCreated(eventId: string, comment: any) {
    const roomName = `event:${eventId}`;
    this.server?.to(roomName).emit('live:chat:new', {
      eventId,
      comment,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Broadcasted live:chat:new to ${roomName} (commentId: ${comment?.id})`);
  }

  notifyReactionUpdated(payload: {
    eventId: string;
    userId: string;
    type: ReactionType;
    toggled: boolean;
    counts: Record<string, number>;
    total: number;
  }) {
    this.server?.to(`event:${payload.eventId}`).emit('live:reaction:new', {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  notifyCommentDeleted(eventId: string, commentId: string) {
    const roomName = `event:${eventId}`;
    this.server?.to(roomName).emit('chat:deleted', {
      eventId,
      commentId,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Broadcasted chat:deleted to ${roomName} (commentId: ${commentId})`);
  }

  notifyProgramChanged(
    eventId: string,
    payload: {
      title: string;
      streamUrl: string;
      recordingId: string;
      description?: string;
    },
  ) {
    const roomName = `event:${eventId}`;
    const broadcastData = {
      eventId,
      ...payload,
      timestamp: new Date().toISOString(),
    };
    this.server?.to(roomName).emit('live:program:changed', broadcastData);
    this.logger.log(
      `Broadcasted live:program:changed to ${roomName} - "${payload.title}"`,
    );
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  getRoomSize(channelSlug: string): number {
    const room = this.server?.sockets?.adapter?.rooms?.get(
      `channel:${channelSlug}`,
    );
    return room?.size ?? 0;
  }

  getEventRoomSize(eventId: string): number {
    const room = this.server?.sockets?.adapter?.rooms?.get(
      `event:${eventId}`,
    );
    return room?.size ?? 0;
  }

  getTotalConnections(): number {
    return this.connectedClients.size;
  }
}
