// ============================================================
// OmniCast - Billing & Streamer Wallet API Client
// ============================================================

import { apiClient } from '../api';

export interface StreamerPaymentInfo {
  eventId: string;
  eventTitle: string;
  channelId: string;
  channelName: string;
  channelSlug: string;
  streamerId: string;
  streamerName: string;
  streamerAvatar?: string;
  streamerBio?: string;
  bankAccount: string;
  bankName: string;
  accountHolder: string;
  momoPhone: string;
  zaloPayAccount: string;
  transferSyntax: string;
  isSandbox: boolean;
  walletBalance?: number;
}

export interface SandboxDonationPayload {
  eventId: string;
  donorName: string;
  amount: number;
  paymentMethod: string;
  giftEmoji?: string;
  giftTier?: string;
  message?: string;
}

export interface SandboxDonationResponse {
  success: boolean;
  isSandbox: boolean;
  realCostVnd: number;
  donationId: string;
  amount: number;
  paymentMethod: string;
  giftEmoji: string;
  giftTier?: string;
  donorName: string;
  message?: string;
  transferSyntax: string;
  qrPayload: string;
  streamer: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    walletBalance: number;
  };
  donor?: {
    id: string;
    fullName: string;
    walletBalance: number;
  } | null;
  notification: string;
}

export interface UserWalletData {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  role: string;
  isVip: boolean;
  walletBalance: number;
  stats: {
    totalReceivedVnd: number;
    totalSentVnd: number;
    receivedCount: number;
    sentCount: number;
  };
  receivedDonations: Array<{
    id: string;
    amount: number;
    donorName: string;
    paymentMethod: string;
    giftEmoji: string;
    giftTier?: string;
    message?: string;
    eventTitle: string;
    isSandbox: boolean;
    createdAt: string;
  }>;
  sentDonations: Array<{
    id: string;
    amount: number;
    streamerName: string;
    streamerAvatar?: string;
    paymentMethod: string;
    giftEmoji: string;
    giftTier?: string;
    message?: string;
    eventTitle: string;
    isSandbox: boolean;
    createdAt: string;
  }>;
}

export async function fetchStreamerPaymentInfo(
  eventId: string,
): Promise<StreamerPaymentInfo> {
  const { data } = await apiClient.get(`/billing/event-streamer/${eventId}`);
  return data;
}

export async function sendSandboxDonation(
  payload: SandboxDonationPayload,
): Promise<SandboxDonationResponse> {
  const { data } = await apiClient.post('/billing/live-donation/sandbox', payload);
  return data;
}

export async function fetchUserWallet(): Promise<UserWalletData> {
  const { data } = await apiClient.get('/billing/wallet');
  return data;
}

export async function topupUserWallet(
  amount: number = 100000,
): Promise<{ success: boolean; message: string; walletBalance: number }> {
  const { data } = await apiClient.post('/billing/wallet/topup-sandbox', { amount });
  return data;
}
