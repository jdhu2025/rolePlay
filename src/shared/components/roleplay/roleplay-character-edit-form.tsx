'use client';

/**
 * Talkie character edit form. Handles both create (no `characterId` prop)
 * and edit (existing id) flows. Mirrors Talkie's right-rail layout on
 * desktop and stacks vertically on mobile.
 *
 * Data flow:
 * - On mount with `characterId`, GET the character + tag chips.
 * - Save: POST (new) or PATCH (existing). Auto-toast on success.
 * - Publish: only available for existing rows that are DRAFT or REJECTED.
 *   Calls the dedicated `/publish` endpoint, which moves the row into
 *   UNDER_REVIEW.
 * - AI Writer: opens the dialog; on Save, merges the four fields into the
 *   form (only overwrites empty fields by default — never clobbers what
 *   the user has manually typed unless they're empty).
 *
 * The form intentionally avoids react-hook-form / zod to stay lightweight
 * and match the rest of the roleplay surface, which uses plain useState.
 */

import { ArrowLeft, Home, Loader2, Pause, Sparkles, Upload, Volume2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import { useRouter } from '@/core/i18n/navigation';
import {
  AiWriterDialog,
  type AiWriterDraft,
} from '@/shared/components/roleplay/ai-writer-dialog';
import { showRoleplayApiErrorToast } from '@/shared/components/roleplay/roleplay-billing-toast';
import { Input } from '@/shared/components/ui/input';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  ACTION_BEAT_LENGTHS,
  EMOJI_FREQUENCIES,
  ENGLISH_MIX_LEVELS,
  EMPTY_FORMAT_STYLE,
  normalizeFormatStyle,
  type RoleplayActionBeatLength,
  type RoleplayEmojiFrequency,
  type RoleplayEnglishMixLevel,
  type RoleplayFormatStyle,
} from '@/shared/lib/roleplay-format-style';
import {
  EMPTY_PERSONALITY_CARD,
  isPersonalityCardEmpty,
  normalizePersonalityCard,
  type PersonalityCard,
} from '@/shared/lib/roleplay-personality';
import {
  type RoleplayTTSVoiceProfile,
} from '@/shared/lib/ai-provider';
import {
  emptyStyleExample,
  normalizeStyleExamples,
  type RoleplayStyleExample,
} from '@/shared/lib/roleplay-style-examples';
import {
  createRoleplayApiError,
  createRoleplayRequestId,
} from '@/shared/lib/roleplay-ai';
import { invalidateRoleplayClientCache } from '@/shared/lib/roleplay-client';
import { cn } from '@/shared/lib/utils';

type Props = {
  characterId?: string;
};

type GenderOption = 'male' | 'female' | 'non-binary';

type EditState = {
  id?: string;
  name: string;
  age: number;
  gender: GenderOption;
  visibility: 'private' | 'public';
  tagline: string;
  intro: string;
  opening: string;
  settings: string;
  tagSlugs: string[];
  status: string;
  rejectionReason: string;
  /** Permanent R2/S3 URL for the character portrait. Set by AI Writer or
   *  uploaded directly via the image picker. Empty means the card falls
   *  back to the placeholder. */
  avatar: string;
  gallery: string[];
  /**
   * Structured personality card (P0 wave). When non-empty the chat
   * pipeline will use the structured fields directly instead of just the
   * raw `settings` blob. AI Writer fills this on Save; manual edits live
   * in the legacy `settings` textarea for now (a dedicated structured
   * editor lands in a later wave — see plan doc).
   */
  personalityCard: PersonalityCard;
  /**
   * P2-2: fixed visual-style anchor appended to every portrait/scene
   * render so a character's images stay consistent across regenerations.
   * AI Writer fills this; the form keeps it hidden by default and only
   * exposes a textarea once the user opts in via the disclosure toggle.
   */
  imageStyleSuffix: string;
  voice: string;
  /**
   * AI-Writer/admin-configured TTS voice profile id. Legacy preset ids are
   * preserved when loaded so existing characters remain playable through the
   * TTS compatibility layer.
   */
  voicePreset: string;
  styleExamples: RoleplayStyleExample[];
  formatStyle: RoleplayFormatStyle;
};

type TagItem = {
  slug: string;
  labelEn: string;
  labelZh: string;
};

type PublishAuditConflict = {
  severity: 'low' | 'medium' | 'high';
  type: string;
  fields: string[];
  evidence: string;
  recommendation: string;
};

type PublishAudit = {
  passed: boolean;
  overallRisk: 'low' | 'medium' | 'high';
  summary: string;
  conflicts: PublishAuditConflict[];
  promptFixSuggestions: string[];
};

let cachedRoleplayTags: TagItem[] | null = null;

const EMPTY: EditState = {
  name: '',
  age: 24,
  gender: 'non-binary',
  visibility: 'private',
  tagline: '',
  intro: '',
  opening: '',
  settings: '',
  tagSlugs: [],
  status: 'draft',
  rejectionReason: '',
  avatar: '',
  gallery: [],
  personalityCard: EMPTY_PERSONALITY_CARD,
  imageStyleSuffix: '',
  voice: '',
  voicePreset: '',
  styleExamples: [],
  formatStyle: EMPTY_FORMAT_STYLE,
};
const IMAGE_STYLE_SUFFIX_LIMIT = 600;
const NAME_LIMIT = 40;

function normalizeVoiceProfileId(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

function uniqueUrls(urls: string[]) {
  return Array.from(new Set(urls.filter(Boolean)));
}

function syncAvatarFromGallery(gallery: string[]) {
  const nextGallery = uniqueUrls(gallery);
  return {
    gallery: nextGallery,
    avatar: nextGallery[0] || '',
  };
}

export function RoleplayCharacterEditForm({ characterId }: Props) {
  const t = useTranslations('roleplay.create');
  const locale = useLocale();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [state, setState] = useState<EditState>(EMPTY);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [voiceProfiles, setVoiceProfiles] = useState<RoleplayTTSVoiceProfile[]>([]);
  const [voicePreviewLoading, setVoicePreviewLoading] = useState(false);
  const [voicePreviewPlaying, setVoicePreviewPlaying] = useState(false);
  const voicePreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(Boolean(characterId));
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [publishAudit, setPublishAudit] = useState<PublishAudit | null>(null);
  // P2-2: visual-style anchor is hidden by default. The AI Writer fills it
  // and most creators never need to see it; advanced users can flip the
  // disclosure to inspect/tweak the prompt suffix.
  const [showImageStyleSuffix, setShowImageStyleSuffix] = useState(false);

  const isZh = locale.startsWith('zh');
  const isEdit = Boolean(state.id);
  const normalisedStatus =
    state.status === 'created' ? 'published' : state.status;
  // Public rows under review are read-only. Published private rows remain
  // editable by the owner so they can keep iterating on private characters.
  const isLocked =
    normalisedStatus === 'under_review' ||
    (normalisedStatus === 'published' && state.visibility === 'public');
  const canPublish =
    isEdit &&
    !isLocked &&
    (normalisedStatus === 'draft' || normalisedStatus === 'rejected') &&
    state.name.trim().length > 0 &&
    state.settings.trim().length > 0;

  useEffect(() => {
    let cancelled = false;
    fetch('/api/roleplay/tts/voice-profiles', { credentials: 'include' })
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled) return;
        setVoiceProfiles(payload?.data?.profiles || []);
      })
      .catch(() => {
        if (cancelled) return;
        setVoiceProfiles([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      voicePreviewAudioRef.current?.pause();
      voicePreviewAudioRef.current = null;
    };
  }, []);

  // -------- bootstrap --------
  useEffect(() => {
    let cancelled = false;
    if (cachedRoleplayTags) {
      setTags(cachedRoleplayTags);
      return () => {
        cancelled = true;
      };
    }
    fetch('/api/roleplay/tags', { credentials: 'include' })
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled) return;
        const list = (payload?.data?.tags || []) as TagItem[];
        cachedRoleplayTags = list;
        setTags(list);
      })
      .catch(() => {
        // Tags failure is non-fatal — the form still saves, just without
        // the chip picker. The home page is the primary tag-driven surface.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!characterId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/roleplay/characters/${characterId}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled) return;
        if (payload?.code && payload.code !== 0) {
          toast.error(payload.message || 'load failed');
          return;
        }
        const c = payload?.data?.character;
        if (!c) return;
        setState({
          id: c.id,
          name: c.name || '',
          age:
            typeof c.age === 'number' && Number.isFinite(c.age) ? c.age : 24,
          gender: normaliseGender(c.gender),
          visibility: c.visibility === 'public' ? 'public' : 'private',
          tagline: c.tagline || '',
          intro: c.intro || '',
          opening: c.opening || '',
          settings: c.settings || '',
          tagSlugs: Array.isArray(c.tagSlugs) ? c.tagSlugs : [],
          status: c.status || 'draft',
          rejectionReason: c.rejectionReason || '',
          avatar: c.avatar || '',
          gallery: Array.isArray(c.gallery) ? c.gallery : [],
          personalityCard:
            c.personalityCard && typeof c.personalityCard === 'object'
              ? normalizePersonalityCard(c.personalityCard)
              : EMPTY_PERSONALITY_CARD,
          imageStyleSuffix:
            typeof c.imageStyleSuffix === 'string' ? c.imageStyleSuffix : '',
          voice: typeof c.voice === 'string' ? c.voice : '',
          voicePreset: normalizeVoiceProfileId(c.voicePreset),
          styleExamples: normalizeStyleExamples(c.styleExamples),
          formatStyle: normalizeFormatStyle(c.formatStyle),
        });
      })
      .catch((err) => toast.error(err?.message || 'load failed'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [characterId]);

  const selectedVoiceProfile = useMemo(
    () =>
      voiceProfiles.find(
        (profile) => profile.id === normalizeVoiceProfileId(state.voicePreset)
      ) || null,
    [state.voicePreset, voiceProfiles]
  );

  const handlePreviewVoice = useCallback(async () => {
    if (voicePreviewPlaying) {
      voicePreviewAudioRef.current?.pause();
      voicePreviewAudioRef.current = null;
      setVoicePreviewPlaying(false);
      return;
    }

    const previewText = isZh
      ? `*轻轻笑了一下* 嗨，我是${state.name.trim() || '你的角色'}。这就是我现在的声音，听起来还适合这个场景吗？`
      : `*smiles softly* Hi, I'm ${state.name.trim() || 'your character'}. This is how my voice sounds in this scene.`;

    setVoicePreviewLoading(true);
    try {
      const response = await fetch('/api/roleplay/tts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text: previewText,
          voicePreset: state.voicePreset,
          gender: state.gender,
          characterName: state.name,
          scene: state.settings || state.intro,
          relationship: state.tagline,
          style: selectedVoiceProfile?.traits?.join(', ') || '',
          personality: state.personalityCard?.coreTraits || [],
          voiceDirection: [
            state.voice,
            state.personalityCard?.speakingStyle,
            state.personalityCard?.tension,
            selectedVoiceProfile?.instructions,
          ]
            .filter(Boolean)
            .join(' '),
          recentMessages: [
            {
              role: 'character',
              text: previewText,
            },
          ],
          requestId: createRoleplayRequestId('rp-tts-preview'),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.code !== 0 || !payload?.data?.url) {
        throw createRoleplayApiError(payload, 'voice preview failed');
      }

      voicePreviewAudioRef.current?.pause();
      const audio = new Audio(payload.data.url);
      voicePreviewAudioRef.current = audio;
      setVoicePreviewPlaying(true);
      audio.onended = () => {
        if (voicePreviewAudioRef.current === audio) {
          voicePreviewAudioRef.current = null;
          setVoicePreviewPlaying(false);
        }
      };
      audio.onerror = () => {
        if (voicePreviewAudioRef.current === audio) {
          voicePreviewAudioRef.current = null;
          setVoicePreviewPlaying(false);
        }
        toast.error(isZh ? '音色试听失败，请重试。' : 'Voice preview failed. Try again.');
      };
      await audio.play();
    } catch (error) {
      showRoleplayApiErrorToast(
        error,
        isZh ? '音色试听失败，请重试。' : 'Voice preview failed. Try again.'
      );
    } finally {
      setVoicePreviewLoading(false);
    }
  }, [
    isZh,
    selectedVoiceProfile?.instructions,
    selectedVoiceProfile?.traits,
    state.gender,
    state.intro,
    state.name,
    state.personalityCard?.coreTraits,
    state.personalityCard?.speakingStyle,
    state.personalityCard?.tension,
    state.settings,
    state.tagline,
    state.voice,
    state.voicePreset,
    voicePreviewPlaying,
  ]);

  const update = useCallback(<K extends keyof EditState>(key: K, value: EditState[K]) => {
    setPublishAudit(null);
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateStyleExample = useCallback(
    (idx: number, key: keyof RoleplayStyleExample, value: string) => {
      setPublishAudit(null);
      setState((prev) => {
        const next = [
          ...prev.styleExamples,
          ...Array.from(
            { length: Math.max(0, 3 - prev.styleExamples.length) },
            emptyStyleExample
          ),
        ].slice(0, 3);
        next[idx] = { ...next[idx], [key]: value };
        return { ...prev, styleExamples: next };
      });
    },
    []
  );

  const toggleTag = useCallback((slug: string) => {
    setPublishAudit(null);
    setState((prev) => {
      const has = prev.tagSlugs.includes(slug);
      return {
        ...prev,
        tagSlugs: has
          ? prev.tagSlugs.filter((s) => s !== slug)
          : [...prev.tagSlugs, slug],
      };
    });
  }, []);

  const uploadImages = useCallback(
    async (files: File[]) => {
      if (!files.length || isLocked) return;
      setUploadingImage(true);
      try {
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));
        const res = await fetch('/api/storage/upload-image', {
          method: 'POST',
          body: formData,
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || (payload?.code && payload.code !== 0)) {
          throw new Error(payload?.message || t('image_upload_error'));
        }
        const urls = Array.isArray(payload?.data?.urls)
          ? payload.data.urls.filter(Boolean)
          : [];
        if (!urls.length) throw new Error(t('image_upload_error'));
        setPublishAudit(null);
        setState((prev) => ({
          ...prev,
          ...syncAvatarFromGallery([...prev.gallery, ...urls]),
        }));
        toast.success(t('image_uploaded'));
      } catch (error: any) {
        toast.error(error?.message || t('image_upload_error'));
      } finally {
        setUploadingImage(false);
      }
    },
    [isLocked, t]
  );

  const generateImage = useCallback(async () => {
    if (isLocked) return;
    setGeneratingImage(true);
    try {
      const prompt = [state.tagline, state.intro, state.settings]
        .filter(Boolean)
        .join('\n');
      const referenceImage = state.gallery[0] || '';
      const res = await fetch('/api/roleplay/image', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          characterName: state.name || undefined,
          characterGender: state.gender,
          characterAvatar: referenceImage || undefined,
          characterIntro: state.intro || state.settings || undefined,
          characterStyle: state.tagline || undefined,
          imageStyleSuffix: state.imageStyleSuffix || undefined,
          prompt,
          requestId: createRoleplayRequestId('rp-image'),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || (payload?.code && payload.code !== 0)) {
        throw createRoleplayApiError(payload, t('image_generate_error'));
      }
      const url = payload?.data?.url;
      if (!url) throw new Error(t('image_generate_error'));
      setPublishAudit(null);
      setState((prev) => ({
        ...prev,
        ...syncAvatarFromGallery([...prev.gallery, url]),
      }));
      toast.success(t('image_generated'));
    } catch (error: any) {
      showRoleplayApiErrorToast(error, t('image_generate_error'));
    } finally {
      setGeneratingImage(false);
    }
  }, [isLocked, state.gallery, state.gender, state.imageStyleSuffix, state.intro, state.name, state.settings, state.tagline, t]);

  const removeGalleryImage = useCallback(
    (url: string) => {
      if (isLocked) return;
      setPublishAudit(null);
      setState((prev) => ({
        ...prev,
        ...syncAvatarFromGallery(prev.gallery.filter((item) => item !== url)),
      }));
    },
    [isLocked]
  );

  const setPrimaryImage = useCallback(
    (url: string) => {
      if (isLocked) return;
      setPublishAudit(null);
      setState((prev) => ({
        ...prev,
        ...syncAvatarFromGallery([
          url,
          ...prev.gallery.filter((item) => item !== url),
        ]),
      }));
    },
    [isLocked]
  );
  const validate = useCallback(
    (forPublish: boolean): string | null => {
      if (!state.name.trim()) return t('validation.name_required');
      if (state.name.length > NAME_LIMIT) return t('validation.name_too_long');
      if (forPublish && !state.settings.trim()) {
        return t('validation.settings_required');
      }
      return null;
    },
    [state.name, state.settings, t]
  );

  const handleSave = useCallback(async () => {
    const err = validate(false);
    if (err) {
      setValidationError(err);
      toast.error(err);
      return null;
    }
    setValidationError(null);
    setSaving(true);
    try {
      const body = {
        name: state.name,
        age: state.age,
        gender: state.gender,
        visibility: state.visibility,
        tagline: state.tagline,
        intro: state.intro,
        opening: state.opening,
        settings: state.settings,
        tagSlugs: state.tagSlugs,
        avatar: state.avatar,
        cover: state.avatar,
        gallery: state.gallery,
        personalityCard: state.personalityCard,
        imageStyleSuffix: state.imageStyleSuffix,
        voice: state.voice,
        voicePreset: state.voicePreset,
        styleExamples: normalizeStyleExamples(state.styleExamples),
        formatStyle: normalizeFormatStyle(state.formatStyle),
        status: 'draft' as const,
      };
      const url = state.id
        ? `/api/roleplay/characters/${state.id}`
        : `/api/roleplay/characters`;
      const method = state.id ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || (payload?.code && payload.code !== 0)) {
        toast.error(payload?.message || 'save failed');
        return null;
      }
      const character = payload?.data?.character;
      if (character) {
        invalidateRoleplayClientCache(`character:${character.id}`);
        invalidateRoleplayClientCache('characters:');
        invalidateRoleplayClientCache('recommendations:');
        setState((prev) => ({
          ...prev,
          id: character.id,
          status: character.status || 'draft',
          visibility:
            character.visibility === 'public' ? 'public' : prev.visibility,
          rejectionReason: character.rejectionReason || '',
        }));
        // For freshly created drafts, swap the URL so subsequent saves PATCH
        // instead of duplicating. router.replace keeps history clean.
        if (!state.id && character.id) {
          router.replace(`/create/edit/${character.id}`);
        }
      }
      toast.success(t('save'));
      return character?.id || state.id || null;
    } catch (e: any) {
      toast.error(e?.message || 'save failed');
      return null;
    } finally {
      setSaving(false);
    }
  }, [router, state, t, validate]);

  const handlePublish = useCallback(async () => {
    const err = validate(true);
    if (err) {
      setValidationError(err);
      toast.error(err);
      return;
    }
    // Save current edits first so the row reflects what the moderator will
    // see. handleSave already toasts on failure.
    const id = await handleSave();
    if (!id) return;
    setPublishing(true);
    setPublishAudit(null);
    try {
      const res = await fetch(`/api/roleplay/characters/${id}/publish`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          visibility: state.visibility,
          requestId: createRoleplayRequestId('rp-publish'),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || (payload?.code && payload.code !== 0)) {
        showRoleplayApiErrorToast(payload, 'publish failed');
        return;
      }
      if (payload?.data?.blocked && payload?.data?.audit) {
        setPublishAudit(payload.data.audit as PublishAudit);
        toast.error(t('publish_audit.blocked_toast'));
        return;
      }
      const next = payload?.data?.character;
      setState((prev) => ({
        ...prev,
        status: next?.status || 'under_review',
        visibility: next?.visibility === 'public' ? 'public' : 'private',
        rejectionReason: '',
      }));
      const nextStatus = next?.status || 'under_review';
      toast.success(
        nextStatus === 'published'
          ? t('status_labels.published')
          : t('status_labels.under_review')
      );
      // Public rows still need admin review; private rows are immediately
      // chat-ready for the owner after passing the same audit gate.
      router.push(
        nextStatus === 'published'
          ? '/create?tab=published'
          : '/create?tab=under_review'
      );
    } catch (e: any) {
      showRoleplayApiErrorToast(e, 'publish failed');
    } finally {
      setPublishing(false);
    }
  }, [handleSave, router, state.visibility, t, validate]);

  const handleAuditRepair = useCallback(async () => {
    const id = state.id;
    if (!id) return;
    setRepairing(true);
    try {
      const res = await fetch(`/api/roleplay/characters/${id}/audit-repair`, {
        method: 'POST',
        credentials: 'include',
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || (payload?.code && payload.code !== 0)) {
        toast.error(payload?.message || 'repair failed');
        return;
      }
      const repair = payload?.data?.repair;
      const patch = repair?.patch;
      if (!patch) {
        setPublishAudit(null);
        toast.success(t('publish_audit.already_passed'));
        return;
      }
      setState((prev) => ({
        ...prev,
        age:
          typeof patch.age === 'number' && Number.isFinite(patch.age)
            ? Math.max(18, Math.min(99, Math.round(patch.age)))
            : prev.age,
        tagline:
          typeof patch.tagline === 'string' ? patch.tagline : prev.tagline,
        intro: typeof patch.intro === 'string' ? patch.intro : prev.intro,
        opening:
          typeof patch.opening === 'string' ? patch.opening : prev.opening,
        settings:
          typeof patch.settings === 'string' ? patch.settings : prev.settings,
        personalityCard:
          patch.personalityCard && typeof patch.personalityCard === 'object'
            ? normalizePersonalityCard(patch.personalityCard)
            : prev.personalityCard,
        imageStyleSuffix:
          typeof patch.imageStyleSuffix === 'string'
            ? patch.imageStyleSuffix.slice(0, IMAGE_STYLE_SUFFIX_LIMIT)
            : prev.imageStyleSuffix,
        voicePreset: patch.voicePreset
          ? normalizeVoiceProfileId(patch.voicePreset)
          : prev.voicePreset,
        styleExamples: Array.isArray(patch.styleExamples)
          ? normalizeStyleExamples(patch.styleExamples)
          : prev.styleExamples,
        formatStyle:
          patch.formatStyle && typeof patch.formatStyle === 'object'
            ? normalizeFormatStyle(patch.formatStyle)
            : prev.formatStyle,
      }));
      setPublishAudit((payload?.data?.audit as PublishAudit) ?? null);
      toast.success(
        payload?.data?.audit?.passed
          ? t('publish_audit.repair_applied')
          : t('publish_audit.repair_partial')
      );
    } catch (e: any) {
      toast.error(e?.message || 'repair failed');
    } finally {
      setRepairing(false);
    }
  }, [state.id, t]);

  const handleAiSave = useCallback((draft: AiWriterDraft) => {
    setPublishAudit(null);
    setState((prev) => ({
      ...prev,
      name: prev.name.trim() ? prev.name : draft.name.slice(0, NAME_LIMIT),
      gender: normaliseGender(draft.gender) ?? prev.gender,
      tagline: prev.tagline.trim() ? prev.tagline : draft.tagline || prev.tagline,
      settings: prev.settings.trim() ? prev.settings : draft.settings,
      intro: prev.intro.trim() ? prev.intro : draft.intro,
      opening: prev.opening.trim() ? prev.opening : draft.opening,
      // Portrait merge rule: AI Writer wins only when the user hasn't
      // already picked an avatar manually. Mirrors the text fields'
      // "don't clobber what's typed" behavior.
      avatar: prev.avatar
        ? prev.avatar
        : draft.avatar || prev.avatar,
      gallery:
        prev.gallery.length > 0
          ? prev.gallery
          : draft.gallery && draft.gallery.length > 0
            ? draft.gallery
            : draft.avatar
              ? [draft.avatar]
              : prev.gallery,
      // Personality card: AI Writer always wins when the user's current
      // card is empty. We don't try to merge field-by-field — if the user
      // has already accepted an AI Writer draft and then tweaks the
      // settings textarea by hand, regenerating replaces the structured
      // card wholesale because the new run reflects the user's latest hint.
      personalityCard:
        draft.personalityCard && !isPersonalityCardEmpty(draft.personalityCard)
          ? normalizePersonalityCard(draft.personalityCard as Record<string, unknown>)
          : prev.personalityCard,
      // P2-2: same "AI Writer wins only if current is empty" rule for the
      // visual-style anchor. Once the user manually tweaks it we keep
      // their version on regenerates.
      imageStyleSuffix: prev.imageStyleSuffix.trim()
        ? prev.imageStyleSuffix
        : (draft.imageStyleSuffix || '').slice(0, IMAGE_STYLE_SUFFIX_LIMIT),
      // Voice profile follows the same rule. Once the user picks a profile
      // by hand we keep it; only fill from AI Writer when the form is empty.
      voicePreset: prev.voicePreset
        ? prev.voicePreset
        : normalizeVoiceProfileId(draft.voicePreset),
      styleExamples:
        prev.styleExamples.length > 0
          ? prev.styleExamples
          : normalizeStyleExamples(draft.styleExamples),
      formatStyle: normalizeFormatStyle(draft.formatStyle || prev.formatStyle),
    }));
    setAiOpen(false);
    toast.success(t('ai_writer'));
  }, [t]);

  const statusBadge = useMemo(() => {
    const status = state.status === 'created' ? 'published' : state.status;
    if (status === 'draft') return null;
    return {
      label: t(`status_labels.${status}` as any),
      tone:
        status === 'under_review'
          ? 'bg-amber-500/20 text-amber-200'
          : status === 'published'
            ? 'bg-emerald-500/20 text-emerald-200'
            : 'bg-rose-500/20 text-rose-200',
    };
  }, [state.status, t]);

  return (
    <main className="min-h-dvh bg-[#0d0d10] pb-[calc(env(safe-area-inset-bottom)+96px)] text-white md:pb-12">
      <header className="sticky top-0 z-10 border-b border-white/5 bg-[#0d0d10]/85 backdrop-blur supports-[backdrop-filter]:bg-[#0d0d10]/70">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={() => router.push('/create')}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm text-zinc-300 transition-colors hover:bg-white/5"
          >
            <ArrowLeft className="size-4" />
            {t('back')}
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm text-zinc-300 transition-colors hover:bg-white/5"
            aria-label={t('home_label')}
          >
            <Home className="size-4" />
            <span className="hidden sm:inline">{t('home_label')}</span>
          </button>
          <h1 className="ml-1 flex-1 truncate text-base font-semibold md:text-lg">
            {state.id ? state.name || t('title') : t('title')}
          </h1>
          {statusBadge ? (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                statusBadge.tone
              )}
            >
              {statusBadge.label}
            </span>
          ) : null}
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 pt-4 md:px-6 md:pt-8">
        {loading ? (
          <FormSkeleton />
        ) : (
          <div className="flex flex-col gap-5">
            {state.status === 'rejected' && state.rejectionReason ? (
              <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                <span className="font-medium">{t('rejection_label')}: </span>
                {state.rejectionReason}
              </p>
            ) : null}

            {isLocked ? (
              <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {normalisedStatus === 'under_review'
                  ? t('locked_under_review')
                  : t('locked_published')}
              </p>
            ) : normalisedStatus === 'published' && state.visibility === 'private' ? (
              <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {t('editable_private_published')}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setAiOpen(true)}
                data-testid="open-ai-writer"
                disabled={isLocked}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/10 disabled:opacity-60"
              >
                <Sparkles className="size-4 text-amber-300" />
                {t('ai_writer')}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLocked || uploadingImage}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/10 disabled:opacity-60"
              >
                {uploadingImage ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {t('upload')}
              </button>
              <button
                type="button"
                onClick={() => void generateImage()}
                disabled={isLocked || generatingImage}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/10 disabled:opacity-60"
              >
                {generatingImage ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-amber-300" />}
                {isZh ? '生成图片' : 'Generate image'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  if (files.length) void uploadImages(files);
                  event.currentTarget.value = '';
                }}
              />
            </div>

            {state.gallery.length > 0 ? (
              <Field label={t('image')}>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {state.gallery.map((url, index) => (
                    <div
                      key={`${url}-${index}`}
                      className="rounded-2xl border border-white/10 bg-black/20 p-3"
                    >
                      <div className="pointer-events-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={state.name || 'portrait'}
                          className="aspect-[3/4] w-full rounded-xl object-cover"
                        />
                      </div>
                      {!isLocked ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {index !== 0 ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setPrimaryImage(url);
                              }}
                              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/5"
                            >
                              {isZh ? '设为主图' : 'Set primary'}
                            </button>
                          ) : (
                            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200">
                              {isZh ? '主图' : 'Primary'}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeGalleryImage(url);
                            }}
                            className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/5"
                          >
                            {isZh ? '删除' : 'Delete'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Field>
            ) : null}

            <Field label={t('name')}>
              <Input
                value={state.name}
                maxLength={NAME_LIMIT}
                placeholder={t('name_placeholder')}
                disabled={isLocked}
                onChange={(e) => update('name', e.target.value)}
                className="border-white/10 bg-black/40 text-zinc-100 placeholder:text-zinc-500 caret-white selection:bg-white/20 disabled:opacity-70"
              />
              <p className="mt-1 text-xs text-zinc-500">
                {state.name.length}/{NAME_LIMIT}
              </p>
            </Field>

            <Field label={t('gender')}>
              <div className="flex flex-wrap gap-2">
                {(['male', 'female', 'non-binary'] as GenderOption[]).map(
                  (g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => !isLocked && update('gender', g)}
                      disabled={isLocked}
                      data-active={state.gender === g}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition-colors data-[active=true]:border-white data-[active=true]:bg-white data-[active=true]:text-black disabled:opacity-60"
                    >
                      {t(`gender_options.${g}`)}
                    </button>
                  )
                )}
              </div>
            </Field>

            <Field
              label={t('publish_visibility_label')}
              help={t('publish_visibility_help')}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                {(['private', 'public'] as const).map((visibility) => (
                  <button
                    key={visibility}
                    type="button"
                    onClick={() => !isLocked && update('visibility', visibility)}
                    disabled={isLocked}
                    data-active={state.visibility === visibility}
                    className={cn(
                      'rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left transition-colors disabled:opacity-60',
                      'data-[active=true]:border-white/60 data-[active=true]:bg-white/10'
                    )}
                  >
                    <span className="block text-sm font-medium text-zinc-100">
                      {t(`publish_visibility_options.${visibility}.label`)}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                      {t(`publish_visibility_options.${visibility}.help`)}
                    </span>
                  </button>
                ))}
              </div>
            </Field>

            <Field
              label={t('settings')}
              help={t('settings_help')}
            >
              <Textarea
                value={state.settings}
                onChange={(e) => update('settings', e.target.value)}
                placeholder={t('settings_placeholder')}
                disabled={isLocked}
                className="min-h-[160px] border-white/10 bg-black/40 text-zinc-100 placeholder:text-zinc-500 caret-white selection:bg-white/20 disabled:opacity-70"
              />
            </Field>

            <Field
              label={t('intro')}
              help={t('intro_help')}
            >
              <Textarea
                value={state.intro}
                onChange={(e) => update('intro', e.target.value)}
                placeholder={t('intro_placeholder')}
                disabled={isLocked}
                className="min-h-[110px] border-white/10 bg-black/40 text-zinc-100 placeholder:text-zinc-500 caret-white selection:bg-white/20 disabled:opacity-70"
              />
            </Field>

            <Field label={t('first_message')}>
              <Textarea
                value={state.opening}
                onChange={(e) => update('opening', e.target.value)}
                placeholder={t('first_message_placeholder')}
                disabled={isLocked}
                className="min-h-[90px] border-white/10 bg-black/40 text-zinc-100 placeholder:text-zinc-500 caret-white selection:bg-white/20 disabled:opacity-70"
              />
            </Field>

            {/* Visual-style anchor + voice profile live behind a shared
                advanced disclosure. Both are AI-Writer-filled and most
                creators never need to touch them; power users tick the
                toggle to inspect / fine-tune. */}
            <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={showImageStyleSuffix}
                  onChange={(e) => setShowImageStyleSuffix(e.target.checked)}
                  disabled={isLocked}
                  className="size-4 rounded border-white/20 bg-black/40 text-white accent-white"
                />
                {t('image_style_suffix_toggle')}
              </label>
              {showImageStyleSuffix ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs text-zinc-500">
                      {t('image_style_suffix_help')}
                    </p>
                    <Textarea
                      value={state.imageStyleSuffix}
                      onChange={(e) =>
                        update(
                          'imageStyleSuffix',
                          e.target.value.slice(0, IMAGE_STYLE_SUFFIX_LIMIT)
                        )
                      }
                      placeholder={t('image_style_suffix_placeholder')}
                      disabled={isLocked}
                      maxLength={IMAGE_STYLE_SUFFIX_LIMIT}
                      className="min-h-[80px] border-white/10 bg-black/40 text-zinc-100 placeholder:text-zinc-500 caret-white selection:bg-white/20 disabled:opacity-70"
                    />
                    <p className="text-right text-xs text-zinc-500">
                      {state.imageStyleSuffix.length}/{IMAGE_STYLE_SUFFIX_LIMIT}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-zinc-300">
                      {t('voice_preset_label')}
                    </span>
                    <p className="text-xs text-zinc-500">
                      {t('voice_preset_help')}
                    </p>
                    <div className="flex gap-2">
                      <select
                        value={state.voicePreset}
                        onChange={(e) =>
                          update('voicePreset', normalizeVoiceProfileId(e.target.value))
                        }
                        disabled={isLocked}
                        className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none disabled:opacity-70"
                      >
                        <option value="">
                          {t('voice_preset_options.unset')}
                        </option>
                        {voiceProfiles.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handlePreviewVoice}
                        disabled={voicePreviewLoading}
                        className="inline-flex shrink-0 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {voicePreviewLoading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : voicePreviewPlaying ? (
                          <Pause className="size-4" />
                        ) : (
                          <Volume2 className="size-4" />
                        )}
                        {isZh
                          ? voicePreviewPlaying
                            ? '暂停'
                            : '试听'
                          : voicePreviewPlaying
                            ? 'Pause'
                            : 'Preview'}
                      </button>
                    </div>
                    {state.voicePreset && !selectedVoiceProfile ? (
                      <p className="text-xs text-amber-400/90">
                        {isZh
                          ? `当前音色 ID：${state.voicePreset}（后台音色库中未找到，保存后仍会保留该值）`
                          : `Current voice profile id: ${state.voicePreset} (not found in admin voice library; it will still be preserved on save).`}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <FormatStyleSelect
                      label={t('format_style_emoji_label')}
                      value={state.formatStyle.emojiFrequency}
                      options={EMOJI_FREQUENCIES}
                      optionLabel={(value) =>
                        t(`format_style_options.emojiFrequency.${value}` as any)
                      }
                      disabled={isLocked}
                      onChange={(value) =>
                        update('formatStyle', {
                          ...state.formatStyle,
                          emojiFrequency: value as RoleplayEmojiFrequency,
                        })
                      }
                    />
                    <FormatStyleSelect
                      label={t('format_style_action_label')}
                      value={state.formatStyle.actionBeatLength}
                      options={ACTION_BEAT_LENGTHS}
                      optionLabel={(value) =>
                        t(`format_style_options.actionBeatLength.${value}` as any)
                      }
                      disabled={isLocked}
                      onChange={(value) =>
                        update('formatStyle', {
                          ...state.formatStyle,
                          actionBeatLength: value as RoleplayActionBeatLength,
                        })
                      }
                    />
                    <FormatStyleSelect
                      label={t('format_style_english_label')}
                      value={state.formatStyle.englishMix}
                      options={ENGLISH_MIX_LEVELS}
                      optionLabel={(value) =>
                        t(`format_style_options.englishMix.${value}` as any)
                      }
                      disabled={isLocked}
                      onChange={(value) =>
                        update('formatStyle', {
                          ...state.formatStyle,
                          englishMix: value as RoleplayEnglishMixLevel,
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-zinc-300">
                        {t('style_examples_label')}
                      </span>
                      <p className="text-xs text-zinc-500">
                        {t('style_examples_help')}
                      </p>
                    </div>
                    {[
                      ...state.styleExamples,
                      ...Array.from(
                        { length: Math.max(0, 3 - state.styleExamples.length) },
                        emptyStyleExample
                      ),
                    ]
                      .slice(0, 3)
                      .map((example, idx) => (
                        <div
                          key={idx}
                          className="grid gap-2 rounded-xl border border-white/5 bg-black/20 p-3"
                        >
                          <Input
                            value={example.user}
                            onChange={(e) =>
                              updateStyleExample(idx, 'user', e.target.value)
                            }
                            placeholder={t('style_example_user_placeholder')}
                            disabled={isLocked}
                            maxLength={500}
                            className="border-white/10 bg-black/40 text-zinc-100 placeholder:text-zinc-500 caret-white selection:bg-white/20 disabled:opacity-70"
                          />
                          <Textarea
                            value={example.character}
                            onChange={(e) =>
                              updateStyleExample(
                                idx,
                                'character',
                                e.target.value
                              )
                            }
                            placeholder={t(
                              'style_example_character_placeholder'
                            )}
                            disabled={isLocked}
                            maxLength={800}
                            className="min-h-[72px] border-white/10 bg-black/40 text-zinc-100 placeholder:text-zinc-500 caret-white selection:bg-white/20 disabled:opacity-70"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>

            <Field label={t('tags')} help={t('tags_help')}>
              {tags.length === 0 ? (
                <p className="text-xs text-zinc-500">{t('tags_help')}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const active = state.tagSlugs.includes(tag.slug);
                    return (
                      <button
                        key={tag.slug}
                        type="button"
                        onClick={() => !isLocked && toggleTag(tag.slug)}
                        disabled={isLocked}
                        data-active={active}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition-colors data-[active=true]:border-white data-[active=true]:bg-white data-[active=true]:text-black disabled:opacity-60"
                      >
                        {tagLabel(tag, locale)}
                      </button>
                    );
                  })}
                </div>
              )}
            </Field>

            {publishAudit ? (
              <PublishAuditPanel
                audit={publishAudit}
                repairing={repairing}
                onRepair={handleAuditRepair}
                t={t}
              />
            ) : null}

            {validationError ? (
              <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
                {validationError}
              </p>
            ) : null}
          </div>
        )}
      </section>

      {/* Sticky action bar — fixed on mobile, inline on desktop, with safe
          area padding so iOS home indicator doesn't cover the buttons.
          Hidden entirely once the row is locked (under review / published)
          since neither Save nor Publish is allowed in that state. */}
      {isLocked ? null : (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/5 bg-[#0d0d10]/95 px-4 py-3 backdrop-blur md:static md:mx-auto md:mt-6 md:max-w-4xl md:border-0 md:bg-transparent md:px-6 md:py-0">
          <div className="mx-auto flex max-w-4xl items-center justify-end gap-2 pb-[env(safe-area-inset-bottom)] md:pb-0">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || publishing || repairing}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/5 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {saving ? t('saving') : t('save')}
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={!canPublish || saving || publishing || repairing}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_-8px_rgba(217,70,239,0.65)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0"
              style={{ background: 'var(--roleplay-brand-gradient)' }}
            >
              {publishing ? <Loader2 className="size-4 animate-spin" /> : null}
              {publishing ? t('publishing') : t('publish')}
            </button>
          </div>
        </div>
      )}

      <AiWriterDialog
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onSave={handleAiSave}
      />
    </main>
  );
}

function PublishAuditPanel({
  audit,
  repairing,
  onRepair,
  t,
}: {
  audit: PublishAudit;
  repairing: boolean;
  onRepair: () => void;
  t: any;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-amber-100">
            {t('publish_audit.title')}
          </h2>
          <p className="text-xs leading-relaxed text-amber-100/75">
            {audit.summary || t('publish_audit.summary_fallback')}
          </p>
        </div>
        <span className="mt-1 self-start rounded-full border border-amber-300/30 px-2 py-0.5 text-[11px] font-medium uppercase text-amber-100">
          {t(`publish_audit.risk.${audit.overallRisk}` as any)}
        </span>
      </div>

      {audit.conflicts.length ? (
        <ul className="flex flex-col gap-2">
          {audit.conflicts.map((conflict, idx) => (
            <li
              key={`${conflict.type}-${idx}`}
              className="rounded-xl border border-white/10 bg-black/20 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium uppercase text-zinc-200">
                  {t(`publish_audit.severity.${conflict.severity}` as any)}
                </span>
                {conflict.fields.length ? (
                  <span className="text-[11px] text-zinc-400">
                    {conflict.fields.join(' / ')}
                  </span>
                ) : null}
              </div>
              {conflict.evidence ? (
                <p className="mt-2 text-xs leading-relaxed text-zinc-200">
                  {conflict.evidence}
                </p>
              ) : null}
              {conflict.recommendation ? (
                <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
                  {conflict.recommendation}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-amber-100/70">
          {t('publish_audit.manual_hint')}
        </p>
        <button
          type="button"
          onClick={onRepair}
          disabled={repairing}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition-opacity disabled:opacity-60"
        >
          {repairing ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {repairing ? t('publish_audit.repairing') : t('publish_audit.repair')}
        </button>
      </div>
    </section>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-zinc-200">{label}</span>
      {help ? <span className="-mt-1 text-xs text-zinc-500">{help}</span> : null}
      {children}
    </label>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24 bg-white/5" />
          <Skeleton className="h-10 w-full bg-white/5" />
        </div>
      ))}
    </div>
  );
}

function FormatStyleSelect<T extends string>({
  label,
  value,
  options,
  optionLabel,
  disabled,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  optionLabel: (value: T) => string;
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-zinc-300">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none disabled:opacity-70"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function tagLabel(tag: TagItem, locale: string) {
  // Locale-aware label. We trust the next-intl runtime locale (driven by the
  // URL prefix `/zh/...` or `/en/...`) instead of `navigator.language`, so a
  // user reading the EN site on a zh-CN browser still sees English chips.
  if (/^zh\b/i.test(locale)) {
    return tag.labelZh || tag.labelEn || tag.slug;
  }
  return tag.labelEn || tag.labelZh || tag.slug;
}

function normaliseGender(input?: string): GenderOption {
  const lc = (input || '').toLowerCase();
  if (lc === 'male') return 'male';
  if (lc === 'female') return 'female';
  return 'non-binary';
}
