// ============================================================
// OmniCast - Stream / Event Status Constants
// ============================================================

import type { EventStatus } from '@/types';

export interface StatusMeta {
  value: EventStatus;
  label: string;
  /** Tailwind classes for status pills */
  tone: { bg: string; text: string; ring: string };
  /** Is this a "live / happening now" state? */
  isLive: boolean;
  /** Is this an upcoming / scheduled state? */
  isUpcoming: boolean;
  /** Has this event already concluded? */
  isFinished: boolean;
  /** Should this event appear on the EPG grid? */
  showInEpg: boolean;
}

export const STATUS_META: Record<EventStatus, StatusMeta> = {
  SCHEDULED: {
    value: 'SCHEDULED',
    label: 'Sắp phát',
    tone: {
      bg: 'bg-sky-500/15',
      text: 'text-sky-300',
      ring: 'ring-sky-500/30',
    },
    isLive: false,
    isUpcoming: true,
    isFinished: false,
    showInEpg: true,
  },
  LIVE: {
    value: 'LIVE',
    label: 'Đang phát',
    tone: {
      bg: 'bg-red-500/20',
      text: 'text-red-300',
      ring: 'ring-red-500/40',
    },
    isLive: true,
    isUpcoming: false,
    isFinished: false,
    showInEpg: true,
  },
  ENDED: {
    value: 'ENDED',
    label: 'Đã kết thúc',
    tone: {
      bg: 'bg-dark-600/40',
      text: 'text-dark-200',
      ring: 'ring-dark-500/40',
    },
    isLive: false,
    isUpcoming: false,
    isFinished: true,
    showInEpg: true,
  },
  CANCELLED: {
    value: 'CANCELLED',
    label: 'Đã hủy',
    tone: {
      bg: 'bg-zinc-500/15',
      text: 'text-zinc-300',
      ring: 'ring-zinc-500/30',
    },
    isLive: false,
    isUpcoming: false,
    isFinished: true,
    showInEpg: false,
  },
  ON_DEMAND: {
    value: 'ON_DEMAND',
    label: 'Xem lại',
    tone: {
      bg: 'bg-purple-500/15',
      text: 'text-purple-300',
      ring: 'ring-purple-500/30',
    },
    isLive: false,
    isUpcoming: false,
    isFinished: true,
    showInEpg: false,
  },
};

export const STATUS_LIST: StatusMeta[] = (
  Object.keys(STATUS_META) as EventStatus[]
).map((key) => STATUS_META[key]);

export function getStatusLabel(value: string | null | undefined): string {
  if (!value) return 'Không xác định';
  return STATUS_META[value as EventStatus]?.label ?? value;
}

export function getStatusMeta(value: string | null | undefined): StatusMeta | null {
  if (!value) return null;
  return STATUS_META[value as EventStatus] ?? null;
}
