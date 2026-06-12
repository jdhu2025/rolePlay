'use client';

/**
 * AI Writer dialog — generates a full character draft in one shot.
 *
 * - Mobile: full-height bottom sheet feel (Dialog with `top: auto` on small
 *   screens via Tailwind variants is awkward, so we lean on the existing
 *   centered Dialog and trust the radix portal). The content is scrollable.
 * - Desktop: centered modal.
 *
 * Cancel discards everything. Retry regenerates with the same hint.
 * Save returns the draft to the parent form, which merges it into its state
 * and closes the dialog.
 */

import { Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from '@/core/i18n/navigation';
import type { RoleplayTTSVoiceProfile } from '@/shared/lib/ai-provider';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import {
  createRoleplayApiError,
  createRoleplayRequestId,
  getRoleplayApiErrorMessage,
  RoleplayApiError,
} from '@/shared/lib/roleplay-ai';
import {
  rememberRoleplayReturnPath,
  withRoleplayCallbackUrl,
} from '@/shared/lib/roleplay-return';
import type { RoleplayFormatStyle } from '@/shared/lib/roleplay-format-style';
import type { PersonalityCard } from '@/shared/lib/roleplay-personality';
import type { RoleplayStyleExample } from '@/shared/lib/roleplay-style-examples';

export type AiWriterDraft = {
  name: string;
  gender: string;
  tagline?: string;
  settings: string;
  intro: string;
  opening: string;
  /** Permanent R2/S3 URL of the auto-generated portrait. Empty when the
   *  image provider isn't configured or generation failed. */
  avatar?: string;
  /** Same URL packed into gallery[0] for the form's image strip. */
  gallery?: string[];
  /** Structured personality card (P0 wave). When the model returns this
   *  the form persists it alongside the legacy `settings` blob so the
   *  chat pipeline can later split it into separate system messages. */
  personalityCard?: PersonalityCard;
  /** P2-2 visual-style anchor. Appended to every future portrait/scene
   *  render to keep the look consistent across regenerations. */
  imageStyleSuffix?: string;
  /** Global TTS voice profile id recommended by AI Writer. */
  voicePreset?: string;
  /** P1-2: few-shot example turns that demonstrate the character voice. */
  styleExamples?: RoleplayStyleExample[];
  /** P2-4: reply formatting preferences. */
  formatStyle?: RoleplayFormatStyle;
};

type ImageMeta = {
  generated: boolean;
  provider?: string;
  model?: string;
  size?: string;
  reason?: string;
};

type Props = {
  open: boolean;
  defaultLanguage?: 'en' | 'zh';
  onClose: () => void;
  onSave: (draft: AiWriterDraft) => void;
};

export function AiWriterDialog({
  open,
  defaultLanguage = 'zh',
  onClose,
  onSave,
}: Props) {
  const t = useTranslations('roleplay.create.ai_writer_dialog');
  const router = useRouter();

  const [hint, setHint] = useState('');
  const [language, setLanguage] = useState<'en' | 'zh'>(defaultLanguage);
  const [loading, setLoading] = useState(false);
  const [voiceProfiles, setVoiceProfiles] = useState<RoleplayTTSVoiceProfile[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    fetch('/api/roleplay/tts/voice-profiles', { credentials: 'include' })
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled) return;
        setVoiceProfiles(payload?.data?.profiles || []);
      })
      .catch(() => {
        if (!cancelled) setVoiceProfiles([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const voiceProfileLabelMap = useMemo(
    () => new Map(voiceProfiles.map((profile) => [profile.id, profile.label])),
    [voiceProfiles]
  );
  const [draft, setDraft] = useState<AiWriterDraft | null>(null);
  const [imageMeta, setImageMeta] = useState<ImageMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setImageMeta(null);
    try {
      const res = await fetch('/api/roleplay/ai-writer', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          hint: hint.trim() || undefined,
          language,
          requestId: createRoleplayRequestId('rp-ai-writer'),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || (payload?.code && payload.code !== 0)) {
        const error = createRoleplayApiError(payload, t('error'));
        if (error.authRequired) {
          rememberRoleplayReturnPath();
          router.push(
            withRoleplayCallbackUrl(error.authRequired.signInUrl || '/sign-up')
          );
          return;
        }
        if (error.insufficientCredits) {
          rememberRoleplayReturnPath();
          router.push(withRoleplayCallbackUrl('/pricing'));
          return;
        }
        setError(getRoleplayApiErrorMessage(payload, t('error')));
        return;
      }
      const next = (payload?.data?.draft || null) as AiWriterDraft | null;
      if (!next) {
        setError(t('error'));
        return;
      }
      setDraft(next);
      setImageMeta((payload?.data?.image as ImageMeta) || null);
    } catch (e: any) {
      if (e instanceof RoleplayApiError && e.authRequired) {
        rememberRoleplayReturnPath();
        router.push(
          withRoleplayCallbackUrl(e.authRequired.signInUrl || '/sign-up')
        );
        return;
      }
      if (e instanceof RoleplayApiError && e.insufficientCredits) {
        rememberRoleplayReturnPath();
        router.push(withRoleplayCallbackUrl('/pricing'));
        return;
      }
      setError(e?.message || t('error'));
    } finally {
      setLoading(false);
    }
  }, [hint, language, router, t]);
  const handleClose = useCallback(() => {
    if (loading) return;
    setDraft(null);
    setImageMeta(null);
    setError(null);
    setHint('');
    onClose();
  }, [loading, onClose]);

  const handleSave = useCallback(() => {
    if (!draft) return;
    onSave(draft);
    setDraft(null);
    setImageMeta(null);
    setHint('');
    setError(null);
  }, [draft, onSave]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] w-[min(640px,calc(100vw-1.5rem))] overflow-y-auto bg-[#15151b] text-white sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-amber-300" />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {t('subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-zinc-300">{t('hint_label')}</span>
            <Input
              data-testid="ai-writer-hint"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder={t('hint_placeholder')}
              disabled={loading}
              className="bg-black/40 text-zinc-100 caret-white placeholder:text-zinc-500"
            />
          </label>

          <fieldset className="flex flex-col gap-1.5 text-sm">
            <legend className="text-zinc-300">{t('language_label')}</legend>
            <div className="flex gap-2">
              {(['zh', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  data-active={language === lang}
                  disabled={loading}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300 transition-colors data-[active=true]:border-white data-[active=true]:bg-white data-[active=true]:text-black disabled:opacity-60"
                >
                  {lang === 'zh' ? t('language_zh') : t('language_en')}
                </button>
              ))}
            </div>
          </fieldset>

          {!draft ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-400">
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> {t('loading')}
                </span>
              ) : error ? (
                <span className="text-rose-300">{error}</span>
              ) : (
                <span>{t('subtitle')}</span>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-3 text-sm">
              {draft.avatar ? (
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-zinc-500">
                    {t('draft_portrait')}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={draft.avatar}
                    alt={draft.name || 'portrait'}
                    className="aspect-[3/4] w-40 rounded-xl object-cover"
                  />
                </div>
              ) : imageMeta && !imageMeta.generated ? (
                <p className="rounded-lg bg-amber-500/10 px-2 py-1.5 text-xs text-amber-200">
                  {t('portrait_skipped')}
                  {imageMeta.reason ? ` — ${imageMeta.reason}` : ''}
                </p>
              ) : null}
              <DraftField label={t('draft_name')} value={draft.name} />
              {draft.tagline ? (
                <DraftField label={t('draft_tagline')} value={draft.tagline} />
              ) : null}
              <DraftField
                label={t('draft_settings')}
                value={draft.settings}
                multiline
              />
              <DraftField
                label={t('draft_intro')}
                value={draft.intro}
                multiline
              />
              <DraftField
                label={t('draft_opening')}
                value={draft.opening}
                multiline
              />
              {draft.personalityCard ? (
                <PersonalityCardPreview card={draft.personalityCard} t={t} />
              ) : null}
              {draft.imageStyleSuffix ? (
                <div className="flex flex-col gap-1 rounded-xl border border-white/5 bg-black/20 p-2.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    {t('card_image_style_suffix')}
                  </span>
                  <p className="whitespace-pre-wrap text-sm text-zinc-100">
                    {draft.imageStyleSuffix}
                  </p>
                </div>
              ) : null}
              {draft.voicePreset ? (
                <div className="flex flex-col gap-1 rounded-xl border border-white/5 bg-black/20 p-2.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    {t('card_voice_preset')}
                  </span>
                  <p className="whitespace-pre-wrap text-sm text-zinc-100">
                    {voiceProfileLabelMap.get(draft.voicePreset) || draft.voicePreset}
                  </p>
                </div>
              ) : null}
              {draft.styleExamples?.length ? (
                <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-black/20 p-2.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    {t('card_style_examples')}
                  </span>
                  {draft.styleExamples.map((example, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-white/5 bg-black/20 p-2 text-xs text-zinc-200"
                    >
                      <p className="text-zinc-400">
                        {t('style_example_user')}: {example.user}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {t('style_example_character')}: {example.character}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
              {draft.formatStyle ? (
                <div className="flex flex-col gap-1 rounded-xl border border-white/5 bg-black/20 p-2.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    {t('card_format_style')}
                  </span>
                  <p className="text-sm text-zinc-100">
                    {[
                      t(
                        `format_style_options.emojiFrequency.${draft.formatStyle.emojiFrequency}` as any
                      ),
                      t(
                        `format_style_options.actionBeatLength.${draft.formatStyle.actionBeatLength}` as any
                      ),
                      t(
                        `format_style_options.englishMix.${draft.formatStyle.englishMix}` as any
                      ),
                    ].join(' · ')}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 disabled:opacity-60"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              data-testid="ai-writer-generate"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {draft ? t('regenerate') : t('generate')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              data-testid="ai-writer-save"
              disabled={loading || !draft}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('save')}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DraftField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <p
        className={
          'whitespace-pre-wrap text-sm text-zinc-100' +
          (multiline ? ' max-h-40 overflow-y-auto' : '')
        }
      >
        {value || '—'}
      </p>
    </div>
  );
}

/**
 * Read-only preview of the structured personality card. Renders nothing
 * for keys the model omitted so a partial draft (e.g. only identity +
 * coreTraits) still looks tidy.
 */
function PersonalityCardPreview({
  card,
  t,
}: {
  card: PersonalityCard;
  t: ReturnType<typeof useTranslations>;
}) {
  const blocks: { label: string; body: React.ReactNode }[] = [];

  if (card.identity) blocks.push({ label: t('card_identity'), body: card.identity });
  if (card.appearance) blocks.push({ label: t('card_appearance'), body: card.appearance });
  if (card.coreTraits?.length || card.tension) {
    blocks.push({
      label: t('card_core_traits'),
      body: (
        <div className="flex flex-col gap-1">
          {card.coreTraits?.length ? (
            <ul className="list-inside list-disc text-sm text-zinc-100">
              {card.coreTraits.map((trait, idx) => (
                <li key={idx}>{trait}</li>
              ))}
            </ul>
          ) : null}
          {card.tension ? (
            <span className="text-xs text-zinc-400">
              {t('card_tension')}: {card.tension}
            </span>
          ) : null}
        </div>
      ),
    });
  }
  if (card.speakingStyle || card.catchphrases?.length || card.metaphorDomain) {
    blocks.push({
      label: t('card_speaking_style'),
      body: (
        <div className="flex flex-col gap-1 text-sm text-zinc-100">
          {card.speakingStyle ? <p>{card.speakingStyle}</p> : null}
          {card.catchphrases?.length ? (
            <p className="text-xs text-zinc-300">
              {t('card_catchphrases')}: {card.catchphrases.join(' / ')}
            </p>
          ) : null}
          {card.metaphorDomain ? (
            <p className="text-xs text-zinc-300">
              {t('card_metaphor_domain')}: {card.metaphorDomain}
            </p>
          ) : null}
          {card.memoryCallbackStyle ? (
            <p className="text-xs text-zinc-300">
              {t('card_memory_callback_style')}: {card.memoryCallbackStyle}
            </p>
          ) : null}
        </div>
      ),
    });
  }
  if (card.trustMilestones?.length) {
    blocks.push({
      label: t('card_trust_milestones'),
      body: (
        <ul className="list-inside list-disc text-sm text-zinc-100">
          {card.trustMilestones.map((m, idx) => (
            <li key={idx}>{m}</li>
          ))}
        </ul>
      ),
    });
  }
  if (card.values?.length) {
    blocks.push({
      label: t('card_values'),
      body: (
        <ul className="list-inside list-disc text-sm text-zinc-100">
          {card.values.map((v, idx) => (
            <li key={idx}>{v}</li>
          ))}
        </ul>
      ),
    });
  }
  if (card.relationshipHook) {
    blocks.push({ label: t('card_relationship_hook'), body: card.relationshipHook });
  }
  if (card.negativeAnchors?.length) {
    blocks.push({
      label: t('card_negative_anchors'),
      body: (
        <ul className="list-inside list-disc text-sm text-rose-200/90">
          {card.negativeAnchors.map((n, idx) => (
            <li key={idx}>{n}</li>
          ))}
        </ul>
      ),
    });
  }

  if (blocks.length === 0) return null;

  return (
    <div className="mt-1 flex flex-col gap-2 rounded-xl border border-white/5 bg-black/20 p-2.5">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {t('card_title')}
      </span>
      <div className="flex flex-col gap-2">
        {blocks.map((block, idx) => (
          <div key={idx} className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-zinc-500">
              {block.label}
            </span>
            <div className="whitespace-pre-wrap">{block.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
