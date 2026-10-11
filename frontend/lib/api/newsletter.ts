// ============================================================
// OmniCast - Newsletter API Client
// ============================================================

import { apiClient } from '../api';

export type NewsletterTopic =
  | 'weekly_schedule'
  | 'ai_curator_picks'
  | 'studio_updates'
  | 'live_alerts'
  | 'new_releases';

export interface SubscribeNewsletterPayload {
  email: string;
  topics?: NewsletterTopic[];
  locale?: 'vi' | 'en';
  source?: string;
}

export interface SubscribeNewsletterResponse {
  success: true;
  alreadySubscribed: boolean;
  email: string;
  locale: string;
  topics: string[];
}

export async function subscribeNewsletter(
  payload: SubscribeNewsletterPayload,
): Promise<SubscribeNewsletterResponse> {
  const { data } = await apiClient.post('/newsletter/subscribe', payload);
  return (data?.data ?? data) as SubscribeNewsletterResponse;
}

export async function unsubscribeNewsletter(
  token: string,
): Promise<{ success: true; email: string }> {
  const { data } = await apiClient.post('/newsletter/unsubscribe', { token });
  return (data?.data ?? data) as { success: true; email: string };
}
