'use client';

import { useState } from 'react';
import { Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
export type ManualCryptoTopupPlanView = {
  id: string;
  title: string;
  amountUsd: number;
  credits: number;
  bonusCredits?: number;
  validDays: number;
};

export type ManualCryptoWalletOptionView = {
  id: string;
  label: string;
  network: string;
  asset: string;
  walletAddress: string;
  qrImageUrl?: string;
};

type ApiEnvelope<T> = {
  code?: number;
  message?: string;
  data?: T;
};

export function ManualCryptoTopupForm({
  plans,
  walletOptions,
}: {
  plans: ManualCryptoTopupPlanView[];
  walletOptions: ManualCryptoWalletOptionView[];
}) {
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || '');
  const [selectedWalletId, setSelectedWalletId] = useState(
    walletOptions[0]?.id || ''
  );
  const [txHash, setTxHash] = useState('');
  const [payerNote, setPayerNote] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  const selectedWallet =
    walletOptions.find((wallet) => wallet.id === selectedWalletId) ??
    walletOptions[0];

  async function copyWalletAddress() {
    if (!selectedWallet?.walletAddress) return;
    await navigator.clipboard.writeText(selectedWallet.walletAddress);
    toast.success('Wallet address copied');
  }

  async function submitTopup() {
    if (!selectedPlan) {
      toast.error('Choose a top-up plan');
      return;
    }
    if (!txHash.trim()) {
      toast.error('Enter your transaction hash');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/manual-crypto/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          walletOptionId: selectedWallet?.id || '',
          txHash,
          payerNote,
        }),
      });
      const payload = (await response.json()) as ApiEnvelope<{
        orderNo: string;
      }>;

      if (!response.ok || payload.code !== 0) {
        throw new Error(payload.message || 'Top-up submission failed');
      }

      toast.success(`Top-up submitted: ${payload.data?.orderNo}`);
      setTxHash('');
      setPayerNote('');
    } catch (error: any) {
      toast.error(error.message || 'Top-up submission failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {plans.map((plan) => {
          const active = plan.id === selectedPlanId;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlanId(plan.id)}
              className={`rounded-lg border p-4 text-left transition ${
                active
                  ? 'border-primary bg-primary/5 ring-primary/20 ring-2'
                  : 'hover:bg-muted/50'
              }`}
            >
              <div className="font-semibold">{plan.title}</div>
              <div className="text-primary mt-2 text-2xl font-bold">
                ${plan.amountUsd}
              </div>
              <div className="text-muted-foreground mt-1 text-sm">
                {getPlanCredits(plan)} credits
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-muted/40 space-y-4 rounded-lg border p-4">
        {walletOptions.length > 1 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {walletOptions.map((wallet) => (
              <button
                key={wallet.id}
                type="button"
                onClick={() => setSelectedWalletId(wallet.id)}
                data-active={wallet.id === selectedWallet?.id}
                className="rounded-md border p-3 text-left text-sm transition hover:bg-background data-[active=true]:border-primary data-[active=true]:bg-primary/5"
              >
                <div className="font-semibold">{wallet.label}</div>
                <div className="text-muted-foreground mt-1">
                  {wallet.asset} on {wallet.network}
                </div>
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-muted-foreground text-xs uppercase">
                  Network
                </div>
                <div className="font-medium">{selectedWallet?.network}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase">
                  Asset
                </div>
                <div className="font-medium">{selectedWallet?.asset}</div>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase">
                Wallet address
              </div>
              <div className="mt-1 flex items-center gap-2">
                <code className="bg-background min-w-0 flex-1 truncate rounded border px-2 py-1 text-xs">
                  {selectedWallet?.walletAddress}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyWalletAddress}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              <p className="text-muted-foreground mt-2 text-sm">
                Only send {selectedWallet?.asset} on {selectedWallet?.network}.
                Payments sent on other networks may not be credited.
              </p>
            </div>
          </div>
          {selectedWallet?.qrImageUrl ? (
            <div className="bg-background rounded-lg border p-2">
              <img
                src={selectedWallet.qrImageUrl}
                alt={`${selectedWallet.label} payment QR code`}
                className="size-36 rounded-md object-contain"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="manual-crypto-tx">Transaction hash</Label>
        <p className="text-muted-foreground text-sm">
          After sending the payment, open the transaction details in your wallet
          and copy the Transaction Hash / TxID. Do not paste your wallet address
          here.
        </p>
        <Input
          id="manual-crypto-tx"
          value={txHash}
          onChange={(event) => setTxHash(event.target.value)}
          placeholder="Paste the Transaction Hash / TxID from your wallet"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="manual-crypto-note">Note</Label>
        <Textarea
          id="manual-crypto-note"
          value={payerNote}
          onChange={(event) => setPayerNote(event.target.value)}
          placeholder="Optional: wallet sender address, exact amount, or anything helpful"
        />
      </div>

      <Button type="button" onClick={submitTopup} disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        Submit top-up
      </Button>
    </div>
  );
}

function getPlanCredits(plan: ManualCryptoTopupPlanView) {
  return plan.credits + (plan.bonusCredits || 0);
}
