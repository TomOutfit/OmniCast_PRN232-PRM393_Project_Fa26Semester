// ============================================================
// OmniCast — WHIP (WebRTC-HTTP Ingestion Protocol) client
// ============================================================
//
// Publishes a browser `MediaStream` (camera + microphone) into a
// MediaMTX server over WHIP.
//
//   POST  {whipUrl}/{slug}/whip     → 201 Created + SDP answer
//   DELETE {Location header}        → tear the session down
//
// Codec constraints (IMPORTANT)
// ------------------------------
// MediaMTX's HLS muxer cannot remux VP8. Only H264 / H265 / VP9 /
// AV1 reach the HLS output, and VP9 requires the low-latency
// (fMP4) playlist variant. This client therefore restricts the
// published codecs to:
//
//   video : H264 (preferred) → VP9
//   audio : Opus
//
// If the browser offers neither H264 nor VP9 we fail loudly with a
// readable message instead of publishing a VP8 stream that would
// show up as a black screen for every HLS viewer.
//
// WHIP spec reference: https://www.w3.org/TR/2024/WD-whip-20240311/
// ============================================================

'use client';

export type WhipConnectionState =
  | 'idle'
  | 'preparing'
  | 'publishing'
  | 'connected'
  | 'failed'
  | 'stopped';

export interface WhipStats {
  /** Outbound video bitrate in kbps (smoothed over the last sample). */
  videoKbps: number;
  /** Outbound audio bitrate in kbps. */
  audioKbps: number;
  /** Negotiated video codec (e.g. `H264`). */
  videoCodec: string;
  /** Negotiated audio codec (e.g. `opus`). */
  audioCodec: string;
  /** Round-trip-ish ICE connection state. */
  connectionState: RTCPeerConnectionState;
}

export interface WhipPublisher {
  /** Tear down the WHIP session (DELETE + close the peer connection). */
  stop(): Promise<void>;
  /** Snapshot of the current outbound bitrate / negotiated codecs. */
  getStats(): Promise<WhipStats>;
  /** The underlying peer connection (for advanced use / debugging). */
  peerConnection: RTCPeerConnection;
  /** The session URL returned by the server (used for the DELETE call). */
  sessionUrl: string | null;
}

export interface PublishCameraViaWhipOptions {
  /** Full WHIP endpoint, e.g. `http://192.168.2.74:8889/sport-1/whip`. */
  url: string;
  /** The camera / microphone stream to publish. */
  stream: MediaStream;
  /** Called on every state transition. */
  onState?: (state: WhipConnectionState, detail?: string) => void;
  /** Optional ICE servers. LAN deployments usually need none. */
  iceServers?: RTCIceServer[];
  /** Abort the publish attempt. */
  signal?: AbortSignal;
}

const ICE_GATHERING_TIMEOUT_MS = 4000;

/**
 * Resolve once ICE gathering completes (or the timeout fires).
 *
 * We deliberately do NOT wait for `iceGatheringState === 'complete'`
 * indefinitely — a browser that keeps a STUN request open would
 * block the publish forever.
 */
async function waitForIceGathering(
  pc: RTCPeerConnection,
  timeoutMs = ICE_GATHERING_TIMEOUT_MS,
): Promise<void> {
  if (pc.iceGatheringState === 'complete') return;

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      pc.removeEventListener('icegatheringstatechange', onChange);
      clearTimeout(timer);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === 'complete') finish();
    };
    const timer = setTimeout(finish, timeoutMs);
    pc.addEventListener('icegatheringstatechange', onChange);
  });
}

/**
 * Pick the codecs we are willing to publish, in priority order.
 *
 * Returns `null` when the browser cannot produce an HLS-compatible
 * video codec.
 */
function selectCodecPreferences(
  kind: 'video' | 'audio',
): RTCRtpCodec[] | null {
  if (typeof RTCRtpSender === 'undefined' || !RTCRtpSender.getCapabilities) {
    return null;
  }
  const caps = RTCRtpSender.getCapabilities(kind);
  if (!caps?.codecs?.length) return null;

  if (kind === 'audio') {
    const opus = caps.codecs.filter((c) => c.mimeType.toLowerCase() === 'audio/opus');
    if (opus.length) return opus;
    // Opus is universally supported for WHIP; fall back to whatever
    // the browser offers (MediaMTX also accepts G.711/PCMU).
    return caps.codecs.filter((c) =>
      ['audio/pcmu', 'audio/pcma', 'audio/g722'].includes(c.mimeType.toLowerCase()),
    );
  }

  // Video: H264 first, then VP9. VP8 is deliberately excluded —
  // MediaMTX cannot remux it to HLS.
  const h264 = caps.codecs.filter((c) => c.mimeType.toLowerCase() === 'video/h264');
  const vp9 = caps.codecs.filter((c) => c.mimeType.toLowerCase() === 'video/vp9');

  // Prefer the packetization-mode=1 H264 profile (baseline-ish) —
  // it is the variant MediaMTX + browsers agree on most reliably.
  const h264P1 = h264.filter(
    (c) => !c.sdpFmtpLine || c.sdpFmtpLine.includes('packetization-mode=1'),
  );
  const ordered = [...(h264P1.length ? h264P1 : h264), ...vp9];

  return ordered.length ? ordered : null;
}

/**
 * Apply the codec preferences to the transceivers that carry the
 * camera / microphone tracks.
 */
async function applyCodecPreferences(
  pc: RTCPeerConnection,
): Promise<{ video: string; audio: string }> {
  const videoPrefs = selectCodecPreferences('video');
  const audioPrefs = selectCodecPreferences('audio');

  if (!videoPrefs) {
    throw new Error(
      'Trình duyệt này không hỗ trợ codec H264 hoặc VP9 — OmniCast cần codec đó để phát HLS cho người xem. ' +
        'Vui lòng dùng Chrome/Edge phiên bản mới nhất.',
    );
  }

  let videoCodec = 'H264';
  let audioCodec = 'opus';

  for (const transceiver of pc.getTransceivers()) {
    const kind = transceiver.receiver.track?.kind ?? transceiver.sender.track?.kind;
    if (kind === 'video') {
      const pref = selectCodecPreferences('video');
      if (pref?.length) {
        try {
          transceiver.setCodecPreferences(pref);
          videoCodec = pref[0].mimeType.split('/')[1]?.toUpperCase() ?? 'H264';
        } catch {
          /* older browsers may not support setCodecPreferences — keep going */
        }
      }
    } else if (kind === 'audio') {
      const pref = selectCodecPreferences('audio');
      if (pref?.length) {
        try {
          transceiver.setCodecPreferences(pref);
          audioCodec = pref[0].mimeType.split('/')[1] ?? 'opus';
        } catch {
          /* ignore */
        }
      }
    }
  }

  return { video: videoCodec, audio: audioCodec };
}

/**
 * Publish a camera stream over WHIP.
 *
 * Resolves once the peer connection is established; rejects with a
 * readable message when the server refuses the offer or the browser
 * cannot produce a supported codec.
 */
export async function publishCameraViaWhip(
  options: PublishCameraViaWhipOptions,
): Promise<WhipPublisher> {
  const { url, stream, onState, iceServers = [], signal } = options;

  if (!navigator.mediaDevices || !window.RTCPeerConnection) {
    throw new Error('Trình duyệt này không hỗ trợ WebRTC — không thể phát trực tiếp.');
  }
  if (!stream || stream.getTracks().length === 0) {
    throw new Error('Không có luồng camera/microphone để phát.');
  }

  onState?.('preparing');

  const pc = new RTCPeerConnection({
    iceServers,
    bundlePolicy: 'max-bundle',
  });

  let sessionUrl: string | null = null;
  let sessionEtag: string | null = null;
  let stopped = false;

  // Previous `getStats()` sample, used to turn the cumulative
  // `bytesSent` counters into an actual bitrate.
  let lastVideoBytes = 0;
  let lastAudioBytes = 0;
  let lastStatsAt = 0;

  const cleanup = () => {
    try {
      pc.close();
    } catch {
      /* ignore */
    }
  };

  const abortHandler = () => {
    stopped = true;
    cleanup();
  };
  signal?.addEventListener('abort', abortHandler, { once: true });

  try {
    // 1. Add the camera + microphone tracks.
    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream);
    }

    // 2. Restrict the codecs to what MediaMTX can remux to HLS.
    await applyCodecPreferences(pc);

    // 3. Create + gather the offer.
    const offer = await pc.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    });
    await pc.setLocalDescription(offer);
    await waitForIceGathering(pc);

    if (stopped) {
      throw new Error('Đã hủy phát trực tiếp.');
    }

    onState?.('publishing');

    // 4. POST the SDP offer to the WHIP endpoint.
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
        },
        body: pc.localDescription?.sdp ?? offer.sdp ?? '',
      });
    } catch (fetchErr) {
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const isHttpTarget = url.startsWith('http://');
      if (isHttps && isHttpTarget) {
        throw new Error(
          `Trình duyệt chặn kết nối MediaMTX (${url}) do Mixed Content: Trang web tải qua HTTPS nhưng máy chủ phát sóng sử dụng HTTP. Để dùng WebRTC WHIP, hãy chạy qua localhost hoặc cấu hình SSL cho MediaMTX.`,
        );
      }
      throw new Error(
        `Không thể kết nối máy chủ MediaMTX WHIP (${url}). Vui lòng đảm bảo MediaMTX đã khởi chạy.`,
      );
    }

    if (response.status !== 201 && response.status !== 200) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `MediaMTX từ chối luồng phát (HTTP ${response.status})${body ? `: ${body.slice(0, 200)}` : ''}.`,
      );
    }

    const answerSdp = await response.text();
    sessionUrl = response.headers.get('Location') || url;
    sessionEtag = response.headers.get('ETag');

    if (!answerSdp.trim()) {
      throw new Error('MediaMTX trả về SDP rỗng — không thể thiết lập phiên phát.');
    }

    // 5. Apply the answer.
    await pc.setRemoteDescription({
      type: 'answer',
      sdp: answerSdp,
    });

    // 6. Wait for the connection to come up (bounded).
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        pc.removeEventListener('connectionstatechange', onChange);
        clearTimeout(timer);
        resolve();
      };
      const fail = (msg: string) => {
        if (settled) return;
        settled = true;
        pc.removeEventListener('connectionstatechange', onChange);
        clearTimeout(timer);
        reject(new Error(msg));
      };
      const onChange = () => {
        const state = pc.connectionState;
        if (state === 'connected') done();
        else if (state === 'failed') {
          fail(
            'Không thiết lập được kết nối WebRTC tới MediaMTX. ' +
              'Kiểm tra firewall (cổng 8889/8189) hoặc thử lại.',
          );
        } else if (state === 'disconnected') {
          // Give the connection a moment to recover before failing.
          setTimeout(() => {
            if (pc.connectionState !== 'connected') {
              fail('Kết nối WebRTC bị gián đoạn.');
            }
          }, 4000);
        }
      };
      const timer = setTimeout(() => {
        if (pc.connectionState === 'connected') done();
        else fail('Timeout khi thiết lập kết nối WebRTC.');
      }, 15000);

      pc.addEventListener('connectionstatechange', onChange);
      if (pc.connectionState === 'connected') done();
    });

    onState?.('connected');

    const publisher: WhipPublisher = {
      peerConnection: pc,
      sessionUrl,

      async stop(): Promise<void> {
        if (stopped) return;
        stopped = true;
        onState?.('stopped');

        // Ask MediaMTX to release the session (best-effort).
        if (sessionUrl) {
          try {
            await fetch(sessionUrl, {
              method: 'DELETE',
              headers: sessionEtag ? { 'If-Match': sessionEtag } : undefined,
            });
          } catch {
            /* the server may already have dropped the session */
          }
        }

        signal?.removeEventListener('abort', abortHandler);
        cleanup();
      },

      /**
       * Snapshot of the current outbound bitrate.
       *
       * `RTCPeerConnection.getStats()` reports CUMULATIVE `bytesSent`
       * counters, so the raw values are converted into a bitrate by
       * differencing against the previous sample. The previous
       * counters are kept SEPARATELY for video and audio — using a
       * single shared baseline made the audio rate wrong (it was
       * differenced against the video byte count).
       */
      async getStats(): Promise<WhipStats> {
        const stats: WhipStats = {
          videoKbps: 0,
          audioKbps: 0,
          videoCodec: '—',
          audioCodec: '—',
          connectionState: pc.connectionState,
        };

        let videoBytes = 0;
        let audioBytes = 0;
        let videoCodec = '';
        let audioCodec = '';

        try {
          const report = await pc.getStats();
          report.forEach((entry: any) => {
            if (entry.type === 'outbound-rtp' && !entry.isRemote) {
              if (entry.kind === 'video' || entry.mediaType === 'video') {
                videoBytes += entry.bytesSent || 0;
                if (!videoCodec && entry.codecId) videoCodec = entry.codecId;
              } else if (entry.kind === 'audio' || entry.mediaType === 'audio') {
                audioBytes += entry.bytesSent || 0;
                if (!audioCodec && entry.codecId) audioCodec = entry.codecId;
              }
            }
            if (entry.type === 'codec' && entry.mimeType) {
              const mime = String(entry.mimeType).toLowerCase();
              if (mime.startsWith('video/') && !videoCodec) videoCodec = entry.mimeType;
              if (mime.startsWith('audio/') && !audioCodec) audioCodec = entry.mimeType;
            }
          });
        } catch {
          /* stats unavailable — return zeros */
        }

        // Convert cumulative bytes into a bitrate. The first sample
        // has no baseline yet, so it reports 0 until the next one.
        const now = Date.now();
        const elapsedSec = lastStatsAt ? (now - lastStatsAt) / 1000 : 0;
        if (elapsedSec > 0) {
          stats.videoKbps = Math.max(
            0,
            Math.round(((videoBytes - lastVideoBytes) * 8) / 1000 / elapsedSec),
          );
          stats.audioKbps = Math.max(
            0,
            Math.round(((audioBytes - lastAudioBytes) * 8) / 1000 / elapsedSec),
          );
        }

        lastVideoBytes = videoBytes;
        lastAudioBytes = audioBytes;
        lastStatsAt = now;

        stats.videoCodec = videoCodec || 'H264';
        stats.audioCodec = audioCodec || 'opus';

        return stats;
      },
    };

    return publisher;
  } catch (err) {
    signal?.removeEventListener('abort', abortHandler);
    cleanup();
    onState?.('failed', (err as Error).message);
    throw err;
  }
}
