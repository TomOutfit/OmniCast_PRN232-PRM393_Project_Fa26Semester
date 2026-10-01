// ============================================================
// OmniCast - Search Controller
// ============================================================

import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
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
  @ApiResponse({ status: 200, description: '200 OK — Global search results' })
  @ApiResponse({ status: 400, description: '400 Bad Request — Missing query parameter' })
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
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      sortBy,
    });
  }

  @Get('channels')
  @ApiOperation({ summary: 'Quick search for channels' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '200 OK — Filtered channels matching query' })
  @ApiResponse({ status: 400, description: '400 Bad Request' })
  async searchChannels(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.searchService.searchChannels(query, { limit: Number(limit) || 10 });
  }

  @Get('programs')
  @ApiOperation({ summary: 'Quick search for programs/events' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiResponse({ status: 200, description: '200 OK — Filtered programs matching query' })
  @ApiResponse({ status: 400, description: '400 Bad Request' })
  async searchPrograms(
    @Query('q') query: string,
    @Query('limit') limit?: number,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.searchService.searchPrograms(query, {
      limit: Number(limit) || 20,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions/autocomplete' })
  @ApiQuery({ name: 'q', required: true })
  @ApiResponse({ status: 200, description: '200 OK — Autocomplete search suggestions' })
  @ApiResponse({ status: 400, description: '400 Bad Request' })
  async getSuggestions(@Query('q') query: string) {
    return this.searchService.getSuggestions(query);
  }
}
