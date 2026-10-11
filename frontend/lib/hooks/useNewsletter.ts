// ============================================================
// OmniCast - Newsletter React Query Hooks
// ============================================================

'use client';

import { useMutation } from '@tanstack/react-query';
import {
  subscribeNewsletter,
  unsubscribeNewsletter,
  type SubscribeNewsletterPayload,
  type SubscribeNewsletterResponse,
} from '@/lib/api/newsletter';

export function useSubscribeNewsletter() {
  return useMutation<SubscribeNewsletterResponse, Error, SubscribeNewsletterPayload>({
    mutationFn: (payload) => subscribeNewsletter(payload),
  });
}

export function useUnsubscribeNewsletter() {
  return useMutation<{ success: true; email: string }, Error, string>({
    mutationFn: (token) => unsubscribeNewsletter(token),
  });
}
