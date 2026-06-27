'use client';

import { useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';

const MANUAL_CRYPTO_PROVIDER = 'manual_crypto';

type ApiEnvelope<T> = {
  code?: number;
  message?: string;
  data?: T;
};

export function ManualCryptoReviewActions({
  orderNo,
  provider,
  status,
  canReview,
}: {
  orderNo: string;
  provider: string;
  status: string;
  canReview: boolean;
}) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState('');
  const reviewable =
    provider === MANUAL_CRYPTO_PROVIDER &&
    ['pending', 'created'].includes(status);

  if (!reviewable) return <span className="text-muted-foreground">-</span>;
  if (!canReview) {
    return (
      <span className="text-muted-foreground text-xs">
        Super admin review required
      </span>
    );
  }

  async function review(action: 'approve' | 'reject') {
    if (
      action === 'approve' &&
      !window.confirm(
        'Only approve after you have verified the exact on-chain payment reached the receiving wallet. Grant credits now?'
      )
    ) {
      return;
    }

    setLoadingAction(action);
    try {
      const response = await fetch('/api/admin/manual-crypto/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNo,
          action,
          confirmedOnChain: action === 'approve',
        }),
      });
      const payload = (await response.json()) as ApiEnvelope<{
        status: string;
      }>;

      if (!response.ok || payload.code !== 0) {
        throw new Error(payload.message || 'Review failed');
      }

      toast.success(
        action === 'approve'
          ? 'Top-up approved and credits granted'
          : 'Top-up rejected'
      );
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Review failed');
    } finally {
      setLoadingAction('');
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        onClick={() => review('approve')}
        disabled={Boolean(loadingAction)}
      >
        {loadingAction === 'approve' ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        Verified received
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => review('reject')}
        disabled={Boolean(loadingAction)}
      >
        {loadingAction === 'reject' ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <X className="size-4" />
        )}
        Reject
      </Button>
    </div>
  );
}
