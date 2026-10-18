/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
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
  Mic,
  MicOff,
  RotateCcw,
  X,
  PlayCircle,
  FolderUp,
  HardDrive,
  Link2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CompactUserMenu } from '@/components/layout/compact-user-menu';
import { WebStudioViewfinder } from '@/components/studio/web-studio-viewfinder';
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
import { logError } from '@/lib/utils/safe-log';

type StudioTab = 'curated' | 'self-record' | 'catalog';
type RecordSource = 'camera' | 'screen' | 'upload';
type VisibilityMode = 'IMMEDIATE' | 'SCHEDULED' | 'PRIVATE';

export interface LocalPcFile {
  id: string;
  file: File;
  title: string;
  blobUrl: string;
  duration: number;
  thumbnailUrl?: string;
  sizeMb: string;
  isSelected: boolean;
}

const generateVideoThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadeddata = () => {
      video.currentTime = Math.min(1, (video.duration || 2) / 2);
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(320, video.videoWidth || 320);
        canvas.height = Math.min(180, video.videoHeight || 180);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbUrl = canvas.toDataURL('image/jpeg', 0.7);
          URL.revokeObjectURL(url);
          resolve(thumbUrl);
          return;
        }
      } catch {
        // Fallback silently
      }
      URL.revokeObjectURL(url);
      resolve('');
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
  });
};

export default function WebLiveStudioPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<StudioTab>('curated');

  // Preview Modal for any video in Mode 1 or Mode 3
  const [previewingVideo, setPreviewingVideo] = useState<{
    title: string;
    url: string;
    source?: string;
    duration?: number;
  } | null>(null);

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
  const [catalogFormatFilter, setCatalogFormatFilter] = useState<string>('ALL');
  const [catalogVerifiedOnly, setCatalogVerifiedOnly] = useState<boolean>(false);
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

  const curatedRecordings = useMemo(
    () => recordingsData?.items ?? [],
    [recordingsData?.items],
  );

  const selectedRecordings = useMemo(() => {
    return curatedRecordings.filter((r) => selectedRecordingIds.includes(r.id));
  }, [curatedRecordings, selectedRecordingIds]);

  // Local PC files chosen by user from computer
  const [localPcFiles, setLocalPcFiles] = useState<LocalPcFile[]>([]);
  const localFileInputRef = useRef<HTMLInputElement | null>(null);

  // Custom Direct URL Modal state
  const [showAddUrlModal, setShowAddUrlModal] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [customUrlTitle, setCustomUrlTitle] = useState('');
  const [customUrlDuration, setCustomUrlDuration] = useState(300);
  const [isAddingUrl, setIsAddingUrl] = useState(false);

  const handleLocalFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    toast.info(`Đang nạp ${files.length} file từ máy tính...`);

    const newLocalFiles: LocalPcFile[] = [];

    for (const file of files) {
      const blobUrl = URL.createObjectURL(file);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const title = file.name.replace(/\.[^/.]+$/, '');

      // Probe duration
      const duration = await new Promise<number>((resolve) => {
        const tempV = document.createElement('video');
        tempV.preload = 'metadata';
        tempV.onloadedmetadata = () => {
          resolve(Math.max(1, Math.round(tempV.duration)));
        };
        tempV.onerror = () => resolve(180); // 3m fallback
        tempV.src = blobUrl;
      });

      // Try thumbnail snapshot
      let thumbnailUrl: string | undefined = undefined;
      try {
        thumbnailUrl = await generateVideoThumbnail(file);
      } catch {
        // Fallback silently
      }

      newLocalFiles.push({
        id: `local-pc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        title,
        blobUrl,
        duration,
        thumbnailUrl,
        sizeMb,
        isSelected: true,
      });
    }

    setLocalPcFiles((prev) => [...prev, ...newLocalFiles]);
    toast.success(`Đã thêm ${files.length} file từ máy tính vào kho phát sóng!`);
    if (localFileInputRef.current) localFileInputRef.current.value = '';
  };

  const toggleLocalFileSelect = (id: string) => {
    setLocalPcFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isSelected: !f.isSelected } : f)),
    );
  };

  const removeLocalFile = (id: string) => {
    setLocalPcFiles((prev) => {
      const found = prev.find((f) => f.id === id);
      if (found?.blobUrl) URL.revokeObjectURL(found.blobUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const [savingLocalFileId, setSavingLocalFileId] = useState<string | null>(null);

  const handleSaveLocalFileToLibrary = async (local: LocalPcFile) => {
    if (!selectedChannel) return;
    try {
      setSavingLocalFileId(local.id);
      let videoUrl = local.blobUrl;
      try {
        const uploadRes = await uploadFileMutation.mutateAsync({
          file: local.file,
          title: local.title,
        });
        if (uploadRes?.url) videoUrl = uploadRes.url;
      } catch (err) {
        console.warn('[Live Studio] Direct storage upload fallback:', err);
      }

      await uploadRecordMutation.mutateAsync({
        channelId: selectedChannel.slug,
        title: local.title,
        description: `Video tải lên từ máy tính (${local.sizeMb} MB)`,
        videoUrl,
        duration: local.duration,
        visibility: 'SCHEDULED',
        tags: ['local-pc', 'custom-upload'],
      });

      toast.success(`Đã lưu "${local.title}" vào kho nội dung của kênh!`);
      removeLocalFile(local.id);
      refetchRecordings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể lưu file vào kho');
    } finally {
      setSavingLocalFileId(null);
    }
  };

  const normalizeMediaUrl = (raw: string): string => {
    let url = (raw || '').trim();
    if (!url) return '';

    // Google Drive share link -> direct download/stream link
    const gDriveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (gDriveMatch && gDriveMatch[1]) {
      return `https://drive.google.com/uc?export=download&id=${gDriveMatch[1]}`;
    }
    const gDriveIdMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (gDriveIdMatch && gDriveIdMatch[1]) {
      return `https://drive.google.com/uc?export=download&id=${gDriveIdMatch[1]}`;
    }

    // Dropbox share link -> direct media stream
    if (url.includes('dropbox.com')) {
      if (url.includes('dl=0')) {
        return url.replace('dl=0', 'raw=1');
      }
      if (!url.includes('raw=1') && !url.includes('dl=1')) {
        return url.includes('?') ? `${url}&raw=1` : `${url}?raw=1`;
      }
    }

    return url;
  };

  const handleAddCustomUrl = async () => {
    if (!selectedChannel || !customUrlInput.trim()) return;
    try {
      setIsAddingUrl(true);
      const cleanUrl = normalizeMediaUrl(customUrlInput);
      const title = customUrlTitle.trim() || `Video liên kết - ${new Date().toLocaleTimeString('vi-VN')}`;
      await uploadRecordMutation.mutateAsync({
        channelId: selectedChannel.slug,
        title,
        description: 'Video thêm trực tiếp từ đường link tải xuống / phát trực tuyến',
        videoUrl: cleanUrl,
        duration: customUrlDuration || 300,
        visibility: 'SCHEDULED',
        tags: ['custom-url', 'direct-stream'],
      });
      toast.success('Đã thêm video vào kho của kênh thành công!');
      setCustomUrlInput('');
      setCustomUrlTitle('');
      setShowAddUrlModal(false);
      refetchRecordings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể thêm video từ URL');
    } finally {
      setIsAddingUrl(false);
    }
  };

  const totalSelectedDuration = useMemo(() => {
    const serverDuration = selectedRecordings.reduce(
      (sum, r) => sum + (r.duration || 0),
      0,
    );
    const localDuration = localPcFiles
      .filter((f) => f.isSelected)
      .reduce((sum, f) => sum + f.duration, 0);
    return serverDuration + localDuration;
  }, [selectedRecordings, localPcFiles]);

  const selectedLocalFiles = useMemo(
    () => localPcFiles.filter((f) => f.isSelected),
    [localPcFiles],
  );

  const curateLiveMutation = useCurateLive();
  const stopLiveMutation = useStopLive();

  const toggleRecordingSelect = (id: string) => {
    setSelectedRecordingIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleStartCuratedLive = async () => {
    if (!selectedChannel) return;

    if (selectedRecordingIds.length === 0 && selectedLocalFiles.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 nội dung từ kho hoặc file trong máy để phát sóng.');
      return;
    }

    try {
      let allRecordingIds = [...selectedRecordingIds];

      // If user selected files from their PC, persist them to the channel library first
      if (selectedLocalFiles.length > 0) {
        toast.info('Đang nạp file từ máy tính vào hệ thống phát sóng...');

        for (const local of selectedLocalFiles) {
          let videoUrl = local.blobUrl;

          // Attempt server file upload
          try {
            const uploadRes = await uploadFileMutation.mutateAsync({
              file: local.file,
              title: local.title,
            });
            if (uploadRes?.url) {
              videoUrl = uploadRes.url;
            }
          } catch (uploadErr) {
            console.warn('[Live Studio] Direct file upload fallback to stream:', uploadErr);
          }

          // Register in database library
          const savedRec = await uploadRecordMutation.mutateAsync({
            channelId: selectedChannel.slug,
            title: local.title,
            description: customDesc || `Nội dung phát từ PC của bạn (${local.sizeMb} MB)`,
            videoUrl: videoUrl,
            duration: local.duration,
            visibility: 'SCHEDULED',
            tags: ['pc-upload', 'studio-local'],
          });

          if (savedRec?.recording?.id) {
            allRecordingIds.push(savedRec.recording.id);
          }
        }
      }

      if (allRecordingIds.length > 0) {
        const res = await curateLiveMutation.mutateAsync({
          channelId: selectedChannel.slug,
          recordingIds: allRecordingIds,
          title: customTitle.trim() || undefined,
          description: customDesc.trim() || undefined,
          allowDevLicense: true,
        });
        toast.success(res.message || 'Đã phát sóng trực tiếp thành công!');
        setSelectedRecordingIds([]);
        setCustomTitle('');
        setCustomDesc('');
        refetchLiveEvents();
        refetchRecordings();
      }
    } catch (err: any) {
      logError('[OmniCast Studio Live Error]:', err);
      toast.error(
        err.response?.data?.message || err.message || 'Có lỗi xảy ra khi bắt đầu phát sóng.',
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
      toast.success(res.message || 'Đã dừng phát sóng.');
      refetchLiveEvents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể dừng phát sóng.');
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
  const [hasActiveStream, setHasActiveStream] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [uploadedFileMeta, setUploadedFileMeta] = useState<{
    duration: number;
    width?: number;
    height?: number;
    sizeMb?: string;
  } | null>(null);

  const [selfTitle, setSelfTitle] = useState('');
  const [selfDesc, setSelfDesc] = useState('');
  const [visibility, setVisibility] = useState<VisibilityMode>('SCHEDULED');
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
    setHasActiveStream(false);
  };

  const toggleAudio = () => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !audioEnabled;
        audioTracks.forEach((t) => (t.enabled = nextState));
        setAudioEnabled(nextState);
        toast.info(nextState ? 'Đã bật âm thanh microphone' : 'Đã tắt microphone');
      } else {
        toast.warning('Không tìm thấy thiết bị microphone trong luồng hiện tại');
      }
    }
  };

  const startStreamPreview = async (source: 'camera' | 'screen') => {
    stopMediaTracks();
    setRecordedBlob(null);
    setRecordedFile(null);
    if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl);
    setRecordedPreviewUrl(null);
    setUploadedFileMeta(null);

    try {
      let stream: MediaStream;
      if (source === 'camera') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: audioEnabled,
          });
        } catch {
          // If microphone fails, retry with video only
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          });
          toast.info('Chưa kết nối microphone; luồng phát tạm thời ở chế độ tắt tiếng.');
        }
      } else {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: audioEnabled,
          });
        } catch {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false,
          });
        }
      }

      mediaStreamRef.current = stream;
      setHasActiveStream(true);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }
      toast.success(
        source === 'camera'
          ? 'Đã kích hoạt luồng Webcam HD'
          : 'Đã kết nối nguồn chia sẻ màn hình',
      );
    } catch (err: any) {
      setHasActiveStream(false);
      if (err.name !== 'NotAllowedError') {
        toast.error('Không thể mở thiết bị ghi hình/màn hình: ' + err.message);
      }
    }
  };

  const startRecording = () => {
    if (!mediaStreamRef.current) {
      toast.warning('Chưa có nguồn media. Hãy kích hoạt Camera hoặc Màn hình trước.');
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
      setHasActiveStream(false);

      const isLocalhost =
        typeof window !== 'undefined' &&
        (window.location.hostname.includes('localhost') ||
          window.location.hostname.includes('127.0.0.1'));
      if (!isLocalhost && blob.size > 4.2 * 1024 * 1024) {
        toast.warning(
          `Clip vừa ghi có dung lượng ${(blob.size / (1024 * 1024)).toFixed(1)} MB (vượt 4.5 MB của Vercel). Để test trên bản Deploy Vercel, hãy quay clip ngắn dưới 5 giây.`,
          { duration: 7000 },
        );
      }
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
      toast.success('Đã hoàn tất ghi hình! Bạn có thể xem lại trước khi xuất bản.');
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

    // Auto-probe real duration and resolution of the uploaded clip
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.onloadedmetadata = () => {
      const detectedDuration = Math.max(1, Math.round(tempVideo.duration));
      setRecordingSeconds(detectedDuration);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setUploadedFileMeta({
        duration: detectedDuration,
        width: tempVideo.videoWidth,
        height: tempVideo.videoHeight,
        sizeMb,
      });
      toast.success(
        `Đã nạp file video (${detectedDuration}s, ${sizeMb} MB)`,
      );

      const isLocalhost =
        typeof window !== 'undefined' &&
        (window.location.hostname.includes('localhost') ||
          window.location.hostname.includes('127.0.0.1'));
      if (!isLocalhost && file.size > 4.2 * 1024 * 1024) {
        toast.warning(
          `File video (${sizeMb} MB) vượt quá giới hạn 4.5 MB của Vercel Serverless. Vui lòng chọn file nhẹ hơn hoặc dùng tab "Phát từ nội dung có sẵn".`,
          { duration: 7000 },
        );
      }
    };
    tempVideo.src = url;
  };

  const handlePublishSelfRecord = async () => {
    if (!selectedChannel) return;
    if (!recordedFile) {
      toast.warning('Vui lòng quay video hoặc tải file video lên trước.');
      return;
    }
    if (!selfTitle.trim()) {
      toast.warning('Vui lòng nhập tiêu đề cho chương trình phát sóng.');
      return;
    }

    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname.includes('localhost') ||
        window.location.hostname.includes('127.0.0.1'));
    if (!isLocalhost && recordedFile.size > 4.2 * 1024 * 1024) {
      toast.warning(
        `File video (${(recordedFile.size / (1024 * 1024)).toFixed(1)} MB) tương đối lớn đối với Vercel Serverless (4.5 MB). Hệ thống sẽ cố gắng tải lên, nếu không thành công bạn hãy phát qua Mode 1 (Kho nội dung & File PC).`,
        { duration: 8000 },
      );
    }

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
        videoUrl: (uploadRes as any)?.url || (uploadRes as any)?.data?.url || uploadRes.url,
        duration: durationSec,
        visibility,
        tags: ['web-studio', 'self-record'],
      });

      toast.success(res.message || 'Đã xuất bản video thành công!');
      setSelfTitle('');
      setSelfDesc('');
      setRecordedFile(null);
      setRecordedBlob(null);
      if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl);
      setRecordedPreviewUrl(null);
      setUploadedFileMeta(null);
      setRecordingSeconds(0);
      setUploadProgress(0);
      setVisibility('SCHEDULED');
      refetchLiveEvents();
      refetchRecordings();
    } catch (err: any) {
      // `err` is typically an AxiosError whose `config.headers`
      // carries the live `Authorization: Bearer <jwt>` header.
      // Route through `logError` so that token never lands in
      // the browser console / Sentry.
      logError('[OmniCast Studio Live Error]:', err);
      if (err.response?.status === 413 || err.message?.includes('413')) {
        toast.error(
          'Dung lượng video vượt quá giới hạn 4.5MB của Vercel Serverless. Vui lòng chọn clip ngắn hơn hoặc dùng tab "Phát từ nội dung có sẵn".',
          { duration: 8000 },
        );
      } else {
        const apiMsg = Array.isArray(err.response?.data?.message)
          ? err.response.data.message.join(', ')
          : err.response?.data?.message ||
            err.message ||
            'Có lỗi xảy ra khi tải lên phát sóng.';
        toast.error(apiMsg);
      }
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
                      Kho Nội Dung Phát Sóng (Kênh &amp; File PC)
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Chọn video trong kho kênh hoặc chọn trực tiếp file video/audio từ máy tính (PC) của bạn
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      ref={localFileInputRef}
                      type="file"
                      accept="video/*,audio/*"
                      multiple
                      onChange={handleLocalFilesSelected}
                      className="hidden"
                    />
                    <Button
                      size="sm"
                      onClick={() => localFileInputRef.current?.click()}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs gap-1.5 shadow-[0_0_12px_rgba(0,242,254,0.25)]"
                    >
                      <FolderUp className="w-3.5 h-3.5" />
                      Chọn file trong máy (PC)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddUrlModal((prev) => !prev)}
                      className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40 font-bold text-xs gap-1.5"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Thêm qua URL
                    </Button>
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
                </div>

                {/* Direct Video URL Modal / Accordion */}
                {showAddUrlModal && (
                  <div className="p-3.5 rounded-2xl bg-[#09111c] border border-cyan-500/40 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                        <Link2 className="w-4 h-4 text-cyan-400" />
                        <span>Thêm Video Vào Kho Qua Đường Dẫn Trực Tiếp (Direct URL)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddUrlModal(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] text-slate-400 font-semibold">Đường link video, link tải về (Google Drive, Dropbox, MP4, HLS m3u8, CDN, Blob...):</label>
                        <input
                          type="text"
                          value={customUrlInput}
                          onChange={(e) => setCustomUrlInput(e.target.value)}
                          placeholder="Dán link video hoặc link tải về (Drive, Dropbox, direct MP4/m3u8, CDN...)"
                          className="w-full px-3 py-1.5 rounded-lg bg-[#05080e] border border-[#1b2b42] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-semibold">Thời lượng ước tính (giây):</label>
                        <input
                          type="number"
                          value={customUrlDuration}
                          onChange={(e) => setCustomUrlDuration(Number(e.target.value) || 120)}
                          placeholder="300"
                          className="w-full px-3 py-1.5 rounded-lg bg-[#05080e] border border-[#1b2b42] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                      <input
                        type="text"
                        value={customUrlTitle}
                        onChange={(e) => setCustomUrlTitle(e.target.value)}
                        placeholder="Tiêu đề video (Ví dụ: Giới thiệu kênh OmniCast HD)..."
                        className="flex-1 px-3 py-1.5 rounded-lg bg-[#05080e] border border-[#1b2b42] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                      <Button
                        size="sm"
                        disabled={isAddingUrl || !customUrlInput.trim()}
                        onClick={handleAddCustomUrl}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs gap-1.5"
                      >
                        {isAddingUrl ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>Lưu &amp; Thêm Vào Kho Kênh</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Local PC Files List (if any chosen) */}
                {localPcFiles.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-[#0e192a] to-[#09101d] border border-cyan-500/40 shadow-md space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                          Nội Dung Đã Chọn Từ Máy Tính (PC) ({localPcFiles.length} file)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => localFileInputRef.current?.click()}
                        className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Chọn thêm file khác
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 divide-y divide-[#18273c]">
                      {localPcFiles.map((f) => (
                        <div
                          key={f.id}
                          className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            f.isSelected
                              ? 'bg-cyan-950/60 border-cyan-500/50 shadow-sm'
                              : 'bg-[#09101d] border-[#18273c] opacity-75'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={f.isSelected}
                              onChange={() => toggleLocalFileSelect(f.id)}
                              className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                            />

                            <div className="w-16 h-10 rounded-lg bg-black overflow-hidden relative flex-shrink-0 border border-cyan-900/50">
                              {f.thumbnailUrl ? (
                                <img
                                  src={f.thumbnailUrl}
                                  alt={f.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-cyan-400">
                                  <FileVideo className="w-4 h-4" />
                                </div>
                              )}
                              <span className="absolute bottom-0.5 right-0.5 px-1 rounded text-[8px] font-mono bg-black/80 text-white font-bold">
                                {formatTime(f.duration)}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <input
                                type="text"
                                value={f.title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLocalPcFiles((prev) =>
                                    prev.map((item) =>
                                      item.id === f.id ? { ...item, title: val } : item,
                                    ),
                                  );
                                }}
                                className="w-full bg-transparent text-xs font-bold text-white border-b border-transparent hover:border-cyan-500/40 focus:border-cyan-400 focus:outline-none truncate"
                                title="Click để chỉnh sửa tiêu đề file"
                              />
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-950 px-1 rounded border border-cyan-800">
                                  FILE PC ({f.sizeMb} MB)
                                </span>
                                <span className="text-[9px] text-slate-400 truncate">
                                  {f.file.type || 'video'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewingVideo({
                                  title: f.title,
                                  url: f.blobUrl,
                                  source: 'Máy tính cá nhân (PC)',
                                  duration: f.duration,
                                })
                              }
                              className="p-1.5 rounded-lg bg-[#0c1422] hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 border border-[#1b2b42] transition-colors"
                              title="Xem thử video"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={savingLocalFileId === f.id}
                              onClick={() => handleSaveLocalFileToLibrary(f)}
                              className="h-7 px-2 text-[10px] border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/60"
                              title="Lưu video này vào kho thư viện của kênh"
                            >
                              {savingLocalFileId === f.id ? (
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              ) : (
                                <Upload className="w-3 h-3 mr-1" />
                              )}
                              Lưu vào kho
                            </Button>
                            <button
                              type="button"
                              onClick={() => removeLocalFile(f.id)}
                              className="p-1.5 rounded-lg bg-[#0c1422] hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-[#1b2b42] transition-colors"
                              title="Bỏ file này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm theo tiêu đề video trong kho kênh..."
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
                  <div className="p-8 text-center rounded-xl bg-[#070b12] border border-[#142032] space-y-3">
                    <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-300">
                      Chưa có video nào trong kho lưu trữ của kênh này.
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Bạn có thể chọn nhanh nguồn từ kho video công khai đã kiểm định (Mode 3) hoặc tự quay/upload clip mới (Mode 2).
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => localFileInputRef.current?.click()}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs gap-1.5 shadow-[0_0_12px_rgba(0,242,254,0.25)]"
                      >
                        <FolderUp className="w-3.5 h-3.5" />
                        Chọn file từ máy tính (PC)
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setActiveTab('catalog')}
                        className="bg-amber-600/80 hover:bg-amber-600 text-white font-bold text-xs gap-1.5"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Thêm từ Mode 3 (Kho công khai)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTab('self-record')}
                        className="border-purple-500/40 text-purple-300 hover:bg-purple-950/40 font-bold text-xs gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Tự ghi hình ở Mode 2
                      </Button>
                    </div>
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

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewingVideo({
                                  title: rec.title,
                                  url: rec.videoUrl,
                                  source: rec.contentSource,
                                  duration: rec.duration,
                                });
                              }}
                              className="p-1.5 rounded-lg bg-[#0a121e] hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 border border-[#1b2b42] transition-colors"
                              title="Xem thử video"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <span
                              className={`text-[10px] font-bold px-2 py-1 rounded transition-all ${
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-400">
                        Đã chọn ({selectedRecordingIds.length + selectedLocalFiles.length} nội dung):
                      </label>
                      {(selectedRecordingIds.length > 0 || selectedLocalFiles.length > 0) && (
                        <span className="text-[10px] font-mono font-bold text-cyan-400">
                          Tổng: {formatTime(totalSelectedDuration)}
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#05080e] border border-[#1b2b42] text-xs font-mono text-cyan-300 min-h-[42px] flex items-center justify-between">
                      {selectedRecordingIds.length === 0 && selectedLocalFiles.length === 0 ? (
                        <span className="text-slate-600">
                          Chưa chọn nội dung nào từ kho hoặc máy tính
                        </span>
                      ) : (
                        <div className="w-full flex items-center justify-between">
                          <span>
                            {selectedRecordingIds.length > 0 && `${selectedRecordingIds.length} từ kho`}
                            {selectedRecordingIds.length > 0 && selectedLocalFiles.length > 0 && ' + '}
                            {selectedLocalFiles.length > 0 && `${selectedLocalFiles.length} file từ PC`} sẵn sàng nối sóng
                          </span>
                          <span className="text-[10px] text-slate-400 font-sans">
                            ({formatTime(totalSelectedDuration)})
                          </span>
                        </div>
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
                      trên hệ thống OmniCast hoặc tệp tin thuộc quyền sở hữu của bạn. Mọi nguồn nhúng thương mại bị cấm
                      tuyệt đối.
                    </p>
                  </div>

                  {/* Active Live Warning Banner */}
                  {activeLiveForChannel && (
                    <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-200 leading-relaxed">
                        <strong>Kênh đang có luồng LIVE:</strong> &ldquo;{activeLiveForChannel.title}&rdquo;.
                        Phát sóng danh sách này sẽ dừng luồng hiện tại và thay thế ngay.
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleStartCuratedLive}
                    disabled={
                      curateLiveMutation.isPending ||
                      (selectedRecordingIds.length === 0 && selectedLocalFiles.length === 0)
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
                  recordedPreviewUrl ? (
                    /* Recorded Video In-Place Review Player */
                    <div className="relative aspect-video rounded-2xl bg-black overflow-hidden border border-green-500/50 shadow-2xl flex items-center justify-center">
                      <video
                        src={recordedPreviewUrl}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-950/90 border border-green-500/60 backdrop-blur-md">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        <span className="font-mono text-xs font-bold text-white">
                          BẢN GHI SẴN SÀNG ({formatTime(recordingSeconds)})
                        </span>
                      </div>
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl);
                            setRecordedPreviewUrl(null);
                            setRecordedBlob(null);
                            setRecordedFile(null);
                            setRecordingSeconds(0);
                            startStreamPreview(recordSource);
                          }}
                          className="border-slate-700 bg-black/80 hover:bg-black text-slate-200 text-xs font-bold gap-1.5 shadow-lg"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                          <span>Ghi hình lại</span>
                        </Button>
                      </div>
                    </div>
                  ) : hasActiveStream ? (
                    <WebStudioViewfinder
                      videoRef={videoPreviewRef}
                      mediaStream={mediaStreamRef.current}
                      recordSource={recordSource}
                      isRecording={isRecording}
                      recordingSeconds={recordingSeconds}
                      audioEnabled={audioEnabled}
                      toggleAudio={toggleAudio}
                      startRecording={startRecording}
                      stopRecording={stopRecording}
                      channelName={selectedChannel?.name || 'OMNICAST 1 HD'}
                      channelLogoUrl={selectedChannel?.logoUrl}
                      topic={selfTitle || 'BẢN TIN PHÁT THANH TRUYỀN HÌNH TRỰC TIẾP'}
                      onRetake={() => {
                        setRecordedPreviewUrl(null);
                        setRecordedBlob(null);
                        setRecordedFile(null);
                        setRecordingSeconds(0);
                        startStreamPreview(recordSource);
                      }}
                    />
                  ) : (
                    /* Cyber Standby State (No signal yet - solves the black screen!) */
                    <div className="relative aspect-video rounded-2xl bg-gradient-to-b from-[#090f1a] to-[#04070d] border border-[#1e2d44] flex flex-col items-center justify-center p-6 text-center space-y-4">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/10">
                          {recordSource === 'camera' ? (
                            <Camera className="w-8 h-8 animate-pulse" />
                          ) : (
                            <Monitor className="w-8 h-8 animate-pulse" />
                          )}
                        </div>
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400" />
                      </div>

                      <div className="space-y-1 max-w-sm">
                        <h3 className="text-sm font-bold text-white">
                          {recordSource === 'camera'
                            ? 'Webcam & Microphone Đang Chờ Kích Hoạt'
                            : 'Chưa Chọn Màn Hình Hoặc Cửa Sổ Chia Sẻ'}
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {recordSource === 'camera'
                            ? 'Kích hoạt camera máy tính để bắt đầu phát sóng trực tiếp hoặc thu lại bản tin/bài giảng.'
                            : 'Chọn toàn màn hình, cửa sổ ứng dụng hoặc tab trình duyệt để ghi lại nội dung phát sóng.'}
                        </p>
                      </div>

                      <Button
                        onClick={() => startStreamPreview(recordSource as 'camera' | 'screen')}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs gap-2 shadow-xl shadow-purple-500/25"
                      >
                        {recordSource === 'camera' ? (
                          <>
                            <Camera className="w-4 h-4" />
                            <span>KÍCH HOẠT WEBCAM & MIC</span>
                          </>
                        ) : (
                          <>
                            <Monitor className="w-4 h-4" />
                            <span>CHỌN MÀN HÌNH CHIA SẺ</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )
                ) : (
                  /* File Upload Mode */
                  recordedPreviewUrl ? (
                    <div className="relative aspect-video rounded-2xl bg-black overflow-hidden border border-purple-500/40 flex items-center justify-center">
                      <video
                        src={recordedPreviewUrl}
                        controls
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/90 border border-purple-500/60 backdrop-blur-md">
                        <FileVideo className="w-3.5 h-3.5 text-purple-400" />
                        <span className="font-mono text-xs font-bold text-white">
                          TỆP ĐÃ NẠP: {uploadedFileMeta?.sizeMb ?? '0'} MB ({formatTime(recordingSeconds)})
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleFileUploadChange}
                          className="hidden"
                          id="video-file-reselect"
                        />
                        <label
                          htmlFor="video-file-reselect"
                          className="px-3 py-1.5 rounded-xl border border-slate-700 bg-black/80 hover:bg-black text-slate-300 text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-all shadow-lg"
                        >
                          <Upload className="w-3.5 h-3.5 text-purple-400" />
                          <span>Đổi tệp khác</span>
                        </label>
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
                          Hỗ trợ định dạng MP4, WebM, MOV. Tối đa 500 MB. Tự động nhận diện thời lượng.
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
                  )
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
                  {/* Clip Status Telemetry */}
                  <div className="p-2.5 rounded-xl bg-[#05080e] border border-[#1b2b42] flex items-center justify-between text-xs">
                    <span className="text-slate-400">Trạng thái clip:</span>
                    {recordedFile ? (
                      <span className="font-mono text-green-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đã sẵn sàng ({formatTime(recordingSeconds)})
                      </span>
                    ) : (
                      <span className="font-mono text-slate-600">Chưa có clip ghi hình</span>
                    )}
                  </div>

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
                      {/* ── IMMEDIATE — HIGHEST RISK ── */}
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

                      {/* ── SCHEDULED — DEFAULT (VOD) ── */}
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

                      {/* ── PRIVATE — DRAFT ── */}
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

                  {/* Cloud Environment Notice */}
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/25 space-y-1">
                    <div className="flex items-center gap-1.5 text-purple-300 font-mono text-[10px] font-bold uppercase">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Lưu ý phát sóng Cloud Vercel</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Môi trường Serverless giới hạn tải lên tối đa <strong>4.5 MB</strong> (~3-5 giây). Để phát sóng các chương trình dài (30p – 2h), hãy chuyển sang tab <strong>&ldquo;Phát từ nội dung có sẵn&rdquo;</strong> hoặc <strong>&ldquo;Catalog nguồn mở&rdquo;</strong>.
                    </p>
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
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-500/20 gap-2 disabled:opacity-50"
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
                      Các nguồn này đã được kiểm định trước bởi hệ thống và sẵn sàng phát sóng ngay.
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

              {/* Search & Filter Toolbar */}
              <div className="mt-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Tìm kiếm nguồn video (VD: HLS, Mux, Cloudinary, 4K...)..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#05080e] border border-[#1b2b42] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {['ALL', 'HLS', 'MP4', 'DASH', 'WEBM'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setCatalogFormatFilter(fmt)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        catalogFormatFilter === fmt
                          ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                          : 'bg-[#0e1726] text-slate-400 hover:text-white border border-[#1b2b42]'
                      }`}
                    >
                      {fmt === 'ALL' ? 'Tất cả' : fmt}
                    </button>
                  ))}

                  <button
                    onClick={() => setCatalogVerifiedOnly(!catalogVerifiedOnly)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all ${
                      catalogVerifiedOnly
                        ? 'bg-green-950 text-green-300 border border-green-500 shadow-sm'
                        : 'bg-[#0e1726] text-slate-400 hover:text-white border border-[#1b2b42]'
                    }`}
                  >
                    <BadgeCheck className="w-3.5 h-3.5" />
                    <span>Verified Only</span>
                  </button>
                </div>
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
                  Thử từ khóa tìm kiếm hoặc bộ lọc khác.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {catalogData.items
                  .filter((entry: StudioCatalogStream) => {
                    if (catalogFormatFilter !== 'ALL' && entry.format !== catalogFormatFilter) {
                      return false;
                    }
                    if (catalogVerifiedOnly && !entry.verified) {
                      return false;
                    }
                    return true;
                  })
                  .map((entry: StudioCatalogStream) => {
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

                          {/* Preview Stream Button Top-Right */}
                          <div className="absolute top-2 right-2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewingVideo({
                                  title: entry.title,
                                  url: entry.url,
                                  source: `${entry.source} · ${entry.format}`,
                                  duration: entry.durationSec,
                                })
                              }
                              className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-black/80 hover:bg-amber-950 text-amber-300 hover:text-white border border-amber-600/40 flex items-center gap-1 transition-all backdrop-blur-sm"
                              title="Xem thử luồng video này"
                            >
                              <PlayCircle className="w-3 h-3 text-amber-400" />
                              <span>Xem thử</span>
                            </button>
                            {entry.verified && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-green-950/90 text-green-300 border border-green-700 flex items-center gap-0.5">
                                <BadgeCheck className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
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
                          {alreadyAdded ? (
                            <div className="space-y-1 mt-1">
                              <div className="w-full py-1.5 px-2 rounded-lg text-[11px] font-bold border border-green-500/50 text-green-300 bg-green-950/40 flex items-center justify-center gap-1.5">
                                <Check className="w-3.5 h-3.5" />
                                Đã thêm vào kênh
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  refetchRecordings();
                                  setActiveTab('curated');
                                }}
                                className="w-full py-1.5 px-2 rounded-lg bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/50 hover:to-blue-600/50 border border-cyan-500/50 text-cyan-200 text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                              >
                                <Radio className="w-3 h-3 text-cyan-400" />
                                <span>Phát sóng ngay ở Mode 1 &rarr;</span>
                              </button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                addFromCatalogMutation.isPending ||
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
                                  toast.success(`Đã thêm "${entry.title}" vào kênh ${selectedChannel.name}`);
                                  refetchRecordings();
                                } catch (err: any) {
                                  toast.error(
                                    err.response?.data?.message ||
                                      'Không thể thêm nguồn video vào kênh.',
                                  );
                                }
                              }}
                              className="w-full gap-1.5 mt-1 text-[11px] font-bold border-amber-600/50 text-amber-300 bg-amber-950/30 hover:bg-amber-900/40"
                            >
                              {addFromCatalogMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  Thêm vào kênh {selectedChannel?.name ?? '—'}
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── LIVE NOW confirm dialog ──────────────────────────────────── */}
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

      {/* ── Global Video Preview Modal (Mode 1 & Mode 3) ─────────────── */}
      {previewingVideo && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewingVideo(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-cyan-500/40 bg-[#090f19] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#1b2b42] bg-[#0c1424]">
              <div className="flex items-center gap-2 min-w-0 pr-3">
                <Film className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <h3 className="text-sm font-bold text-white truncate">
                  {previewingVideo.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingVideo(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Video Player */}
            <div className="relative aspect-video bg-black">
              <video
                src={previewingVideo.url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#080d16] border-t border-[#1b2b42] flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {previewingVideo.source || 'Nội dung Studio'}
                </span>
                {previewingVideo.duration && previewingVideo.duration > 0 && (
                  <span className="font-mono text-slate-300">
                    Thời lượng: {formatTime(previewingVideo.duration)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewingVideo(null)}
                className="px-3 py-1 rounded-lg bg-[#152339] hover:bg-[#1a2c47] text-white text-xs font-bold transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
