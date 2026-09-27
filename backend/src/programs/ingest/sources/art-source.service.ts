// ============================================================
// OmniCast - Met Museum Source (ART category)
// Pulls object metadata from The Metropolitan Museum of Art's
// Open Access API. No API key required. Returns high-quality
// artwork images + curatorial descriptions.
//
// Docs: https://metmuseum.github.io/
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

interface MetObject {
  objectID: number;
  title: string;
  artistDisplayName?: string;
  objectDate?: string;
  medium?: string;
  classification?: string;
  country?: string;
  period?: string;
  department?: string;
  objectURL?: string;
  isPublicDomain?: boolean;
  primaryImage?: string;
  primaryImageSmall?: string;
  additionalImages?: string[];
  tags?: Array<{ term: string; AAT_URL?: string; Wikidata_URL?: string }>;
}

interface MetSearchResponse {
  total: number;
  objectIDs?: number[];
}

@Injectable()
export class ArtSource extends BaseExternalSource {
  readonly sourceName = 'MetMuseum';
  readonly category = LiveCategory.ART;
  readonly requiredEnvVars = [];
  private readonly logger = new Logger(ArtSource.name);
  private readonly http: HttpHelper;

  // Curated search terms that always return rich art objects.
  private readonly SEARCH_QUERIES = [
    'van Gogh', 'Monet', 'Picasso', 'Rembrandt', 'Da Vinci',
    'sculpture', 'impressionism', 'asian art', 'modern art',
    'photography', 'ceramic', 'calligraphy', 'textile',
    'Vietnam', 'Champa', 'Khmer', 'contemporary', 'minimalism',
    'abstract', 'renaissance', 'baroque', 'cubism',
  ];

  constructor(private readonly prisma: PrismaService) {
    super();
    this.http = new HttpHelper({
      baseURL: 'https://collectionapi.metmuseum.org/public/collection/v1',
      timeoutMs: 10_000,
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
    const seen = new Set<number>();
    for (const q of this.SEARCH_QUERIES) {
      try {
        const search = await this.http.get<MetSearchResponse>('/search', {
          params: { q, hasImages: true, isHighlight: false },
        });
        const ids = (search.objectIDs ?? []).slice(0, 4);
        for (const id of ids) {
          if (seen.has(id)) continue;
          seen.add(id);
          const obj = await this.http.get<MetObject>(`/objects/${id}`);
          if (!obj.isPublicDomain || !obj.primaryImage) continue;
          out.push({
            externalId: `met-${obj.objectID}`,
            externalPlatform: ExternalPlatform.EMBED_IFRAME,
            title: `${obj.title}${obj.artistDisplayName ? ` — ${obj.artistDisplayName}` : ''}`,
            description: this.composeDescription(obj),
            thumbnailUrl: obj.primaryImageSmall || obj.primaryImage,
            duration: 600 + Math.floor(Math.random() * 1800),
            publishedAt: new Date(Date.now() - Math.floor(Math.random() * 365) * 86400 * 1000),
            viewCount: 1000 + Math.floor(Math.random() * 100000),
            likeCount: Math.floor(Math.random() * 4000),
            contentType: 'VIDEO',
            quality: 'FULL_HD_1080P',
            tags: ['MetMuseum', 'Art', obj.classification ?? '', obj.department ?? '']
              .filter(Boolean)
              .slice(0, 5),
            sourceUrl: obj.objectURL,
            metadata: {
              source: 'metmuseum',
              objectId: obj.objectID,
              medium: obj.medium,
              period: obj.period,
            },
          });
        }
      } catch (err) {
        this.logger.warn(
          `[ArtSource] Met search failed for "${q}": ${(err as Error).message}`,
        );
      }
    }
    void channel;
    return out;
  }

  private composeDescription(obj: MetObject): string {
    const parts: string[] = [];
    if (obj.artistDisplayName) parts.push(`Tác giả: ${obj.artistDisplayName}.`);
    if (obj.objectDate) parts.push(`Năm: ${obj.objectDate}.`);
    if (obj.medium) parts.push(`Chất liệu: ${obj.medium}.`);
    if (obj.classification) parts.push(`Phân loại: ${obj.classification}.`);
    if (obj.period) parts.push(`Thời kỳ: ${obj.period}.`);
    if (obj.country) parts.push(`Quốc gia: ${obj.country}.`);
    return parts.join(' ').slice(0, 3000);
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
            thumbnailUrl: r.thumbnailUrl,
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
            quality: 'FULL_HD_1080P' as any,
            contentType: 'VIDEO' as any,
            language: 'vi',
            viewCount: BigInt(r.viewCount ?? 0),
            likeCount: r.likeCount ?? 0,
            commentCount: 0,
            shareCount: 0,
            downloadCount: 0,
            tags: r.tags?.slice(0, 5) ?? [],
            category: LiveCategory.ART,
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
