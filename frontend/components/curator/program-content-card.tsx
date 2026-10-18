'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Pause,
  Play,
  Square,
  BookOpen,
  Headphones,
  ExternalLink,
  Clock,
  Globe,
  Tag,
  Tv,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { AiCuratorReport } from '@/types';

export interface ProgramContentCardProps {
  id: string;
  title: string;
  description?: string;
  category?: string;
  channelName?: string;
  scheduledAt?: string;
  thumbnailUrl?: string;
  externalUrl?: string;
  streamUrl?: string;
  tags?: string[];
  duration?: number;
  language?: string;
  aiReport?: AiCuratorReport;
}

export function ProgramContentCard({
  title,
  description,
  category,
  channelName,
  scheduledAt,
  thumbnailUrl,
  externalUrl,
  streamUrl,
  tags,
  duration,
  language,
  aiReport,
}: ProgramContentCardProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setTtsSupported(true);
    }
  }, []);

  // Stop any active speech when the component unmounts or title changes
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [title]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const handleSpeak = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      return;
    }

    if (isSpeaking && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Prepare speech text
    const cleanDesc = description?.trim() || '';
    const isEnglish =
      language === 'en' ||
      /^[a-zA-Z0-9\s.,'’"?!:;\-–—🎧📖🌟|]+$/.test(title.slice(0, 50));

    let speechText = '';
    if (isEnglish) {
      speechText = `Program: ${title}. `;
      if (cleanDesc) {
        speechText += `Content overview: ${cleanDesc}. `;
      } else {
        speechText += `Audiobook or media broadcast. `;
      }
      if (aiReport) {
        speechText += `AI Curator analysis: Suitability rating is ${aiReport.broadcastSuitability}. Suggested time slot is ${aiReport.suggestedTimeSlot}. `;
        if (aiReport.targetAudienceVibe) {
          speechText += `Target audience vibe: ${aiReport.targetAudienceVibe}. `;
        }
      }
    } else {
      speechText = `Chương trình: ${title}. `;
      if (cleanDesc) {
        speechText += `Nội dung: ${cleanDesc}. `;
      } else {
        speechText += `Chương trình phát thanh truyền hình. `;
      }
      if (aiReport) {
        const suitabilityVi =
          aiReport.broadcastSuitability === 'PRIME_TIME'
            ? 'Khung giờ vàng'
            : aiReport.broadcastSuitability === 'STANDARD'
            ? 'Phát thường'
            : 'Hạn chế';
        speechText += `Đánh giá kiểm duyệt AI: Mức độ phát sóng ${suitabilityVi}. Khung giờ đề xuất ${aiReport.suggestedTimeSlot}. `;
        if (aiReport.targetAudienceVibe) {
          speechText += `Đối tượng khán giả: ${aiReport.targetAudienceVibe}. `;
        }
      }
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utteranceRef.current = utterance;

    // Pick a fitting voice
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      if (isEnglish) {
        const enVoice =
          voices.find(
            (v) =>
              (v.lang.startsWith('en-US') || v.lang.startsWith('en')) &&
              !v.name.includes('Google') === false,
          ) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0];
        if (enVoice) utterance.voice = enVoice;
      } else {
        const viVoice =
          voices.find((v) => v.lang.startsWith('vi')) || voices[0];
        if (viVoice) utterance.voice = viVoice;
      }
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [title, description, language, aiReport, isSpeaking, isPaused]);

  const hasMediaSource = Boolean(externalUrl || streamUrl);
  const mediaLink = externalUrl || streamUrl;
  const isAudiobook =
    title.toLowerCase().includes('audiobook') ||
    title.includes('🎧') ||
    title.includes('📖');

  return (
    <div className="rounded-xl border border-dark-700 bg-dark-900/60 p-4 space-y-4">
      {/* Header bar with Voice Reader and Source buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-dark-800">
        <div className="flex items-center gap-2">
          {isAudiobook ? (
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Headphones className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-4 h-4" />
            </div>
          )}
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-dark-400">
              {isAudiobook ? 'Audiobook / Âm thanh' : 'Nội dung chương trình'}
            </span>
          </div>
        </div>

        {/* TTS & Media Actions */}
        <div className="flex items-center gap-2">
          {ttsSupported && (
            <div className="flex items-center gap-1.5">
              {isSpeaking && (
                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-md">
                  <div className="flex items-center gap-0.5 h-3">
                    <span className="w-1 bg-emerald-400 h-3 rounded-full animate-pulse" />
                    <span className="w-1 bg-cyan-400 h-2 rounded-full animate-pulse delay-75" />
                    <span className="w-1 bg-primary-400 h-3.5 rounded-full animate-pulse delay-150" />
                  </div>
                  <span className="text-[11px] font-medium text-emerald-300 ml-1">
                    {isPaused ? 'Đang tạm dừng' : 'Đang đọc'}
                  </span>
                </div>
              )}

              <Button
                size="sm"
                variant={isSpeaking ? 'default' : 'outline'}
                onClick={handleSpeak}
                className={cn(
                  'h-8 text-xs gap-1.5 transition-all',
                  isSpeaking
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500',
                )}
                title="Đọc nội dung và đánh giá kiểm duyệt bằng giọng đọc AI"
              >
                {isSpeaking ? (
                  isPaused ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Tiếp tục đọc
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      Tạm dừng
                    </>
                  )
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    Đọc nội dung (AI Voice)
                  </>
                )}
              </Button>

              {isSpeaking && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={stopSpeaking}
                  className="h-8 px-2 text-dark-400 hover:text-white"
                  title="Dừng đọc"
                >
                  <Square className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          )}

          {hasMediaSource && (
            <a
              href={mediaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-dark-600 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-primary-400" />
              Nguồn phát gốc
            </a>
          )}
        </div>
      </div>

      {/* Main Content Details */}
      <div className="flex gap-4 items-start">
        {thumbnailUrl && (
          <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 border border-dark-700 bg-dark-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="space-y-2 flex-1 min-w-0">
          <h3 className="text-base font-bold text-white leading-snug break-words">
            {title}
          </h3>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-dark-400">
            {channelName && (
              <span className="flex items-center gap-1 text-dark-300">
                <Tv className="w-3.5 h-3.5 text-primary-400" />
                {channelName}
              </span>
            )}
            {category && (
              <span className="px-2 py-0.5 rounded bg-dark-800 border border-dark-700 text-dark-300">
                {category}
              </span>
            )}
            {duration ? (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {Math.round(duration / 60)} phút
              </span>
            ) : null}
            {language && (
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                {language.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description / Synopsis section */}
      <div className="rounded-lg bg-dark-950/60 p-3.5 border border-dark-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-dark-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Tóm tắt kịch bản & Nội dung
          </span>
          {description && description.length > 220 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  Thu gọn <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  Xem thêm <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>

        {description?.trim() ? (
          <p
            className={cn(
              'text-sm text-dark-300 leading-relaxed whitespace-pre-line',
              !isExpanded && description.length > 220 && 'line-clamp-4',
            )}
          >
            {description}
          </p>
        ) : (
          <div className="text-xs text-dark-400 italic py-1">
            Chương trình chưa có mô tả chi tiết từ nguồn phát. Nhấn nút{' '}
            <strong className="text-emerald-300 font-normal">
              &quot;Đọc nội dung (AI Voice)&quot;
            </strong>{' '}
            hoặc chạy{' '}
            <strong className="text-primary-300 font-normal">
              &quot;Phân tích AI&quot;
            </strong>{' '}
            để kiểm duyệt đầy đủ siêu dữ liệu và khuyến nghị khung giờ.
          </div>
        )}

        {/* Tags if available */}
        {tags && tags.length > 0 && (
          <div className="mt-3 pt-3 border-t border-dark-800/80 flex flex-wrap gap-1.5 items-center">
            <Tag className="w-3 h-3 text-dark-500 mr-1" />
            {tags.map((tag, idx) => (
              <span
                key={`${tag}-${idx}`}
                className="px-2 py-0.5 rounded-full text-[11px] bg-dark-800 text-dark-300 border border-dark-700/60"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
