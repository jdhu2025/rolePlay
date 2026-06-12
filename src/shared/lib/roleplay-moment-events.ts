'use client';

import { FIRST_EXPERIENCE_EVENT_TYPES } from '@/shared/lib/roleplay-first-experience';

export type RoleplayMomentEventType =
  | 'first_impression_selected'
  | 'continuation_hint_shown'
  | 'wrap_up_clicked'
  | 'local_fallback_shown'
  | 'keepsake_voice_clicked'
  | (typeof FIRST_EXPERIENCE_EVENT_TYPES)[number];

type RoleplayMomentEventPayload = {
  eventType: RoleplayMomentEventType;
  characterId?: string;
  conversationId?: string;
  value?: number;
  metadata?: Record<string, unknown>;
};

export function recordRoleplayMomentEvent(payload: RoleplayMomentEventPayload) {
  if (typeof window === 'undefined') return;

  const body = JSON.stringify({
    ...payload,
    metadata: {
      path: window.location.pathname,
      locale: document.documentElement.lang || undefined,
      ...(payload.metadata || {}),
    },
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon('/api/roleplay/moment-event', blob)) return;
    }
  } catch {
    // Fall through to fetch. Moment events should never interrupt the user.
  }

  fetch('/api/roleplay/moment-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    credentials: 'include',
    keepalive: true,
  }).catch(() => {});
}
