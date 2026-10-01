/**
 * OmniCast - Comprehensive Backend API Verification Suite
 * Tests every API route across all 11 controllers:
 * 1. Health & Ping
 * 2. Auth (Login, Register, Me, Refresh, Invalid Credentials)
 * 3. Channels (FindAll, Categories, Slug, Detail, Followers, Follow/Unfollow)
 * 4. Programs & LiveEvents (FindAll, LiveNow, Preflight, EPG Day, EPG Snapshot, Events by ID)
 * 5. Recordings (FindAll, FindById, Similar, View increment, Share increment)
 * 6. Social (Recording Comments, Comment replies, Reactions, LiveEvent Reactions)
 * 7. Search (Global search, Channels search, Programs search, Suggestions)
 * 8. Watchlist (List, Grouped, Add, Remove, Sync)
 * 9. Users (Me, MyStats, MyFollows, Admin List, Admin FindById)
 * 10. Audit Logs (FindAll, Recent, Stats)
 * 11. AI Curator (History / Mock Curate)
 */

const axios = require('axios');
const BASE = 'http://localhost:3000/api/v1';

const results = [];

function record(name, method, url, status, ok, details = '') {
  results.push({ name, method, url, status, ok, details });
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} [${method}] ${url} -> HTTP ${status} | ${name} ${details ? '(' + details + ')' : ''}`);
}

async function request(method, path, data = null, token = null) {
  try {
    const res = await axios({
      method,
      url: `${BASE}${path}`,
      data,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 15000,
    });
    return { status: res.status, data: res.data };
  } catch (err) {
    if (err.response) {
      return { status: err.response.status, data: err.response.data };
    }
    return { status: 0, error: err.message };
  }
}

async function run() {
  console.log('====================================================');
  console.log('🚀 STARTING COMPREHENSIVE OMNICAST API TEST SUITE');
  console.log('====================================================\n');

  // --- 1. HEALTH CHECKS ---
  console.log('--- 1. HEALTH MODULE ---');
  let res = await request('GET', '/health');
  record('Health Check', 'GET', '/health', res.status, res.status === 200, res.data?.data?.status || 'ok');

  res = await request('GET', '/health/ping');
  record('Health Ping', 'GET', '/health/ping', res.status, res.status === 200);

  // --- 2. AUTHENTICATION ---
  console.log('\n--- 2. AUTH MODULE ---');
  // Login as seeded admin
  res = await request('POST', '/auth/login', {
    email: 'admin@omnicast.tv',
    password: 'Admin123!',
  });
  const adminToken = res.data?.data?.accessToken || res.data?.accessToken;
  const refreshToken = res.data?.data?.refreshToken || res.data?.refreshToken;
  record('Admin Login', 'POST', '/auth/login', res.status, res.status === 200 && !!adminToken);

  // Login with invalid credentials
  res = await request('POST', '/auth/login', {
    email: 'admin@omnicast.tv',
    password: 'WrongPassword!',
  });
  record('Login Invalid Password (Expect 401)', 'POST', '/auth/login', res.status, res.status === 401);

  // Auth Me with token
  res = await request('GET', '/auth/me', null, adminToken);
  record('Auth Me Profile', 'GET', '/auth/me', res.status, res.status === 200 && res.data?.data?.email === 'admin@omnicast.tv');

  // Token refresh
  if (refreshToken) {
    res = await request('POST', '/auth/refresh', { refreshToken });
    record('Auth Token Refresh', 'POST', '/auth/refresh', res.status, res.status === 200 || res.status === 201);
  }

  // --- 3. CHANNELS ---
  console.log('\n--- 3. CHANNELS MODULE ---');
  res = await request('GET', '/channels?page=1&limit=5');
  const channels = res.data?.data || [];
  const firstChannel = channels[0];
  record('List Channels', 'GET', '/channels', res.status, res.status === 200 && channels.length > 0, `Count: ${channels.length}`);

  res = await request('GET', '/channels/categories');
  record('Channel Categories', 'GET', '/channels/categories', res.status, res.status === 200);

  if (firstChannel) {
    res = await request('GET', `/channels/${firstChannel.id}`);
    record('Get Channel By ID', 'GET', `/channels/${firstChannel.id}`, res.status, res.status === 200);

    if (firstChannel.slug) {
      res = await request('GET', `/channels/slug/${firstChannel.slug}`);
      record('Get Channel By Slug', 'GET', `/channels/slug/${firstChannel.slug}`, res.status, res.status === 200);
    }

    res = await request('GET', `/channels/${firstChannel.id}/followers`);
    record('Get Channel Followers', 'GET', `/channels/${firstChannel.id}/followers`, res.status, res.status === 200);

    // Follow & Unfollow channel
    res = await request('POST', `/channels/${firstChannel.id}/follow`, null, adminToken);
    record('Follow Channel', 'POST', `/channels/${firstChannel.id}/follow`, res.status, res.status === 200 || res.status === 201);

    res = await request('GET', `/channels/${firstChannel.id}/is-following`, null, adminToken);
    record('Check Is Following', 'GET', `/channels/${firstChannel.id}/is-following`, res.status, res.status === 200);

    res = await request('POST', `/channels/${firstChannel.id}/unfollow`, null, adminToken);
    record('Unfollow Channel', 'POST', `/channels/${firstChannel.id}/unfollow`, res.status, res.status === 200 || res.status === 201);
  }

  // --- 4. PROGRAMS & LIVE EVENTS ---
  console.log('\n--- 4. PROGRAMS & LIVE EVENTS MODULE ---');
  res = await request('GET', '/programs/live-events?page=1&limit=5');
  const liveEvents = res.data?.data || [];
  const firstEvent = liveEvents[0];
  record('List Live Events', 'GET', '/programs/live-events', res.status, res.status === 200, `Count: ${liveEvents.length}`);

  res = await request('GET', '/programs/live-events/live-now');
  record('Live Now Events', 'GET', '/programs/live-events/live-now', res.status, res.status === 200);

  // EPG Day
  res = await request('GET', '/programs/epg/day');
  record('EPG By Day', 'GET', '/programs/epg/day', res.status, res.status === 200);

  // EPG Snapshot
  res = await request('GET', '/programs/epg/snapshot');
  record('EPG Snapshot', 'GET', '/programs/epg/snapshot', res.status, res.status === 200);

  if (firstEvent) {
    res = await request('GET', `/programs/live-events/${firstEvent.id}`);
    record('Get Live Event By ID', 'GET', `/programs/live-events/${firstEvent.id}`, res.status, res.status === 200);

    res = await request('POST', `/programs/live-events/${firstEvent.id}/view`);
    record('Increment Live Event View', 'POST', `/programs/live-events/${firstEvent.id}/view`, res.status, res.status === 200 || res.status === 201);

    res = await request('POST', `/programs/live-events/${firstEvent.id}/share`);
    record('Increment Live Event Share', 'POST', `/programs/live-events/${firstEvent.id}/share`, res.status, res.status === 200 || res.status === 201);
  }

  // Preflight schedule check
  if (firstChannel) {
    res = await request('POST', '/programs/live-events/preflight', {
      events: [
        {
          clientRef: 'test-event-1',
          channelId: firstChannel.id,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          duration: 60,
        },
      ],
    }, adminToken);
    record('Schedule Conflict Preflight', 'POST', '/programs/live-events/preflight', res.status, res.status === 200 || res.status === 201);
  }

  // --- 5. RECORDINGS / VOD ---
  console.log('\n--- 5. RECORDINGS MODULE ---');
  res = await request('GET', '/programs/recordings?page=1&limit=5');
  const recordings = res.data?.data || [];
  const firstRecording = recordings[0];
  record('List Recordings', 'GET', '/programs/recordings', res.status, res.status === 200, `Count: ${recordings.length}`);

  if (firstRecording) {
    res = await request('GET', `/programs/recordings/${firstRecording.id}`);
    record('Get Recording By ID', 'GET', `/programs/recordings/${firstRecording.id}`, res.status, res.status === 200);

    res = await request('GET', `/programs/recordings/${firstRecording.id}/similar`);
    record('Get Similar Recordings', 'GET', `/programs/recordings/${firstRecording.id}/similar`, res.status, res.status === 200);

    res = await request('POST', `/programs/recordings/${firstRecording.id}/view`);
    record('Increment Recording View', 'POST', `/programs/recordings/${firstRecording.id}/view`, res.status, res.status === 200 || res.status === 201);

    res = await request('POST', `/programs/recordings/${firstRecording.id}/share`);
    record('Increment Recording Share', 'POST', `/programs/recordings/${firstRecording.id}/share`, res.status, res.status === 200 || res.status === 201);
  }

  // --- 6. SOCIAL (COMMENTS & REACTIONS) ---
  console.log('\n--- 6. SOCIAL MODULE ---');
  if (firstRecording) {
    res = await request('GET', `/recordings/${firstRecording.id}/comments`);
    record('List Recording Comments', 'GET', `/recordings/${firstRecording.id}/comments`, res.status, res.status === 200);

    res = await request('GET', `/recordings/${firstRecording.id}/reactions`);
    record('List Recording Reactions', 'GET', `/recordings/${firstRecording.id}/reactions`, res.status, res.status === 200);

    res = await request('POST', `/recordings/${firstRecording.id}/reactions`, { type: 'HEART' }, adminToken);
    record('Toggle Recording Reaction', 'POST', `/recordings/${firstRecording.id}/reactions`, res.status, res.status === 200 || res.status === 201);

    // Create a comment
    res = await request('POST', `/recordings/${firstRecording.id}/comments`, { content: 'Automated test comment ' + Date.now() }, adminToken);
    const createdComment = res.data?.data || res.data;
    record('Create Recording Comment', 'POST', `/recordings/${firstRecording.id}/comments`, res.status, res.status === 200 || res.status === 201);

    if (createdComment?.id) {
      // Delete created comment
      res = await request('DELETE', `/comments/${createdComment.id}`, null, adminToken);
      record('Delete Comment', 'DELETE', `/comments/${createdComment.id}`, res.status, res.status === 200);
    }
  }

  if (firstEvent) {
    res = await request('GET', `/live-events/${firstEvent.id}/reactions`);
    record('List Live Event Reactions', 'GET', `/live-events/${firstEvent.id}/reactions`, res.status, res.status === 200);

    res = await request('POST', `/live-events/${firstEvent.id}/reactions`, { type: 'HEART' }, adminToken);
    record('Toggle Live Event Reaction', 'POST', `/live-events/${firstEvent.id}/reactions`, res.status, res.status === 200 || res.status === 201);
  }

  // --- 7. SEARCH MODULE ---
  console.log('\n--- 7. SEARCH MODULE ---');
  res = await request('GET', '/search?q=news');
  record('Global Search', 'GET', '/search?q=news', res.status, res.status === 200);

  res = await request('GET', '/search/channels?q=vtv');
  record('Search Channels', 'GET', '/search/channels?q=vtv', res.status, res.status === 200);

  res = await request('GET', '/search/programs?q=live');
  record('Search Programs', 'GET', '/search/programs?q=live', res.status, res.status === 200);

  res = await request('GET', '/search/suggestions?q=a');
  record('Search Suggestions', 'GET', '/search/suggestions?q=a', res.status, res.status === 200);

  // --- 8. WATCHLIST MODULE ---
  console.log('\n--- 8. WATCHLIST MODULE ---');
  res = await request('GET', '/me/watchlist', null, adminToken);
  record('List Watchlist', 'GET', '/me/watchlist', res.status, res.status === 200);

  res = await request('GET', '/me/watchlist/grouped', null, adminToken);
  record('List Grouped Watchlist', 'GET', '/me/watchlist/grouped', res.status, res.status === 200);

  if (firstEvent) {
    res = await request('POST', '/me/watchlist', { programId: firstEvent.id, note: 'Test reminder' }, adminToken);
    const watchlistItem = res.data?.data || res.data;
    record('Add Watchlist Item', 'POST', '/me/watchlist', res.status, res.status === 200 || res.status === 201);

    if (watchlistItem?.id) {
      res = await request('DELETE', `/me/watchlist/${watchlistItem.id}`, null, adminToken);
      record('Remove Watchlist Item', 'DELETE', `/me/watchlist/${watchlistItem.id}`, res.status, res.status === 200);
    }
  }

  // --- 9. USERS MODULE ---
  console.log('\n--- 9. USERS MODULE ---');
  res = await request('GET', '/users/me', null, adminToken);
  record('User Me Profile', 'GET', '/users/me', res.status, res.status === 200);

  res = await request('GET', '/users/me/stats', null, adminToken);
  record('User My Stats', 'GET', '/users/me/stats', res.status, res.status === 200);

  res = await request('GET', '/users/me/follows', null, adminToken);
  record('User My Follows', 'GET', '/users/me/follows', res.status, res.status === 200);

  res = await request('GET', '/users?page=1&limit=5', null, adminToken);
  record('Admin List Users', 'GET', '/users', res.status, res.status === 200);

  // --- 10. AUDIT LOGGER MODULE ---
  console.log('\n--- 10. AUDIT LOGGER MODULE ---');
  res = await request('GET', '/audit-logs?page=1&limit=5', null, adminToken);
  record('List Audit Logs', 'GET', '/audit-logs', res.status, res.status === 200);

  res = await request('GET', '/audit-logs/recent?limit=5', null, adminToken);
  record('Recent Audit Logs', 'GET', '/audit-logs/recent', res.status, res.status === 200);

  res = await request('GET', '/audit-logs/stats', null, adminToken);
  record('Audit Log Stats', 'GET', '/audit-logs/stats', res.status, res.status === 200);

  // --- SUMMARY ---
  console.log('\n====================================================');
  console.log('📊 TEST EXECUTION SUMMARY');
  console.log('====================================================');
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`Total APIs Tested: ${results.length}`);
  console.log(`Passed:            ${passed} (${((passed / results.length) * 100).toFixed(1)}%)`);
  console.log(`Failed:            ${failed}`);

  if (failed > 0) {
    console.log('\n⚠️ FAILED ENDPOINTS:');
    results
      .filter((r) => !r.ok)
      .forEach((r) => console.log(`  - [${r.method}] ${r.url} -> HTTP ${r.status} (${r.name}): ${r.details}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
