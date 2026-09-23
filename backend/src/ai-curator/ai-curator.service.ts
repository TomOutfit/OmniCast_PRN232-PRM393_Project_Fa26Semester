// ============================================================
// OmniCast - AI Curator Service
// ============================================================

import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLoggerService } from '../audit-logger/audit-logger.service';
import { CurateContentDto } from './dto';
import OpenAI from 'openai';

export interface AiCuratorReport {
  broadcastSuitability: 'PRIME_TIME' | 'STANDARD' | 'RESTRICTED';
  suggestedTimeSlot: string;
  targetAudienceVibe: string;
  riskWarnings: string;
  sentimentAnalysis: {
    overallSentiment: 'positive' | 'neutral' | 'negative';
    hypeLevel: 'low' | 'medium' | 'high';
    audienceEngagement: number; // 0-100
  };
  complianceAssessment: {
    isAgeRestricted: boolean;
    ageRating: 'PG' | 'T13' | 'T16' | 'T18';
    flaggedContent: string[];
    recommendedBroadcastWindow: 'DAY' | 'EVENING' | 'LATE_NIGHT';
  };
  aiModelVersion: string;
  processingTimeMs: number;
}

@Injectable()
export class AiCuratorService {
  private openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditLogger: AuditLoggerService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY') || 'dummy-key',
    });
  }

  async curateContent(curateDto: CurateContentDto, userId: string) {
    const { programId, forceRefresh } = curateDto;

    // Fetch program details
    const program = await this.prisma.liveEvent.findUnique({
      where: { id: programId },
      include: {
        channel: { select: { id: true, name: true, category: true } },
      },
    });

    if (!program) {
      throw new BadRequestException('Program not found');
    }

    // Check for existing report (unless force refresh)
    if (!forceRefresh) {
      const existingReport = await this.prisma.auditLog.findFirst({
        where: {
          entityType: 'AI_CURATOR_REPORT',
          entityId: programId,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingReport && typeof existingReport.newValues === 'object' && existingReport.newValues !== null) {
        return {
          ...(existingReport.newValues as Record<string, any>),
          cached: true,
        };
      }
    }

    const startTime = Date.now();

    // Execute 3-agent pipeline
    const report = await this.executeCuratorPipeline(program);

    report.processingTimeMs = Date.now() - startTime;

    // Store report in audit log
    await this.auditLogger.log({
      userId,
      action: 'AI_CURATION_COMPLETE',
      entityType: 'AI_CURATOR_REPORT',
      entityId: programId,
      newValues: report,
    });

    return report;
  }

  private async executeCuratorPipeline(program: any): Promise<AiCuratorReport> {
    // Agent 1: Sentiment Analysis
    const sentiment = await this.analyzeSentiment(program);

    // Agent 2: Compliance Assessment
    const compliance = await this.assessCompliance(program);

    // Agent 3: Editorial Decision
    const editorial = await this.makeEditorialDecision(program, sentiment, compliance);

    return {
      ...sentiment,
      ...compliance,
      ...editorial,
      aiModelVersion: 'gpt-4o-omnicast-v3',
      processingTimeMs: 0,
    };
  }

  private async analyzeSentiment(program: any) {
    const prompt = `
    Analyze the sentiment and audience appeal for this broadcast program:
    
    Title: ${program.title}
    Description: ${program.description || 'No description available'}
    Channel: ${program.channel.name}
    Category: ${program.channel.category}
    
    Provide analysis for:
    1. Overall sentiment (positive/neutral/negative)
    2. Hype/buzz level (low/medium/high)
    3. Expected audience engagement score (0-100)
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          sentimentAnalysis: {
            overallSentiment: (parsed.overallSentiment || 'neutral') as 'positive' | 'neutral' | 'negative',
            hypeLevel: (parsed.hypeLevel || 'medium') as 'low' | 'medium' | 'high',
            audienceEngagement: Number(parsed.audienceEngagement) || 50,
          },
        };
      }
    } catch (error) {
      console.error('OpenAI sentiment analysis error:', error);
    }

    // Fallback
    return {
      sentimentAnalysis: {
        overallSentiment: 'neutral' as const,
        hypeLevel: 'medium' as const,
        audienceEngagement: 50,
      },
    };
  }

  private async assessCompliance(program: any) {
    const prompt = `
    Assess content compliance and age rating for broadcast:
    
    Title: ${program.title}
    Description: ${program.description || 'No description available'}
    Category: ${program.channel.category}
    
    Provide:
    1. Whether content is age-restricted (boolean)
    2. Age rating (PG/T13/T16/T18)
    3. Any flagged content types (violence, language, etc.)
    4. Recommended broadcast window (DAY/EVENING/LATE_NIGHT)
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          complianceAssessment: {
            isAgeRestricted: Boolean(parsed.isAgeRestricted),
            ageRating: (parsed.ageRating || 'PG') as 'PG' | 'T13' | 'T16' | 'T18',
            flaggedContent: Array.isArray(parsed.flaggedContent) ? parsed.flaggedContent : [],
            recommendedBroadcastWindow: (parsed.recommendedBroadcastWindow || 'EVENING') as 'DAY' | 'EVENING' | 'LATE_NIGHT',
          },
        };
      }
    } catch (error) {
      console.error('OpenAI compliance assessment error:', error);
    }

    // Fallback
    return {
      complianceAssessment: {
        isAgeRestricted: false,
        ageRating: 'PG' as const,
        flaggedContent: [],
        recommendedBroadcastWindow: 'EVENING' as const,
      },
    };
  }

  private async makeEditorialDecision(
    program: any,
    sentiment: any,
    compliance: any,
  ) {
    const prompt = `
    Make editorial broadcast decision for this program:
    
    Program: ${program.title}
    Sentiment Analysis: ${JSON.stringify(sentiment.sentimentAnalysis)}
    Compliance: ${JSON.stringify(compliance.complianceAssessment)}
    
    Decide:
    1. Broadcast suitability: PRIME_TIME (20:00-22:00) / STANDARD / RESTRICTED
    2. Exact suggested time slot (e.g., "21:00 - 23:00")
    3. Target audience vibe description
    4. Risk warnings for viewers
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          broadcastSuitability: (parsed.broadcastSuitability || 'STANDARD') as 'PRIME_TIME' | 'STANDARD' | 'RESTRICTED',
          suggestedTimeSlot: parsed.suggestedTimeSlot || '20:00 - 22:00',
          targetAudienceVibe: parsed.targetAudienceVibe || 'General audience',
          riskWarnings: parsed.riskWarnings || 'Suitable for all ages',
        };
      }
    } catch (error) {
      console.error('OpenAI editorial decision error:', error);
    }

    // Fallback
    return {
      broadcastSuitability: 'STANDARD' as const,
      suggestedTimeSlot: '20:00 - 22:00',
      targetAudienceVibe: 'General audience',
      riskWarnings: 'Suitable for all ages',
    };
  }

  async getCurationHistory(programId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        entityType: 'AI_CURATOR_REPORT',
        entityId: programId,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }
}
