/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Radio,
  Video,
  Camera,
  Monitor,
  Upload,
  Play,
  Square,
  StopCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Search,
  Sparkles,
  Bot,
  RefreshCw,
  Film,
  Tv,
  Loader2,
  ChevronRight,
  Eye,
  FileVideo,
  Globe,
  Plus,
  Check,
  Layers,
  BadgeCheck,
  ExternalLink,
  Zap,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CompactUserMenu } from '@/components/layout/compact-user-menu';
import { useAuth } from '@/lib/auth-context';
import { useChannels } from '@/lib/hooks/useChannels';
import { useLiveEvents } from '@/lib/hooks/usePrograms';
import {
  useBroadcastableRecordings,
  useCurateLive,
  useStopLive,
  useUploadSelfRecordFile,
  useUploadSelfRecord,
  useCatalogStreams,
  useAddFromCatalog,
} from '@/lib/hooks/useLiveStudio';
import type { Channel } from '@/types';
import type { StudioCatalogStream } from '@/lib/api/live-studio';

type StudioTab = 'curated' | 'self-record' | 'catalog';
type RecordSource = 'camera' | 'screen' | 'upload';
type VisibilityMode = 'IMMEDIATE' | 'SCHEDULED' | 'PRIVATE';

export default function WebLiveStudioPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<StudioTab>('curated');

  // Channel Selection
  const { data: channelsData, isLoading: loadingChannels } = useChannels({
    limit: 50,
  });
  const channels = useMemo<Channel[]>(() => {
    if (!channelsData) return [];
    return Array.isArray(channelsData)
      ? channelsData
      : Array.isArray((channelsData as any)?.data)
      ? (channelsData as any).data
      : [];
  }, [channelsData]);

  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  // Catalog state
  const [catalogSearch, setCatalogSearch] = useState('');
  const [addedCatalogIds, setAddedCatalogIds] = useState<Set<string>>(new Set());

  const {
    data: catalogData,
    isLoading: loadingCatalog,
    refetch: refetchCatalog,
  } = useCatalogStreams(selectedChannel?.slug, {
    search: catalogSearch || undefined,
  });

  const addFromCatalogMutation = useAddFromCatalog();

  useEffect(() => {
    if (channels.length > 0 && !selectedChannel) {
      setSelectedChannel(channels[0]);
    }
  }, [channels, selectedChannel]);

  // Reset catalog added-ids when channel changes
  useEffect(() => {
    setAddedCatalogIds(new Set());
  }, [selectedChannel?.id]);

  // Active Live Event for Selected Channel
  const { data: liveEventsData, refetch: refetchLiveEvents } = useLiveEvents({
    status: 'LIVE',
    limit: 50,
  });

  const activeLiveForChannel = useMemo(() => {
    if (!selectedChannel || !liveEventsData?.data) return null;
    return (
      liveEventsData.data.find(
        (e) =>
          e.channelId === selectedChannel.id ||
          e.channel?.slug === selectedChannel.slug,
      ) ?? null
    );
  }, [selectedChannel, liveEventsData]);

  // ----------------------------------------------------
  // Tab 1: Curated Live State
  // ----------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecordingIds, setSelectedRecordingIds] = useState<string[]>(
    [],
  );
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');

  const {
    data: recordingsData,
    isLoading: loadingRecordings,
    refetch: refetchRecordings,
  } = useBroadcastableRecordings(selectedChannel?.slug, searchQuery);

  const curatedRecordings = recordingsData?.items ?? [];

  const curateLiveMutation = useCurateLive();
  const stopLiveMutation = useStopLive();

  const toggleRecordingSelect = (id: string) => {
    setSelectedRecordingIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleStartCuratedLive = async () => {
    if (!selectedChannel) return;
    if (selectedRecordingIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 nội dung để phát sóng.');
      return;
    }

    try {
      const res = await curateLiveMutation.mutateAsync({
        channelId: selectedChannel.slug,
        recordingIds: selectedRecordingIds,
        title: customTitle.trim() || undefined,
        description: customDesc.trim() || undefined,
        allowDevLicense: true,
      });
      alert(res.message || 'Đã phát sóng trực tiếp!');
      setSelectedRecordingIds([]);
      setCustomTitle('');
      setCustomDesc('');
      refetchLiveEvents();
    } catch (err: any) {
      alert(
        err.response?.data?.message || 'Có lỗi xảy ra khi bắt đầu phát sóng.',
      );
    }
  };

  const handleStopLive = async () => {
    if (!activeLiveForChannel) return;
    if (
      !confirm(
        `Bạn có chắc chắn muốn dừng phát sóng "${activeLiveForChannel.title}" trên kênh ${selectedChannel?.name}?`,
      )
    ) {
      return;
    }

    try {
      const res = await stopLiveMutation.mutateAsync({
        eventId: activeLiveForChannel.id,
        payload: { keepAsVod: true },
      });
      alert(res.message || 'Đã dừng phát sóng.');
      refetchLiveEvents();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể dừng phát sóng.');
    }
  };

  // ----------------------------------------------------
  // Tab 2: Self-Record State (WebCam / Screen Capture)
  // ----------------------------------------------------
  const [recordSource, setRecordSource] = useState<RecordSource>('camera');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [recordedPreviewUrl, setRecordedPreviewUrl] = useState<string | null>(
    null,
  );

  const [selfTitle, setSelfTitle] = useState('');
  const [selfDesc, setSelfDesc] = useState('');
  // Default to SCHEDULED so an accidental click on "Tải lên & phát sóng"
  // won't blast raw footage to every viewer on the channel. This also
  // matches the backend DTO default (`StudioSelfRecordVisibility.ISCHEDULED`).
  const [visibility, setVisibility] = useState<VisibilityMode>('SCHEDULED');
  // Confirm dialog state for the high-stakes IMMEDIATE (LIVE NOW) flow.
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const uploadFileMutation = useUploadSelfRecordFile();
  const uploadRecordMutation = useUploadSelfRecord();
  const [uploadProgress, setUploadProgress] = useState(0);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      stopMediaTracks();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopMediaTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startStreamPreview = async (source: 'camera' | 'screen') => {
    stopMediaTracks();
    setRecordedBlob(null);
    setRecordedFile(null);
    if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl);
    setRecordedPreviewUrl(null);

    try {
      let stream: MediaStream;
      if (source === 'camera') {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      }

      mediaStreamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }
    } catch (err: any) {
      console.error('Error starting stream:', err);
      alert('Không thể mở thiết bị ghi hình/màn hình: ' + err.message);
    }
  };

  const startRecording = () => {
    if (!mediaStreamRef.current) {
      alert('Chưa có nguồn media. Hãy kích hoạt Camera hoặc Màn hình.');
      return;
    }

    recordedChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setRecordedPreviewUrl(url);

      const file = new File([blob], `self-record-${Date.now()}.webm`, {
        type: 'video/webm',
      });
      setRecordedFile(file);
    };

    recorder.start(1000);
    setIsRecording(true);
    setRecordingSeconds(0);

    timerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      stopMediaTracks();
    }
  };

  const handleFileUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRecordedFile(file);
    const url = URL.createObjectURL(file);
    setRecordedPreviewUrl(url);
    if (!selfTitle) {
      setSelfTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handlePublishSelfRecord = async () => {
    if (!selectedChannel) return;
    if (!recordedFile) {
      alert('Vui lòng quay video hoặc tải file video lên.');
      return;
    }
    if (!selfTitle.trim()) {
      alert('Vui lòng nhập tiêu đề cho video.');
      return;
    }

    // Going IMMEDIATE is the highest-stakes action in the studio: it
    // pushes the channel into LIVE NOW, kicking off whatever is
    // currently broadcasting and replacing it with raw, unmoderated
    // footage. Require an explicit confirmation step first.
    if (visibility === 'IMMEDIATE') {
      setShowLiveConfirm(true);
      return;
    }

    await doPublishSelfRecord();
  };

  const doPublishSelfRecord = async () => {
    if (!selectedChannel || !recordedFile) return;
    setShowLiveConfirm(false);
    try {
      setUploadProgress(1);
      // 1. Upload file
      const uploadRes = await uploadFileMutation.mutateAsync({
        file: recordedFile,
        title: selfTitle,
        onProgress: (p) => setUploadProgress(p),
      });

      // 2. Persist recording metadata & optionally curate live
      const durationSec = recordingSeconds > 0 ? recordingSeconds : 120;
      const res = await uploadRecordMutation.mutateAsync({
        channelId: selectedChannel.slug,
        title: selfTitle,
        description: selfDesc || undefined,
        videoUrl: uploadRes.url,
        duration: durationSec,
        visibility,
        tags: ['web-studio', 'self-record'],
      });

      alert(res.message || 'Đã xuất bản video thành công!');
      setSelfTitle('');
      setSelfDesc('');
      setRecordedFile(null);
      setRecordedBlob(null);
      if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl);
      setRecordedPreviewUrl(null);
      setRecordingSeconds(0);
      setUploadProgress(0);
      // Always reset to the safe default so a follow-up upload can't
      // accidentally re-broadcast the next clip live.
      setVisibility('SCHEDULED');
      refetchLiveEvents();
    } catch (err: any) {
      alert(
        err.response?.data?.message || 'Có lỗi xảy ra khi tải lên phát sóng.',
      );
      setUploadProgress(0);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 pb-16">
      {/* ── Studio Sub Header & Nav ────────────────────────────────────── */}
      <div className="border-b border-[#142032] bg-[#0c1421]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-[0_0_20px_rgba(0,242,254,0.3)]">
                <div className="w-full h-full bg-[#070b12] rounded-[14px] flex items-center justify-center">
                  <Radio className="w-6 h-6 text-cyan-400 animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-white tracking-tight">
                    OmniCast Studio
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                    LIVE CONTROL CENTER
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Trung tâm điều phối phát sóng trực tiếp và sản xuất nội dung
                </p>
              </div>
            </div>

            {/* Sub Nav Tabs + User Menu */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[#05080e] p-1 rounded-xl border border-[#1b2b42]">
                <Link
                  href="/studio/curator"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  <Bot className="w-4 h-4 text-purple-400" />
                  <span>AI Curator</span>
                </Link>
                <button
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 shadow-sm"
                >
                  <Radio className="w-4 h-4" />
                  <span>Live Studio</span>
                </button>
              </div>
              <CompactUserMenu variant="cyan" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Container ───────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* 1. Channel Selector */}
        <div className="glass-card p-4 rounded-2xl border border-[#1e2d44] bg-[#0c1421]/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                Chọn Kênh Phát Sóng Target:
              </span>
            </div>
            {loadingChannels ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {channels.map((ch) => {
                  const selected = selectedChannel?.id === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChannel(ch)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border ${
                        selected
                          ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500 shadow-[0_0_12px_rgba(0,242,254,0.2)]'
                          : 'bg-[#101928] text-slate-400 border-[#1a273c] hover:text-white hover:bg-[#162338]'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          ch.isActive ? 'bg-cyan-400' : 'bg-slate-600'
                        }`}
                      />
                      <span>{ch.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 2. Active LIVE Status Banner (if currently live) */}
        {activeLiveForChannel && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-red-900/20 to-[#0c1421] border border-red-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="w-3 h-3 rounded-full bg-red-500 block animate-ping absolute top-0 right-0" />
                <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-500/60 flex items-center justify-center text-red-400">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black bg-red-600 text-white uppercase tracking-widest">
                    LIVE NOW
                  </span>
                  <span className="text-xs text-slate-300 font-semibold">
                    Kênh: {selectedChannel?.name}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mt-1">
                  {activeLiveForChannel.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-slate-400">Người xem trực tiếp</p>
                <p className="text-sm font-black text-cyan-300 font-mono">
                  {activeLiveForChannel.viewerCount || 0} Viwer
                </p>
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleStopLive}
                disabled={stopLiveMutation.isPending}
                className="gap-2 bg-red-600 hover:bg-red-500 text-white font-bold"
              >
                {stopLiveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <StopCircle className="w-4 h-4" />
                )}
                <span>DỪNG PHÁT SÓNG</span>
              </Button>
            </div>
          </div>
        )}

        {/* 3. Main Studio Feature Tabs */}
        <div className="flex items-center gap-2 border-b border-[#142032] pb-3">
          <button
            onClick={() => setActiveTab('curated')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'curated'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                : 'bg-[#0e1726] text-slate-400 hover:text-white border border-[#1b2b42]'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Mode 1: Chọn Nội Dung Phát Lên Màn Hình</span>
          </button>

          <button
            onClick={() => setActiveTab('self-record')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'self-record'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                : 'bg-[#0e1726] text-slate-400 hover:text-white border border-[#1b2b42]'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Mode 2: Tự Ghi Hình Nội Dung LiveStream</span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'catalog'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg'
                : 'bg-[#0e1726] text-slate-400 hover:text-white border border-[#1b2b42]'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Mode 3: Danh Mục Nguồn Video Công Khai</span>
          </button>
        </div>

        {/* ── MODE 1: Curated Live Broadcast ───────────────────────────── */}
        {activeTab === 'curated' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: Available Broadcastable Content List */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="glass-card p-5 border border-[#1e2d44] bg-[#0c1421]/60 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1a273b] pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Film className="w-4 h-4 text-cyan-400" />
                      Kho Nội Dung Royalty-Free Ghi Hình Sẵn
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Chỉ hiển thị các video tự sản xuất / upload nội bộ (Bộ lọc
                      Anti-Piracy tự động ẩn nguồn Youtube/Twitch)
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetchRecordings()}
                    className="border-[#1e2d44] text-slate-300 hover:bg-[#152339]"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Làm mới
                  </Button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm theo tiêu đề video..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#05080e] border border-[#1b2b42] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Recordings Table / Grid */}
                {loadingRecordings ? (
                  <div className="p-12 text-center space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
                    <p className="text-xs text-slate-400">
                      Đang kiểm tra thư viện nội dung hợp lệ…
                    </p>
                  </div>
                ) : curatedRecordings.length === 0 ? (
                  <div className="p-10 text-center rounded-xl bg-[#070b12] border border-[#142032] space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-300">
                      Không tìm thấy video hợp lệ trên kênh này.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Hãy chuyển qua thẻ &quot;Tự ghi hình&quot; để tạo clip mới
                      hoặc tải lên file MP4.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#18273c] max-h-[460px] overflow-y-auto pr-1">
                    {curatedRecordings.map((rec) => {
                      const selected = selectedRecordingIds.includes(rec.id);
                      return (
                        <div
                          key={rec.id}
                          onClick={() => toggleRecordingSelect(rec.id)}
                          className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            selected
                              ? 'bg-cyan-950/40 border border-cyan-500/40'
                              : 'hover:bg-[#111a2a]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => {}}
                              className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                            />
                            <div className="w-20 h-12 rounded-lg bg-slate-800 overflow-hidden relative flex-shrink-0 border border-[#1b2b42]">
                              {rec.thumbnailUrl ? (
                                <img
                                  src={rec.thumbnailUrl}
                                  alt={rec.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600">
                                  <Film className="w-5 h-5" />
                                </div>
                              )}
                              <span className="absolute bottom-1 right-1 px-1 rounded text-[9px] font-mono bg-black/80 text-white font-bold">
                                {formatTime(rec.duration)}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-white truncate">
                                {rec.title}
                              </h4>
                              <p className="text-[11px] text-slate-400 truncate">
                                {rec.description || 'Không có mô tả'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-900">
                                  {rec.contentSource}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {rec.viewCount || 0} lượt xem
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex-shrink-0 text-right">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                selected
                                  ? 'bg-cyan-500 text-black font-black'
                                  : 'bg-[#152339] text-slate-400'
                              }`}
                            >
                              {selected ? 'ĐÃ CHỌN' : 'CHỌN'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* Right Col: Curated Broadcast Launch Control Panel */}
            <div className="space-y-4">
              <Card className="glass-card p-5 border border-[#1e2d44] bg-[#0c1421]/60 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2 border-b border-[#1a273b] pb-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Cấu Hình Phát Sóng Trực Tiếp
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Đã chọn ({selectedRecordingIds.length} video):
                    </label>
                    <div className="p-2.5 rounded-xl bg-[#05080e] border border-[#1b2b42] text-xs font-mono text-cyan-300 min-h-[42px] flex items-center">
                      {selectedRecordingIds.length === 0 ? (
                        <span className="text-slate-600">
                          Chưa chọn video nào từ danh sách bên trái
                        </span>
                      ) : (
                        <span>
                          {selectedRecordingIds.length} clip sẵn sàng nối sóng
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Tiêu đề phát sóng (Tùy chọn):
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Mặc định lấy tiêu đề của video đầu tiên"
                      className="w-full px-3 py-2 rounded-xl bg-[#05080e] border border-[#1b2b42] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Mô tả chương trình:
                    </label>
                    <textarea
                      rows={3}
                      value={customDesc}
                      onChange={(e) => setCustomDesc(e.target.value)}
                      placeholder="Nhập thông tin giới thiệu cho khán giả..."
                      className="w-full px-3 py-2 rounded-xl bg-[#05080e] border border-[#1b2b42] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Anti-Piracy Guard Notice */}
                  <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 space-y-1">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[10px] font-bold uppercase">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Bảo Vệ Bản Quyền Tự Động</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Chỉ cho phép phát sóng lại nội dung đã lưu trữ nội bộ
                      trên hệ thống OmniCast. Mọi nguồn nhúng thương mại bị cấm
                      tuyệt đối.
                    </p>
                  </div>

                  <Button
                    onClick={handleStartCuratedLive}
                    disabled={
                      curateLiveMutation.isPending ||
                      selectedRecordingIds.length === 0
                    }
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 gap-2"
                  >
                    {curateLiveMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Radio className="w-4 h-4" />
                    )}
                    <span>PHÁT SÓNG LIVE NGAY</span>
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── MODE 2: Self-Record & Screen Capture LiveStream ───────────── */}
        {activeTab === 'self-record' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: WebCam / Screen Capture Recorder Surface */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="glass-card p-5 border border-[#1e2d44] bg-[#0c1421]/60 space-y-4">
                {/* Source Selection Buttons */}
                <div className="flex items-center justify-between border-b border-[#1a273b] pb-3">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Camera className="w-4 h-4 text-purple-400" />
                    Nguồn Ghi Hình Studio
                  </h2>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setRecordSource('camera');
                        startStreamPreview('camera');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        recordSource === 'camera'
                          ? 'bg-purple-950/80 text-purple-300 border border-purple-500'
                          : 'bg-[#101928] text-slate-400 border border-[#1a273c]'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Webcam</span>
                    </button>

                    <button
                      onClick={() => {
                        setRecordSource('screen');
                        startStreamPreview('screen');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        recordSource === 'screen'
                          ? 'bg-purple-950/80 text-purple-300 border border-purple-500'
                          : 'bg-[#101928] text-slate-400 border border-[#1a273c]'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>Màn hình</span>
                    </button>

                    <button
                      onClick={() => {
                        setRecordSource('upload');
                        stopMediaTracks();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        recordSource === 'upload'
                          ? 'bg-purple-950/80 text-purple-300 border border-purple-500'
                          : 'bg-[#101928] text-slate-400 border border-[#1a273c]'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Clip MP4</span>
                    </button>
                  </div>
                </div>

                {/* Recorder / Preview Box */}
                {recordSource !== 'upload' ? (
                  <div className="relative aspect-video rounded-2xl bg-black overflow-hidden border border-[#1e2d44] flex items-center justify-center">
                    {/* HTML5 Live Stream Preview Video */}
                    <video
                      ref={videoPreviewRef}
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />

                    {/* Timer & Status Overlay */}
                    {isRecording && (
                      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-950/80 border border-red-500/60 backdrop-blur-md">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                        <span className="font-mono text-xs font-black text-white">
                          REC {formatTime(recordingSeconds)}
                        </span>
                      </div>
                    )}

                    {/* Action Controls Overlay */}
                    <div className="absolute bottom-4 flex items-center gap-3">
                      {!isRecording ? (
                        <Button
                          onClick={startRecording}
                          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs gap-2 shadow-xl shadow-red-600/30"
                        >
                          <Video className="w-4 h-4" />
                          <span>Bắt đầu Ghi Hình</span>
                        </Button>
                      ) : (
                        <Button
                          onClick={stopRecording}
                          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs gap-2 shadow-xl"
                        >
                          <Square className="w-4 h-4 text-red-400 fill-current" />
                          <span>Dừng Ghi Hình</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* File Drag & Drop Upload Zone */
                  <div className="p-8 rounded-2xl bg-[#05080e] border-2 border-dashed border-[#1e2d44] text-center space-y-4">
                    <FileVideo className="w-12 h-12 text-purple-400 mx-auto" />
                    <div>
                      <p className="text-sm font-bold text-white">
                        Kéo thả hoặc chọn file video từ máy tính
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Hỗ trợ định dạng MP4, WebM, MOV. Tối đa 500 MB.
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileUploadChange}
                      className="hidden"
                      id="video-file-input"
                    />
                    <label
                      htmlFor="video-file-input"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-xs font-bold cursor-pointer transition-all"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Chọn Tệp Video</span>
                    </label>
                  </div>
                )}

                {/* Recorded Video Playback Review */}
                {recordedPreviewUrl && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      Xem Lại Đoạn Ghi Hình Trước Khi Xuất Bản:
                    </label>
                    <div className="aspect-video rounded-xl bg-black overflow-hidden border border-[#1e2d44]">
                      <video
                        src={recordedPreviewUrl}
                        controls
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Right Col: Metadata & Publish Control Panel */}
            <div className="space-y-4">
              <Card className="glass-card p-5 border border-[#1e2d44] bg-[#0c1421]/60 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2 border-b border-[#1a273b] pb-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Cấu Hình Xuất Bản LiveStream
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Tiêu đề chương trình: *
                    </label>
                    <input
                      type="text"
                      value={selfTitle}
                      onChange={(e) => setSelfTitle(e.target.value)}
                      placeholder="Ví dụ: Trực tiếp Studio - Bản tin sinh viên..."
                      className="w-full px-3 py-2 rounded-xl bg-[#05080e] border border-[#1b2b42] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Mô tả nội dung:
                    </label>
                    <textarea
                      rows={3}
                      value={selfDesc}
                      onChange={(e) => setSelfDesc(e.target.value)}
                      placeholder="Thông tin nội dung phát sóng..."
                      className="w-full px-3 py-2 rounded-xl bg-[#05080e] border border-[#1b2b42] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Chế độ phát sóng:
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {/* ── IMMEDIATE — HIGHEST RISK ─────────────────────────
                          Maps to backend visibility=IMMEDIATE. Toggles the
                          channel into LIVE NOW and replaces whatever is
                          currently broadcasting. Red-tinted on selection
                          to signal the stakes; also requires an extra
                          confirm dialog before upload. */}
                      <button
                        type="button"
                        onClick={() => setVisibility('IMMEDIATE')}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center gap-2 ${
                          visibility === 'IMMEDIATE'
                            ? 'bg-red-950/80 border-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                            : 'bg-[#05080e] border-[#1b2b42] text-slate-400 hover:border-red-500/40'
                        }`}
                      >
                        <Radio className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold">Phát sóng LIVE ngay</p>
                            {visibility === 'IMMEDIATE' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-red-600 text-white uppercase">
                                Cảnh báo cao
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Chuyển kênh sang LIVE NOW, thay thế chương trình
                            đang phát
                          </p>
                        </div>
                      </button>

                      {/* ── SCHEDULED — DEFAULT (VOD) ───────────────────────
                          Maps to backend visibility=SCHEDULED. Saves the
                          clip to the channel's VOD library so viewers can
                          re-watch on demand. Does NOT push the channel
                          into LIVE. */}
                      <button
                        type="button"
                        onClick={() => setVisibility('SCHEDULED')}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center gap-2 ${
                          visibility === 'SCHEDULED'
                            ? 'bg-cyan-950/80 border-cyan-500 text-white'
                            : 'bg-[#05080e] border-[#1b2b42] text-slate-400 hover:border-cyan-500/40'
                        }`}
                      >
                        <Film className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold">
                              Lưu VOD cho kênh (mặc định)
                            </p>
                            {visibility === 'SCHEDULED' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-600/30 text-cyan-200 border border-cyan-500/40 uppercase">
                                An toàn
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Xuất bản lên kho Recording — viewer xem lại được
                            nhưng không phát live
                          </p>
                        </div>
                      </button>

                      {/* ── PRIVATE — DRAFT (STAFF/ADMIN ONLY) ──────────────
                          Maps to backend visibility=PRIVATE. Persists the
                          recording with isPublished=false and pinned to
                          epoch, so it's hidden from every public surface
                          (search, channels, EPG, watchlist). Only Staff
                          and Admin can see it. Use for: test takes, clips
                          awaiting review, half-finished uploads. */}
                      <button
                        type="button"
                        onClick={() => setVisibility('PRIVATE')}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center gap-2 ${
                          visibility === 'PRIVATE'
                            ? 'bg-slate-800/90 border-slate-500 text-white'
                            : 'bg-[#05080e] border-[#1b2b42] text-slate-400 hover:border-slate-500/40'
                        }`}
                      >
                        <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold">Bản nháp nội bộ</p>
                            {visibility === 'PRIVATE' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-700 text-slate-200 border border-slate-500 uppercase">
                                Chỉ Staff
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Lưu bản nháp ẩn — chỉ Staff/Admin thấy, viewer
                            không truy cập được
                          </p>
                        </div>
                      </button>
                    </div>

                    {/* Inline warning when IMMEDIATE is armed — surfaces
                        the risk of broadcasting unmoderated footage so
                        the user must explicitly keep it selected. */}
                    {visibility === 'IMMEDIATE' && (
                      <div className="mt-2 p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-red-200 leading-relaxed">
                          <strong>Sẽ thay thế chương trình đang live</strong>{' '}
                          trên kênh{' '}
                          <strong>{selectedChannel?.name}</strong> bằng clip
                          chưa qua duyệt. Bạn sẽ được hỏi xác nhận trước khi
                          tải lên.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Upload Progress Bar */}
                  {uploadProgress > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-400">
                          Đang tải video lên server…
                        </span>
                        <span className="text-purple-400 font-bold">
                          {uploadProgress}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handlePublishSelfRecord}
                    disabled={
                      uploadFileMutation.isPending ||
                      uploadRecordMutation.isPending ||
                      !recordedFile
                    }
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-500/20 gap-2"
                  >
                    {uploadFileMutation.isPending ||
                    uploadRecordMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>TẢI LÊN & PHÁT SÓNG STUDIO</span>
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── MODE 3: Stream Source Catalog ──────────────────────────────── */}
        {activeTab === 'catalog' && (
          <div className="space-y-5">
            {/* Catalog Header */}
            <Card className="glass-card p-5 border border-[#1e2d44] bg-[#0c1421]/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-600/40 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      Danh Mục Nguồn Video Công Khai
                      {catalogData?.summary && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-700">
                          {catalogData.summary.total} nguồn
                        </span>
                      )}
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5 max-w-lg">
                      Chọn nhanh một nguồn video từ kho nguồn công khai (Mux, Cloudinary, Internet Archive, ...) và thêm vào kênh{' '}
                      <strong className="text-amber-300">{selectedChannel?.name ?? '—'}</strong>.
                      Các nguồn này đã được kiểm định trước bởi hệ thống và không cần kiểm tra thủ công.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Summary badges */}
                  {catalogData?.summary && (
                    <div className="hidden sm:flex items-center gap-2">
                      {Object.entries(catalogData.summary.byFormat).map(([fmt, count]) => (
                        <span
                          key={fmt}
                          className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-[#0e1726] text-slate-300 border border-[#1b2b42]"
                        >
                          {fmt} ×{count}
                        </span>
                      ))}
                      <span className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-green-950 text-green-300 border border-green-700">
                        <BadgeCheck className="w-3 h-3 inline mr-0.5" />
                        {catalogData.summary.verified} verified
                      </span>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetchCatalog()}
                    className="border-[#1e2d44] text-slate-300 hover:bg-[#152339]"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Làm mới
                  </Button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mt-4 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Tìm kiếm nguồn video (VD: HLS, Mux, Cloudinary, 4K...)..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#05080e] border border-[#1b2b42] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </Card>

            {/* Catalog Grid */}
            {loadingCatalog ? (
              <div className="p-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
                <p className="text-xs text-slate-400">
                  Đang tải danh mục nguồn video...
                </p>
              </div>
            ) : !catalogData?.items?.length ? (
              <Card className="glass-card p-10 text-center border border-[#1e2d44] bg-[#0c1421]/60 space-y-3">
                <Globe className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">
                  Không tìm thấy nguồn video nào.
                </p>
                <p className="text-xs text-slate-500">
                  Thử từ khóa tìm kiếm khác.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {catalogData.items.map((entry: StudioCatalogStream) => {
                  const alreadyAdded = addedCatalogIds.has(entry.id);
                  return (
                    <Card
                      key={entry.id}
                      className={`glass-card overflow-hidden border transition-all duration-200 ${
                        alreadyAdded
                          ? 'border-green-500/40 bg-green-950/20'
                          : 'border-[#1e2d44] bg-[#0c1421]/60 hover:border-amber-500/40 hover:bg-[#0c1421]/80'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-slate-900 overflow-hidden">
                        {entry.thumbnailUrl ? (
                          <img
                            src={entry.thumbnailUrl}
                            alt={entry.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Video className="w-8 h-8" />
                          </div>
                        )}
                        {/* Format Badge */}
                        <div className="absolute top-2 left-2 flex gap-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-black/80 text-white border border-white/20">
                            {entry.format}
                          </span>
                          {entry.resolution && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-950/90 text-blue-300 border border-blue-700">
                              {entry.resolution}
                            </span>
                          )}
                        </div>
                        {/* Verified Badge */}
                        {entry.verified && (
                          <div className="absolute top-2 right-2">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-green-950/90 text-green-300 border border-green-700 flex items-center gap-0.5">
                              <BadgeCheck className="w-2.5 h-2.5" />
                              Verified
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3 space-y-2">
                        <h3 className="text-xs font-bold text-white leading-tight line-clamp-2">
                          {entry.title}
                        </h3>
                        <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                          {entry.description}
                        </p>

                        {/* Meta row */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#0e1726] text-slate-300 border border-[#1b2b42]">
                              {entry.source}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#0e1726] text-slate-500 border border-[#1b2b42]">
                              {Math.round(entry.durationSec / 60)}m
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                                entry.license === 'Creative Commons' ||
                                entry.license === 'Public Domain'
                                  ? 'bg-blue-950/80 text-blue-300 border-blue-700'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {entry.license}
                            </span>
                          </div>
                        </div>

                        {/* Tags */}
                        {entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {entry.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#05080e] text-slate-500 border border-[#1b2b42]"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Action */}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={
                            addFromCatalogMutation.isPending ||
                            alreadyAdded ||
                            !selectedChannel
                          }
                          onClick={async () => {
                            if (!selectedChannel) return;
                            try {
                              await addFromCatalogMutation.mutateAsync({
                                channelId: selectedChannel.slug,
                                catalogId: entry.id,
                              });
                              setAddedCatalogIds((prev) => new Set([...prev, entry.id]));
                            } catch (err: any) {
                              alert(
                                err.response?.data?.message ||
                                  'Không thể thêm nguồn video vào kênh.',
                              );
                            }
                          }}
                          className={`w-full gap-1.5 mt-1 text-[11px] font-bold ${
                            alreadyAdded
                              ? 'border-green-500/50 text-green-300 bg-green-950/40 hover:bg-green-950/40 cursor-default'
                              : 'border-amber-600/50 text-amber-300 bg-amber-950/30 hover:bg-amber-900/40'
                          }`}
                        >
                          {addFromCatalogMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : alreadyAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Đã thêm vào kênh
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              Thêm vào kênh {selectedChannel?.name ?? '—'}
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── LIVE NOW confirm dialog ────────────────────────────────────
          Reached only when the user clicks "Tải lên & phát sóng" with
          visibility=IMMEDIATE. Forces an extra intentional click so we
          never broadcast unmoderated footage by accident. */}
      {showLiveConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() =>
            !uploadFileMutation.isPending &&
            !uploadRecordMutation.isPending &&
            setShowLiveConfirm(false)
          }
          role="dialog"
          aria-modal="true"
          aria-labelledby="live-confirm-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-red-500/40 bg-[#140b10] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-lg flex-shrink-0 bg-red-950/60 border border-red-500/40">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h3
                  id="live-confirm-title"
                  className="text-base font-bold text-white mb-1 flex items-center gap-2"
                >
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-red-600 text-white uppercase tracking-wider">
                    Live Now
                  </span>
                  <span>Xác nhận phát sóng LIVE?</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Clip <strong className="text-white">&ldquo;{selfTitle}&rdquo;</strong>{' '}
                  sẽ được đẩy lên <strong className="text-cyan-300">{selectedChannel?.name}</strong>{' '}
                  và <strong className="text-red-300">thay thế ngay chương trình đang live</strong>.
                  Mọi viewer đang xem kênh sẽ chuyển sang clip này trong vài giây.
                </p>
                <ul className="mt-2 text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                  <li>Chưa qua bước AI Curator duyệt nội dung</li>
                  <li>Không thể hoàn tác — phải bấm &ldquo;Dừng phát sóng&rdquo; thủ công</li>
                  <li>Nếu chỉ muốn lưu trữ, hãy chọn &ldquo;Lưu VOD cho kênh&rdquo;</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowLiveConfirm(false)}
                disabled={
                  uploadFileMutation.isPending ||
                  uploadRecordMutation.isPending
                }
                className="flex-1 px-3 py-2 rounded-lg text-xs font-bold text-slate-300 bg-[#152339] hover:bg-[#1a2c47] border border-[#1e2d44] transition-colors disabled:opacity-50"
              >
                Hủy — quay lại
              </button>
              <button
                type="button"
                onClick={doPublishSelfRecord}
                disabled={
                  uploadFileMutation.isPending ||
                  uploadRecordMutation.isPending
                }
                className="flex-1 px-3 py-2 rounded-lg text-xs font-black text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {uploadFileMutation.isPending ||
                uploadRecordMutation.isPending ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Đang phát sóng...
                  </>
                ) : (
                  <>
                    <Radio className="w-3 h-3" />
                    XÁC NHẬN PHÁT LIVE
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
