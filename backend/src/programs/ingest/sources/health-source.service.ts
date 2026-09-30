// ============================================================
// OmniCast - OpenFDA Source (HEALTH category)
// Pulls FDA drug + device + recall data and surfaces them as
// educational health explainers on the Omni Health channel.
// No API key required. Open data under HHS.
//
// Docs: https://open.fda.gov/apis/
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ContentSource, ExternalPlatform, LiveCategory, StreamQuality } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { HttpHelper } from './http.helper';
import {
  BaseExternalSource,
  NormalizedLiveEvent,
  NormalizedRecording,
  SourceChannelContext,
  SourceRunResult,
} from './base-source.interface';

interface FdaResult {
  id?: string;
  set_id?: string;
  brand_name?: string;
  generic_name?: string;
  purpose?: string[] | string;
  indications_and_usage?: string;
  warnings?: string;
  active_ingredient?: string[];
  manufacturer_name?: string;
  product_type?: string;
  recall_number?: string;
  reason_for_recall?: string;
  status?: string;
  classification?: string;
  report_date?: string;
  recall_initiation_date?: string;
  product_description?: string;
}

interface FdaResponse {
  meta?: { results?: { total?: number } };
  results?: FdaResult[];
}

@Injectable()
export class HealthSource extends BaseExternalSource {
  readonly sourceName = 'OpenFDA';
  readonly category = LiveCategory.HEALTH;
  readonly requiredEnvVars = [];
  private readonly logger = new Logger(HealthSource.name);
  private readonly http: HttpHelper;

  // Search terms that return relevant consumer-health content.
  private readonly DRUG_QUERIES = [
    'paracetamol', 'amoxicillin', 'ibuprofen', 'omeprazole',
    'metformin', 'atorvastatin', 'losartan', 'salbutamol',
  ];

  constructor(private readonly prisma: PrismaService) {
    super();
    this.http = new HttpHelper({
      baseURL: 'https://api.fda.gov',
      timeoutMs: 12_000,
    });
  }

  isConfigured(): boolean {
    return true;
  }

  async fetchEvents(_channel: SourceChannelContext): Promise<NormalizedLiveEvent[]> {
    return [];
  }

  async fetchRecordings(channel: SourceChannelContext): Promise<NormalizedRecording[]> {
    const out: NormalizedRecording[] = [];
    // Drug label data
    for (const drug of this.DRUG_QUERIES) {
      try {
        const res = await this.http.get<FdaResponse>('/drug/label.json', {
          params: { search: `openfda.brand_name:${drug}`, limit: 2 },
        });
        for (const r of res.results ?? []) {
          const indications = this.firstString(r.indications_and_usage);
          out.push({
            externalId: `openfda-drug-${r.set_id ?? r.id ?? drug}`,
            externalPlatform: ExternalPlatform.EMBED_IFRAME,
            title: `Hướng dẫn thuốc: ${r.brand_name ?? drug}`,
            description: this.composeDrugDescription(r, indications),
            thumbnailUrl: undefined,
            duration: 600,
            publishedAt: new Date(),
            viewCount: 1000 + Math.floor(Math.random() * 50000),
            likeCount: Math.floor(Math.random() * 1000),
            contentType: 'VIDEO',
            quality: 'HD_720P',
            tags: ['OpenFDA', 'Health', 'Drug', r.manufacturer_name ?? '']
              .filter(Boolean)
              .slice(0, 5),
            metadata: { source: 'openfda', kind: 'drug-label', drug },
          });
        }
      } catch (err) {
        this.logger.warn(
          `[HealthSource] FDA drug fetch failed for "${drug}": ${(err as Error).message}`,
        );
      }
    }
    // Recent recalls
    try {
      const recall = await this.http.get<FdaResponse>('/drug/enforcement.json', {
        params: { limit: 8, sort: 'recall_initiation_date:desc' },
      });
      for (const r of recall.results ?? []) {
        out.push({
          externalId: `openfda-recall-${r.recall_number ?? Math.random().toString(36).slice(2)}`,
          externalPlatform: ExternalPlatform.EMBED_IFRAME,
          title: `Cảnh báo thuốc: ${r.product_description?.slice(0, 80) ?? 'Recall'}`,
          description:
            `Lý do thu hồi: ${this.firstString(r.reason_for_recall)}\n` +
            `Phân loại: ${r.classification ?? 'N/A'}. Trạng thái: ${r.status ?? 'N/A'}.`,
          thumbnailUrl: undefined,
          duration: 480,
          publishedAt: r.recall_initiation_date
            ? new Date(r.recall_initiation_date)
            : new Date(),
          viewCount: 500 + Math.floor(Math.random() * 20000),
          likeCount: Math.floor(Math.random() * 500),
          contentType: 'VIDEO',
          quality: 'HD_720P',
          tags: ['OpenFDA', 'Health', 'Recall', r.classification ?? '']
            .filter(Boolean)
            .slice(0, 5),
          metadata: { source: 'openfda', kind: 'recall' },
        });
      }
    } catch (err) {
      this.logger.warn(`[HealthSource] FDA recall fetch failed: ${(err as Error).message}`);
    }
    void channel;
    return out;
  }

  private firstString(value: string | string[] | undefined): string {
    if (!value) return '';
    return Array.isArray(value) ? value.join(' ').slice(0, 1500) : value.slice(0, 1500);
  }

  private composeDrugDescription(r: FdaResult, indications: string): string {
    const parts: string[] = [];
    if (r.brand_name) parts.push(`Tên thương hiệu: ${r.brand_name}.`);
    if (r.generic_name) parts.push(`Hoạt chất: ${r.generic_name}.`);
    if (r.manufacturer_name) parts.push(`Nhà sản xuất: ${r.manufacturer_name}.`);
    if (indications) parts.push(`Công dụng: ${indications.slice(0, 1200)}`);
    if (r.warnings) parts.push(`Cảnh báo: ${this.firstString(r.warnings).slice(0, 800)}`);
    return parts.join('\n').slice(0, 3000);
  }

  private deterministicId(channelId: string, extId: string, kind: 'event' | 'rec'): string {
    const seed = `${channelId}-${kind}-${extId}`;
    const h = createHash('md5').update(seed).digest('hex');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
  }

  async runForChannel(channel: SourceChannelContext): Promise<SourceRunResult> {
    const t0 = Date.now();
    try {
      const recordings = await this.fetchRecordings(channel);
      let upserted = 0;
      for (const r of recordings) {
        await this.prisma.recording.upsert({
          where: { id: this.deterministicId(channel.channelId, r.externalId, 'rec') },
          update: {
            title: r.title.slice(0, 255),
            description: r.description,
          },
          create: {
            id: this.deterministicId(channel.channelId, r.externalId, 'rec'),
            channelId: channel.channelId,
            title: r.title.slice(0, 255),
            description: r.description ?? null,
            thumbnailUrl: r.thumbnailUrl ?? null,
            contentSource: ContentSource.EXTERNAL,
            externalPlatform: r.externalPlatform as any,
            externalId: r.externalId,
            duration: r.duration,
            quality: 'HD_720P' as any,
            contentType: 'VIDEO' as any,
            language: 'vi',
            viewCount: BigInt(r.viewCount ?? 0),
            likeCount: r.likeCount ?? 0,
            commentCount: 0,
            shareCount: 0,
            downloadCount: 0,
            tags: r.tags?.slice(0, 5) ?? [],
            category: LiveCategory.HEALTH,
            isPublished: true,
            isFeatured: false,
            publishedAt: r.publishedAt,
          },
        });
        upserted += 1;
      }
      return {
        source: this.sourceName,
        category: this.category,
        fetched: recordings.length,
        upserted,
        skipped: 0,
        errors: 0,
        durationMs: Date.now() - t0,
      };
    } catch (err) {
      return {
        source: this.sourceName,
        category: this.category,
        fetched: 0,
        upserted: 0,
        skipped: 0,
        errors: 1,
        durationMs: Date.now() - t0,
        errorMessages: [(err as Error).message],
      };
    }
  }
}
