'use client';

import { toast } from 'sonner';

import {
  getRoleplayApiErrorMessage,
  parseRoleplayInsufficientCreditsPayload,
  RoleplayApiError,
} from '@/shared/lib/roleplay-ai';

function getInsufficientCreditsPayload(source: unknown) {
  if (source instanceof RoleplayApiError && source.insufficientCredits) {
    return source.insufficientCredits;
  }

  if (!source || typeof source !== 'object') return null;
  return parseRoleplayInsufficientCreditsPayload(
    (source as Record<string, unknown>).data
  );
}

function getPricingActionLabel() {
  if (typeof navigator !== 'undefined') {
    const language = navigator.language.toLowerCase();
    if (language.startsWith('zh')) return '查看套餐';
  }

  return 'View plans';
}

export function showRoleplayApiErrorToast(
  source: unknown,
  fallback = 'RolePlay request failed'
) {
  const insufficientCredits = getInsufficientCreditsPayload(source);
  const message =
    source instanceof Error
      ? source.message
      : getRoleplayApiErrorMessage(source, fallback);

  toast.error(
    message,
    insufficientCredits
      ? {
          action: {
            label: getPricingActionLabel(),
            onClick: () => {
              window.location.href = '/pricing';
            },
          },
        }
      : undefined
  );
}
