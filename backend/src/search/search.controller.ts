// ============================================================
// OmniCast - Search Controller
// ============================================================

import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across channels, events, and recordings' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'type', required: false, enum: ['all', 'channels', 'programs', 'recordings'] })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['relevance', 'recent', 'popular'] })
  async search(
    @Query('q') query: string,
    @Query('type') type?: 'all' | 'channels' | 'programs' | 'recordings',
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: 'relevance' | 'recent' | 'popular',
  ) {
    return this.searchService.search({
      query,
      type,
      category,
      page: Number(page),
      limit: Number(limit),
      sortBy,
    });
  }

  @Get('channels')
  @ApiOperation({ summary: 'Quick search for channels' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchChannels(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.searchService.searchChannels(query, { limit: Number(limit) });
  }

  @Get('programs')
  @ApiOperation({ summary: 'Quick search for programs/events' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async searchPrograms(
    @Query('q') query: string,
    @Query('limit') limit?: number,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.searchService.searchPrograms(query, {
      limit: Number(limit),
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions/autocomplete' })
  @ApiQuery({ name: 'q', required: true })
  async getSuggestions(@Query('q') query: string) {
    return this.searchService.getSuggestions(query);
  }
}
