'use client';

import { toast } from 'sonner';

import {
  getRoleplayApiErrorMessage,
  parseRoleplayAuthRequiredPayload,
  parseRoleplayInsufficientCreditsPayload,
  RoleplayApiError,
} from '@/shared/lib/roleplay-ai';
import {
  rememberRoleplayReturnPath,
  withRoleplayCallbackUrl,
} from '@/shared/lib/roleplay-return';

function getInsufficientCreditsPayload(source: unknown) {
  if (source instanceof RoleplayApiError && source.insufficientCredits) {
    return source.insufficientCredits;
  }

  if (!source || typeof source !== 'object') return null;
  return parseRoleplayInsufficientCreditsPayload(
    (source as Record<string, unknown>).data
  );
}

function getAuthRequiredPayload(source: unknown) {
  if (source instanceof RoleplayApiError && source.authRequired) {
    return source.authRequired;
  }

  if (!source || typeof source !== 'object') return null;
  return parseRoleplayAuthRequiredPayload((source as Record<string, unknown>).data);
}

export function showRoleplayApiErrorToast(
  source: unknown,
  fallback = 'RolePlay request failed'
) {
  const insufficientCredits = getInsufficientCreditsPayload(source);
  const authRequired = getAuthRequiredPayload(source);
  const message =
    source instanceof Error
      ? source.message
      : getRoleplayApiErrorMessage(source, fallback);

  if (authRequired) {
    toast.error(message);
    rememberRoleplayReturnPath();
    window.location.href = withRoleplayCallbackUrl(
      authRequired.signInUrl || '/sign-up'
    );
    return;
  }

  if (insufficientCredits) {
    toast.error(message);
    rememberRoleplayReturnPath();
    window.location.href = withRoleplayCallbackUrl('/pricing');
    return;
  }

  toast.error(message);
}
