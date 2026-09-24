'use client';

import { useState } from 'react';
import { 
  Bot, 
  Play, 
  FileText, 
  Clock, 
  Calendar,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Send,
  Lightbulb,
  Target,
  Shield,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LiveBadge } from '@/components/ui/live-badge';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface CuratorProgram {
  id: string;
  title: string;
  description: string;
  category: string;
  channel: string;
  scheduledAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_review';
  aiReport?: {
    broadcastSuitability: 'PRIME_TIME' | 'STANDARD' | 'RESTRICTED';
    suggestedTimeSlot: string;
    riskWarnings: string | null;
    sentimentAnalysis: {
      overallSentiment: 'positive' | 'neutral' | 'negative';
      hypeLevel: 'low' | 'medium' | 'high';
      audienceEngagement: number;
    };
    complianceAssessment: {
      isAgeRestricted: boolean;
      ageRating: 'PG' | 'T13' | 'T16' | 'T18';
      flaggedContent: string[];
    };
    processingTimeMs: number;
  };
}

const mockPendingPrograms: CuratorProgram[] = [
  {
    id: '1',
    title: 'Siêu Cup Quốc gia 2026',
    description: 'Trận đấu giữa đội vô địch Premier League và FA Cup mùa trước',
    category: 'Bóng đá',
    channel: 'Omni Sport 1',
    scheduledAt: '2026-09-25T19:00:00',
    status: 'pending',
    aiReport: {
      broadcastSuitability: 'PRIME_TIME',
      suggestedTimeSlot: '19:00 - 22:00 (Tối thứ 7)',
      riskWarnings: null,
      sentimentAnalysis: {
        overallSentiment: 'positive',
        hypeLevel: 'high',
        audienceEngagement: 95,
      },
      complianceAssessment: {
        isAgeRestricted: false,
        ageRating: 'PG',
        flaggedContent: [],
      },
      processingTimeMs: 234,
    },
  },
  {
    id: '2',
    title: 'Phim T16: The Dark Knight',
    description: 'Phim siêu anh hùng với các cảnh bạo lực nhẹ',
    category: 'Phim hành động',
    channel: 'Omni Cine',
    scheduledAt: '2026-09-25T21:00:00',
    status: 'needs_review',
    aiReport: {
      broadcastSuitability: 'STANDARD',
      suggestedTimeSlot: '21:00 - 23:30 (Đêm)',
      riskWarnings: 'Có cảnh bạo lực - phù hợp T16+',
      sentimentAnalysis: {
        overallSentiment: 'positive',
        hypeLevel: 'medium',
        audienceEngagement: 82,
      },
      complianceAssessment: {
        isAgeRestricted: true,
        ageRating: 'T16',
        flaggedContent: ['Bạo lực nhẹ', 'Hành động'],
      },
      processingTimeMs: 189,
    },
  },
  {
    id: '3',
    title: 'Gala âm nhạc cuối năm',
    description: 'Chương trình ca nhạc đặc biệt với các nghệ sĩ nổi tiếng',
    category: 'Ca nhạc',
    channel: 'Omni Show',
    scheduledAt: '2026-09-26T20:00:00',
    status: 'pending',
  },
  {
    id: '4',
    title: 'Cuộc đua kỳ thú',
    description: 'Game show phiêu lưu với các thử thách đặc biệt',
    category: 'Game show',
    channel: 'Omni Entertain',
    scheduledAt: '2026-09-27T18:00:00',
    status: 'approved',
  },
];

export default function CuratorStudioPage() {
  const [programs, setPrograms] = useState(mockPendingPrograms);
  const [selectedProgram, setSelectedProgram] = useState<CuratorProgram | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<string>('');

  const handleAnalyze = async (program: CuratorProgram) => {
    setIsAnalyzing(true);
    setSelectedProgram(program);
    
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setAnalyzeResult('AI analysis completed. Review the report below.');
    setIsAnalyzing(false);
  };

  const handleApprove = (programId: string) => {
    setPrograms(programs.map(p => 
      p.id === programId ? { ...p, status: 'approved' as const } : p
    ));
  };

  const handleReject = (programId: string) => {
    setPrograms(programs.map(p => 
      p.id === programId ? { ...p, status: 'rejected' as const } : p
    ));
  };

  const pendingCount = programs.filter(p => p.status === 'pending' || p.status === 'needs_review').length;

  return (
    <div className="min-h-[80vh]">
      {/* Page Header */}
      <div className="bg-dark-900 border-b border-dark-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-cyan flex items-center justify-center">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">AI Curator Studio</h1>
                <p className="text-dark-400">Đánh giá và phê duyệt nội dung với AI</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{pendingCount}</p>
                <p className="text-sm text-dark-400">Chờ duyệt</p>
              </div>
              <Button className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Làm mới
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Program List */}
          <Card className="glass-card">
            <div className="p-4 border-b border-dark-700">
              <h2 className="font-bold text-white">Danh sách chương trình</h2>
            </div>
            <div className="divide-y divide-dark-700 max-h-[600px] overflow-y-auto">
              {programs.map((program) => (
                <div
                  key={program.id}
                  onClick={() => setSelectedProgram(program)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedProgram?.id === program.id 
                      ? 'bg-primary-500/10 border-l-2 border-primary-500' 
                      : 'hover:bg-dark-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">{program.title}</h3>
                      <p className="text-sm text-dark-400 truncate">{program.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-dark-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(program.scheduledAt), 'HH:mm')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(program.scheduledAt), 'dd/MM')}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        program.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        program.status === 'needs_review' ? 'bg-orange-500/20 text-orange-400' :
                        program.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {program.status === 'pending' ? 'Chờ duyệt' :
                         program.status === 'needs_review' ? 'Cần xem xét' :
                         program.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                      </span>
                      {!program.aiReport && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAnalyze(program);
                          }}
                          disabled={isAnalyzing}
                          className="gap-1"
                        >
                          <Bot className="w-3 h-3" />
                          Phân tích
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* AI Report Panel */}
          <Card className="glass-card">
            <div className="p-4 border-b border-dark-700">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-accent-gold" />
                AI Analysis Report
              </h2>
            </div>
            <div className="p-6">
              {selectedProgram ? (
                <div className="space-y-6">
                  {/* Program Info */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {selectedProgram.title}
                    </h3>
                    <p className="text-dark-400 text-sm mb-3">{selectedProgram.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="px-2 py-1 rounded bg-dark-700 text-dark-300">
                        {selectedProgram.category}
                      </span>
                      <span className="text-dark-400">{selectedProgram.channel}</span>
                    </div>
                  </div>

                  {/* AI Report */}
                  {selectedProgram.aiReport ? (
                    <div className="space-y-4">
                      {/* Broadcast Suitability */}
                      <div className="p-4 rounded-lg bg-dark-900/50 border border-dark-700">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-dark-400">Khả năng phát sóng</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                            selectedProgram.aiReport.broadcastSuitability === 'PRIME_TIME' 
                              ? 'bg-accent-gold/20 text-accent-gold' :
                              selectedProgram.aiReport.broadcastSuitability === 'STANDARD'
                                ? 'bg-primary-500/20 text-primary-400'
                                : 'bg-red-500/20 text-red-400'
                          }`}>
                            {selectedProgram.aiReport.broadcastSuitability === 'PRIME_TIME' ? '★ Giờ vàng' :
                             selectedProgram.aiReport.broadcastSuitability === 'STANDARD' ? '◆ Phát thường' : '⚠ Hạn chế'}
                          </span>
                        </div>
                        <p className="text-sm text-white">
                          <Target className="w-4 h-4 inline mr-2 text-primary-400" />
                          Khung giờ đề xuất: {selectedProgram.aiReport.suggestedTimeSlot}
                        </p>
                      </div>

                      {/* Sentiment Analysis */}
                      <div className="p-4 rounded-lg bg-dark-900/50 border border-dark-700">
                        <h4 className="text-sm font-medium text-dark-400 mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Phân tích tình cảm
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-2 rounded bg-dark-800">
                            <p className={`text-sm font-medium ${
                              selectedProgram.aiReport.sentimentAnalysis.overallSentiment === 'positive' ? 'text-green-400' :
                              selectedProgram.aiReport.sentimentAnalysis.overallSentiment === 'neutral' ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                              {selectedProgram.aiReport.sentimentAnalysis.overallSentiment === 'positive' ? 'Tích cực' :
                               selectedProgram.aiReport.sentimentAnalysis.overallSentiment === 'neutral' ? 'Trung lập' : 'Tiêu cực'}
                            </p>
                            <p className="text-xs text-dark-500">Cảm xúc</p>
                          </div>
                          <div className="text-center p-2 rounded bg-dark-800">
                            <p className="text-sm font-medium text-white capitalize">
                              {selectedProgram.aiReport.sentimentAnalysis.hypeLevel}
                            </p>
                            <p className="text-xs text-dark-500">Mức độ hype</p>
                          </div>
                          <div className="text-center p-2 rounded bg-dark-800">
                            <p className="text-sm font-medium text-white">
                              {selectedProgram.aiReport.sentimentAnalysis.audienceEngagement}%
                            </p>
                            <p className="text-xs text-dark-500">Tương tác</p>
                          </div>
                        </div>
                      </div>

                      {/* Compliance */}
                      <div className="p-4 rounded-lg bg-dark-900/50 border border-dark-700">
                        <h4 className="text-sm font-medium text-dark-400 mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Đánh giá tuân thủ
                        </h4>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-1 rounded text-sm ${
                            selectedProgram.aiReport.complianceAssessment.isAgeRestricted
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {selectedProgram.aiReport.complianceAssessment.ageRating}
                          </span>
                          {selectedProgram.aiReport.complianceAssessment.flaggedContent.map((flag, i) => (
                            <span key={i} className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-sm">
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Risk Warning */}
                      {selectedProgram.aiReport.riskWarnings && (
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                            <div>
                              <p className="font-medium text-red-400">Cảnh báo</p>
                              <p className="text-sm text-dark-300">{selectedProgram.aiReport.riskWarnings}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      {selectedProgram.status !== 'approved' && selectedProgram.status !== 'rejected' && (
                        <div className="flex gap-3 pt-4 border-t border-dark-700">
                          <Button
                            onClick={() => handleApprove(selectedProgram.id)}
                            className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Phê duyệt
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleReject(selectedProgram.id)}
                            className="flex-1 gap-2 text-red-400 border-red-500/50 hover:bg-red-500/10"
                          >
                            <XCircle className="w-4 h-4" />
                            Từ chối
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      {isAnalyzing ? (
                        <div className="space-y-4">
                          <Loader2 className="w-12 h-12 mx-auto text-primary-400 animate-spin" />
                          <p className="text-dark-400">AI đang phân tích...</p>
                        </div>
                      ) : (
                        <>
                          <Bot className="w-12 h-12 mx-auto text-dark-600 mb-4" />
                          <p className="text-dark-400 mb-4">Chọn chương trình để xem báo cáo AI</p>
                          <Button
                            onClick={() => handleAnalyze(selectedProgram)}
                            className="gap-2"
                          >
                            <Bot className="w-4 h-4" />
                            Phân tích với AI
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-dark-600 mb-4" />
                  <p className="text-dark-400">Chọn một chương trình để xem chi tiết</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
