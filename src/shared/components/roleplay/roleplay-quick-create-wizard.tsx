'use client';

import {
  ArrowLeft,
  Check,
  ChevronRight,
  Home,
  Loader2,
  MessageCircle,
  Pencil,
  RefreshCw,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  QUICK_TRAITS,
  ROLEPLAY_QUICK_CREATE_TEMPLATES,
  type QuickCreateTemplate,
} from '@/data/roleplay-quick-create-templates';
import { useRouter } from '@/core/i18n/navigation';
import type { AiWriterDraft } from '@/shared/components/roleplay/ai-writer-dialog';
import { showRoleplayApiErrorToast } from '@/shared/components/roleplay/roleplay-billing-toast';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  createRoleplayApiError,
  createRoleplayRequestId,
} from '@/shared/lib/roleplay-ai';
import { cn } from '@/shared/lib/utils';

type QuickStep = 'template' | 'traits' | 'relationship' | 'memory' | 'preview';
type GenderOption = 'male' | 'female' | 'non-binary';
type VisibilityOption = 'private' | 'public';

type QuickCreateState = {
  step: QuickStep;
  templateId: string;
  customScene: string;
  gender?: GenderOption;
  userRole: string;
  customUserRole: string;
  traits: string[];
  customTrait: string;
  relationship: string;
  customRelationship: string;
  openingHook: string;
  customOpeningHook: string;
  keyMemory: string;
  customInstruction: string;
  avatarUrl: string;
  gallery: string[];
  imagePrompt: string;
  draft?: AiWriterDraft;
  savedCharacterId?: string;
  saving: boolean;
  generating: boolean;
  uploadingImage: boolean;
  generatingImage: boolean;
  publishing: VisibilityOption | null;
};

const QUICK_STEPS: QuickStep[] = [
  'template',
  'traits',
  'relationship',
  'memory',
  'preview',
];

const TEMPLATE_GROUPS = [
  {
    id: 'romance',
    categories: ['romance'],
  },
  {
    id: 'workplace',
    categories: ['workplace'],
  },
  {
    id: 'daily',
    categories: ['daily'],
  },
  {
    id: 'fantasy',
    categories: ['fantasy', 'adventure'],
  },
] as const;

const MEMORY_CHIPS = [
  {
    zh: '我曾经救过 TA 一次。',
    en: 'I once saved them.',
  },
  {
    zh: '我们小时候有一个约定。',
    en: 'We made a promise when we were younger.',
  },
  {
    zh: 'TA 欠我一个解释。',
    en: 'They owe me an explanation.',
  },
  {
    zh: '我们一起经历过一次失败任务。',
    en: 'We went through a failed mission together.',
  },
  {
    zh: 'TA 还留着我送过的东西。',
    en: 'They still keep something I gave them.',
  },
];

const EN_LABELS: Record<string, string> = {
  嘴硬心软: 'Sharp-tongued, soft-hearted',
  慢热克制: 'Slow-burn restraint',
  温柔但有边界: 'Warm with boundaries',
  占有欲强: 'Possessive streak',
  毒舌但可靠: 'Cutting but reliable',
  爱捉弄人: 'Playfully teasing',
  保护欲强: 'Protective',
  喜欢试探: 'Testing the waters',
  神秘疏离: 'Mysteriously distant',
  破碎感: 'Quietly wounded',
  情绪稳定: 'Emotionally steady',
  危险迷人: 'Dangerously charming',
  背负秘密: 'Carrying a secret',
  渴望被理解: 'Longing to be understood',
  不轻易示弱: 'Rarely vulnerable',
  规则感强: 'Rule-bound',
  冷静强势: 'Cool and forceful',
  高标准: 'High standards',
  保护欲隐晦: 'Quietly protective',
  说话克制: 'Restrained speaker',
  仍然在意: 'Still cares',
  同学: 'Classmate',
  同事: 'Coworker',
  朋友的朋友: 'Friend of a friend',
  常见面的邻居: 'Neighbor you often see',
  若即若离的熟人: 'A familiar almost-something',
  暗恋对象: 'Crush',
  前任: 'Ex',
  上级: 'Boss',
  '上级/老板': 'Boss or manager',
  恋人: 'Lover',
  合租室友: 'Roommate',
  多年好友: 'Longtime friend',
  相亲对象: 'Blind date',
  项目搭档: 'Project partner',
  常见面的陌生人: 'Familiar stranger',
  陪伴者: 'Companion',
  旧搭档: 'Former partner',
  '高年级学长/学姐': 'Senior student',
  队医: 'Medic',
  谋士: 'Strategist',
  被分手的一方: 'The one who was left',
  提出分手的一方: 'The one who ended it',
  偶然重逢的一方: 'The one who ran into them again',
  分手后重逢: 'Reunited after breakup',
  偶遇: 'Chance encounter',
  取回旧物: 'Returning old belongings',
  共同朋友聚会: 'Mutual friends gathering',
  深夜消息: 'Late-night message',
  新人下属: 'New direct report',
  项目成员: 'Project member',
  临时助理: 'Temporary assistant',
  被点名救火的人: 'The person pulled into an emergency',
  上下级关系: 'Manager and report',
  新员工与直属上级: 'New hire and direct manager',
  项目负责人和成员: 'Project lead and member',
  同居恋人: 'Live-in lover',
  异地恋人: 'Long-distance lover',
  纪念日误会的一方: 'One side of an anniversary misunderstanding',
  没说清楚的一方: 'The one who left things unsaid',
  冷战中的恋人: 'Lovers in a cold war',
  同居冷战: 'Cold war while living together',
  异地冷战: 'Long-distance cold war',
  纪念日误会: 'Anniversary misunderstanding',
  一次没说清的争吵: 'An argument left unresolved',
  临时合租者: 'Temporary roommate',
  熟人合租: 'Rooming with someone familiar',
  被迫共住的人: 'Forced to share a place',
  新搬来的室友: 'Newly moved-in roommate',
  合租关系: 'Roommates',
  临时合租: 'Temporary roommates',
  被迫共住: 'Forced to live together',
  刚搬进来: 'Just moved in',
  刚被朋友起哄的人: 'The one friends teased',
  '被 TA 照顾过的人': 'Someone they once cared for',
  生日主角: 'Birthday person',
  生日之后: 'After a birthday',
  酒后消息: 'Message after drinks',
  一次照顾: 'After one moment of care',
  朋友起哄: 'Friends teasing you both',
  被家人安排的人: 'Set up by family',
  朋友介绍的一方: 'Introduced by a friend',
  临时替人赴约的人: 'Filling in for someone',
  第一次相亲: 'First blind date',
  家人安排: 'Family arrangement',
  朋友介绍: 'Friend introduction',
  临时替人赴约: 'Filling in for someone',
  第二次见面: 'Second meeting',
  职场项目成员: 'Work project member',
  比赛队友: 'Competition teammate',
  创业搭档: 'Startup partner',
  小组任务同伴: 'Group project partner',
  被迫合作: 'Forced to cooperate',
  职场项目: 'Work project',
  比赛搭档: 'Competition partner',
  创业合伙: 'Startup cofounder',
  小组任务: 'Group project',
  同楼住户: 'Same-building resident',
  咖啡店常客: 'Cafe regular',
  夜跑时常遇见的人: 'Someone from your night run',
  便利店熟面孔: 'Familiar face at the convenience store',
  熟悉的陌生人: 'Familiar stranger',
  电梯偶遇: 'Elevator encounter',
  便利店常客: 'Convenience store regular',
  咖啡店排队: 'Cafe queue',
  夜跑路线: 'Night running route',
  朋友: 'Friend',
  前同事: 'Former coworker',
  夜班店员的熟客: 'Regular of the night-shift clerk',
  酒吧常客: 'Bar regular',
  低谷期陪伴: 'Companion during a low point',
  朋友留下: 'A friend staying',
  前同事重逢: 'Reunion with a former coworker',
  酒吧吧台: 'At the bar counter',
  夜班便利店: 'Night-shift convenience store',
  前线黑客: 'Field hacker',
  情报贩子: 'Information broker',
  任务幸存者: 'Mission survivor',
  旧任务搭档: 'Former mission partner',
  重启任务: 'Restarting a mission',
  黑市重逢: 'Black-market reunion',
  雨夜救援: 'Rainy-night rescue',
  失败任务幸存者: 'Survivor of a failed mission',
  新生: 'New student',
  被处分的学生: 'Disciplined student',
  天赋失控的人: 'Student with unstable talent',
  禁区闯入者: 'Restricted-area intruder',
  学院里的前后辈: 'Senior and junior at the academy',
  夜巡撞见: 'Caught during night patrol',
  禁书区相遇: 'Meeting in the forbidden stacks',
  考试前辅导: 'Pre-exam tutoring',
  魔力失控后: 'After magic went out of control',
  巡逻队员: 'Patrol member',
  新来的幸存者: 'New survivor',
  资源搜寻者: 'Supply scavenger',
  避难所老成员: 'Longtime shelter member',
  避难所同伴: 'Shelter companion',
  巡逻归来: 'Returning from patrol',
  医务室治疗: 'In the infirmary',
  资源争执后: 'After a supply dispute',
  新进避难所: 'New to the shelter',
  被卷入局中的人: 'Someone pulled into the scheme',
  年轻主君: 'Young ruler',
  旧日故人: 'Old acquaintance',
  同盟者: 'Ally',
  同盟与试探: 'Alliance and testing',
  夜半密谈: 'Midnight secret talk',
  朝堂退场后: 'After court adjourns',
  旧案重启: 'Old case reopened',
  被迫结盟: 'Forced alliance',
  '两个人都在试探，但谁先认真谁就先输。':
    'Both are testing the waters, and whoever gets serious first feels exposed.',
  '你觉得 TA 太冷酷，TA 觉得你还没看见真正的问题。':
    'You think they are too cold; they think you have not seen the real problem yet.',
  '两个人都没有完全放下，但都害怕先承认在意。':
    'Neither of you has fully moved on, but both are afraid to admit you still care.',
  '彼此都想修复关系，却都怕承认自己先受伤。':
    'Both want to repair things, but neither wants to admit they were hurt first.',
  '越是生活在一起，越不知道该把彼此放在什么位置。':
    'The more you share a home, the harder it is to name what you are to each other.',
  '熟悉让靠近变得自然，也让开口变得危险。':
    'Familiarity makes closeness easy and honesty risky.',
  '两个人都不想被安排，却意外开始认真听对方说话。':
    'Neither wants to be arranged, yet both start listening for real.',
  '你们方法相反，却都想把事情做好。':
    'Your methods clash, but both of you want the work to succeed.',
  '你们已经记住彼此，却还没有真正认识。':
    'You already remember each other, but still have not truly met.',
  'TA 不知道怎么拯救你，也不打算用大道理打发你。':
    'They do not know how to fix your life, and will not dismiss you with platitudes.',
};

function l10n(value: string, isZh: boolean, fallback?: string) {
  return isZh ? value : EN_LABELS[value] || fallback || value;
}

function l10nList(values: string[], isZh: boolean) {
  return values.map((value) => l10n(value, isZh));
}

function renderOpeningHookForPrompt({
  hook,
  isZh,
  template,
}: {
  hook: string;
  isZh: boolean;
  template: QuickCreateTemplate;
}) {
  if (isZh) return hook;
  if (!template.openingHooks.includes(hook)) return hook;
  const index = template.openingHooks.indexOf(hook) + 1;
  return `Use the selected template opening hook ${index} as inspiration without copying any Chinese wording.`;
}

const TUNING_OPTIONS = [
  {
    id: 'cooler',
    labelKey: 'tuning.cooler',
    instruction: 'Make the character more restrained, cool, and concise.',
  },
  {
    id: 'warmer',
    labelKey: 'tuning.warmer',
    instruction: 'Make the character warmer, more considerate, but still bounded.',
  },
  {
    id: 'sharper',
    labelKey: 'tuning.sharper',
    instruction: 'Make the character wittier and sharper, without cruelty.',
  },
  {
    id: 'mysterious',
    labelKey: 'tuning.mysterious',
    instruction: 'Add more secrecy and subtext; do not explain everything.',
  },
  {
    id: 'closer',
    labelKey: 'tuning.closer',
    instruction: 'Slightly increase intimacy while keeping consent and pacing.',
  },
  {
    id: 'less_action',
    labelKey: 'tuning.less_action',
    instruction: 'Use shorter action beats and more natural dialogue.',
  },
  {
    id: 'new_opening',
    labelKey: 'tuning.new_opening',
    instruction: 'Keep the same character, but create a different opening hook.',
  },
] as const;

const firstTemplate = ROLEPLAY_QUICK_CREATE_TEMPLATES[0];

function uniqueUrls(urls: string[]) {
  return Array.from(new Set(urls.filter(Boolean)));
}

function syncAvatarFromGallery(gallery: string[]) {
  const nextGallery = uniqueUrls(gallery);
  return {
    gallery: nextGallery,
    avatarUrl: nextGallery[0] || '',
  };
}

function mergeDraftGallery(draft: AiWriterDraft | undefined, gallery: string[]) {
  if (!draft) return undefined;
  const nextGallery = uniqueUrls([
    ...gallery,
    ...(draft.gallery || []),
    draft.avatar || '',
  ]);
  return {
    ...draft,
    avatar: nextGallery[0] || draft.avatar || '',
    gallery: nextGallery,
  };
}

function buildInitialState(): QuickCreateState {
  return {
    step: 'template',
    templateId: firstTemplate.id,
    customScene: '',
    gender: firstTemplate.defaultGender,
    userRole: firstTemplate.userRoleOptions[0] || '',
    customUserRole: '',
    traits: firstTemplate.suggestedTraits.slice(0, 3),
    customTrait: '',
    relationship: firstTemplate.defaultRelationship,
    customRelationship: '',
    openingHook: firstTemplate.openingHooks[0] || '',
    customOpeningHook: '',
    keyMemory: '',
    customInstruction: '',
    avatarUrl: '',
    gallery: [],
    imagePrompt: '',
    saving: false,
    generating: false,
    uploadingImage: false,
    generatingImage: false,
    publishing: null,
  };
}

export function RoleplayQuickCreateWizard() {
  const t = useTranslations('roleplay.create.quick_create');
  const locale = useLocale();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<QuickCreateState>(buildInitialState);
  const [activeGroup, setActiveGroup] = useState<string>('romance');

  const isZh = locale.startsWith('zh');
  const template = useMemo(
    () =>
      ROLEPLAY_QUICK_CREATE_TEMPLATES.find((item) => item.id === state.templateId) ??
      firstTemplate,
    [state.templateId]
  );
  const stepIndex = QUICK_STEPS.indexOf(state.step);

  const updateState = useCallback(
    (patch: Partial<QuickCreateState>) =>
      setState((prev) => ({ ...prev, ...patch })),
    []
  );

  const selectTemplate = useCallback((next: QuickCreateTemplate) => {
    setState((prev) => ({
      ...prev,
      templateId: next.id,
      customScene: '',
      gender: next.defaultGender,
      userRole: next.userRoleOptions[0] || '',
      customUserRole: '',
      traits: next.suggestedTraits.slice(0, 3),
      customTrait: '',
      relationship: next.defaultRelationship,
      customRelationship: '',
      openingHook: next.openingHooks[0] || '',
      customOpeningHook: '',
      avatarUrl: '',
      gallery: [],
      imagePrompt: '',
      draft: undefined,
      savedCharacterId: undefined,
    }));
  }, []);

  const goStep = useCallback(
    (offset: 1 | -1) => {
      const next = QUICK_STEPS[Math.min(Math.max(stepIndex + offset, 0), QUICK_STEPS.length - 1)];
      updateState({ step: next });
    },
    [stepIndex, updateState]
  );

  const toggleTrait = useCallback((trait: string) => {
    setState((prev) => {
      const exists = prev.traits.includes(trait);
      if (exists) {
        return { ...prev, traits: prev.traits.filter((item) => item !== trait) };
      }
      if (prev.traits.length >= 3) {
        return { ...prev, traits: [...prev.traits.slice(1), trait] };
      }
      return { ...prev, traits: [...prev.traits, trait] };
    });
  }, []);

  const uploadImages = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      updateState({ uploadingImage: true });
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
        setState((prev) => {
          const nextSync = syncAvatarFromGallery([...prev.gallery, ...urls]);
          return {
            ...prev,
            ...nextSync,
            draft: mergeDraftGallery(prev.draft, nextSync.gallery),
          };
        });
        toast.success(t('image_uploaded'));
      } catch (error: any) {
        toast.error(error?.message || t('image_upload_error'));
      } finally {
        updateState({ uploadingImage: false });
      }
    },
    [t, updateState]
  );

  const generateAvatar = useCallback(async () => {
    updateState({ generatingImage: true });
    try {
      const localizedTraits = l10nList(state.traits, isZh);
      const prompt = [
        state.imagePrompt,
        isZh ? template.titleZh : template.titleEn,
        isZh ? template.summaryZh : template.summaryEn,
        localizedTraits.length
          ? `Core traits: ${localizedTraits.join(', ')}`
          : '',
        state.relationship
          ? `Relationship start: ${l10n(state.relationship, isZh)}`
          : '',
        template.visualStyleHint,
      ]
        .filter(Boolean)
        .join('\n');
      const referenceImage = state.gallery[0] || '';
      const res = await fetch('/api/roleplay/image', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt,
          characterStyle: template.visualStyleHint,
          imageStyleSuffix: template.visualStyleHint,
          characterAvatar: referenceImage || undefined,
          requestId: createRoleplayRequestId('rp-image'),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || (payload?.code && payload.code !== 0)) {
        throw createRoleplayApiError(payload, t('image_generate_error'));
      }
      const url = payload?.data?.url;
      if (!url) throw new Error(t('image_generate_error'));
      setState((prev) => {
        const nextSync = syncAvatarFromGallery([...prev.gallery, url]);
        return {
          ...prev,
          ...nextSync,
          draft: mergeDraftGallery(prev.draft, nextSync.gallery),
        };
      });
      toast.success(t('image_generated'));
    } catch (error: any) {
      showRoleplayApiErrorToast(error, t('image_generate_error'));
    } finally {
      updateState({ generatingImage: false });
    }
  }, [isZh, state.gallery, state.imagePrompt, state.relationship, state.traits, t, template, updateState]);

  const saveDraft = useCallback(
    async (draft: AiWriterDraft, id?: string) => {
      const gallery = uniqueUrls([
        ...state.gallery,
        ...(draft.gallery || []),
        draft.avatar || '',
      ]);
      const avatar = gallery[0] || '';
      const body = {
        name: draft.name,
        gender: draft.gender,
        tagline: draft.tagline || '',
        intro: draft.intro,
        opening: draft.opening,
        settings: draft.settings,
        tagSlugs: template.tagSlugs,
        avatar,
        cover: avatar,
        gallery,
        personalityCard: draft.personalityCard || {},
        imageStyleSuffix: draft.imageStyleSuffix || '',
        voicePreset: draft.voicePreset || '',
        styleExamples: draft.styleExamples || [],
        formatStyle: draft.formatStyle || {},
        status: 'draft',
        visibility: 'private',
      };
      const res = await fetch(
        id ? `/api/roleplay/characters/${id}` : '/api/roleplay/characters',
        {
          method: id ? 'PATCH' : 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || (payload?.code && payload.code !== 0)) {
        throw new Error(payload?.message || 'save failed');
      }
      return payload?.data?.character?.id as string;
    },
    [state.gallery, template.tagSlugs]
  );

  const generateDraft = useCallback(
    async (tuningInstruction?: string) => {
      if (!state.traits.length) {
        toast.error(t('trait_required'));
        return;
      }
      updateState({ generating: true, saving: true });
      try {
        const localizedTraits = l10nList(state.traits, isZh);
        const customInstruction = [
          state.customScene
            ? `User custom scene / premise: ${state.customScene}`
            : '',
          state.customInstruction,
          tuningInstruction,
        ]
          .filter(Boolean)
          .join('\n');
        const res = await fetch('/api/roleplay/ai-writer', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            mode: 'quick_create',
            requestId: createRoleplayRequestId('rp-ai-writer'),
            gender: state.gender || template.defaultGender || 'non-binary',
            language: isZh ? 'zh' : 'en',
            hint: `${isZh ? template.titleZh : template.titleEn}: ${localizedTraits.join(' / ')}`,
            quickCreate: {
              templateId: template.id,
              templateTitle: isZh ? template.titleZh : template.titleEn,
              category: template.category,
              world: isZh
                ? template.world
                : `${template.titleEn}. ${template.summaryEn}`,
              sceneConflict: l10n(template.sceneConflict, isZh, template.summaryEn),
              characterRole: l10n(template.characterRole, isZh),
              userRole: l10n(state.userRole, isZh),
              relationshipPreset: l10n(state.relationship, isZh),
              openingHook: renderOpeningHookForPrompt({
                hook: state.openingHook,
                isZh,
                template,
              }),
              coreTraits: localizedTraits,
              defaultTension: l10n(
                template.defaultTension,
                isZh,
                'They want closeness but hesitate because the relationship has unresolved tension.'
              ),
              keyMemory: state.keyMemory,
              memorySeeds: isZh
                ? template.memorySeeds
                : [
                    'They remember one small user preference.',
                    'There is one unresolved moment between them.',
                  ],
              safetyBoundary: isZh
                ? template.safetyBoundary
                : 'Keep the relationship bounded, consensual, realistic, and unresolved at the start.',
              visualStyleHint: template.visualStyleHint,
              voiceTone: template.voiceTone,
              customInstruction: customInstruction || undefined,
              emotionalHookPreset: template.emotionalHookPreset,
            },
          }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || (payload?.code && payload.code !== 0)) {
          throw createRoleplayApiError(payload, t('generate_error'));
        }
        const draft = payload?.data?.draft as AiWriterDraft | undefined;
        if (!draft) throw new Error(t('generate_error'));
        const hasUserImages = state.gallery.length > 0;
        const mergedGallery = hasUserImages
          ? uniqueUrls(state.gallery)
          : uniqueUrls([
              ...state.gallery,
              ...(draft.gallery || []),
              draft.avatar || '',
            ]);
        const mergedDraft: AiWriterDraft = {
          ...draft,
          avatar: hasUserImages ? state.gallery[0] || '' : mergedGallery[0] || draft.avatar || '',
          gallery: mergedGallery,
        };
        const id = await saveDraft(mergedDraft, state.savedCharacterId);
        const card = mergedDraft.personalityCard || {};
        const p4Missing =
          !card.memoryCallbackStyle ||
          !card.metaphorDomain ||
          !card.trustMilestones ||
          card.trustMilestones.length < 3;
        if (p4Missing) {
          console.warn('quick_create_p4_missing_fields', {
            templateId: template.id,
            characterId: id,
          });
        }
        setState((prev) => ({
          ...prev,
          ...syncAvatarFromGallery(mergedGallery),
          step: 'preview',
          draft: mergedDraft,
          savedCharacterId: id,
          customInstruction,
          generating: false,
          saving: false,
        }));
        toast.success(t('draft_saved'));
      } catch (error: any) {
        showRoleplayApiErrorToast(error, t('generate_error'));
        updateState({ generating: false, saving: false });
      }
    },
    [isZh, saveDraft, state, t, template, updateState]
  );

  const publish = useCallback(
    async (visibility: VisibilityOption) => {
      const id = state.savedCharacterId;
      if (!id) return;
      updateState({ publishing: visibility });
      try {
        const res = await fetch(`/api/roleplay/characters/${id}/publish`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            visibility,
            requestId: createRoleplayRequestId('rp-publish'),
          }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || (payload?.code && payload.code !== 0)) {
          throw createRoleplayApiError(payload, 'publish failed');
        }
        if (payload?.data?.blocked) {
          toast.error(t('audit_blocked'));
          return;
        }
        if (visibility === 'private') {
          router.push(`/chat/profile/${id}`);
        } else {
          router.push('/create?tab=under_review');
        }
      } catch (error: any) {
        showRoleplayApiErrorToast(error, 'publish failed');
      } finally {
        updateState({ publishing: null });
      }
    },
    [router, state.savedCharacterId, t, updateState]
  );

  return (
    <main className="min-h-dvh bg-[#0d0d10] pb-[calc(env(safe-area-inset-bottom)+28px)] text-white">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0d0d10]/85 backdrop-blur supports-[backdrop-filter]:bg-[#0d0d10]/70">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 md:px-6">
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
          >
            <Home className="size-4" />
            <span className="hidden sm:inline">{t('home')}</span>
          </button>
          <div className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
            <Sparkles className="size-3.5 text-amber-300" />
            {t('badge')}
          </div>
        </div>
      </header>
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

      <section className="mx-auto grid max-w-6xl gap-5 px-4 pt-5 md:grid-cols-[280px_minmax(0,1fr)] md:px-6 md:pt-8">
        <aside className="h-fit rounded-[18px] border border-white/10 bg-[#15151b] p-4">
          <p className="text-xs uppercase text-zinc-500">{t('title')}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {t('headline')}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {t('subtitle')}
          </p>
          <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs leading-relaxed text-zinc-300">
            {t('required_hint')}
          </p>
          <ol className="mt-5 flex flex-col gap-2">
            {QUICK_STEPS.map((step, index) => (
              <li
                key={step}
                data-active={state.step === step}
                data-complete={index < stepIndex}
                className={cn(
                  'flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 text-sm text-zinc-500',
                  'data-[active=true]:border-white/10 data-[active=true]:bg-white/5 data-[active=true]:text-white',
                  'data-[complete=true]:text-zinc-300'
                )}
              >
                <span className="grid size-6 place-items-center rounded-full bg-white/5 text-xs">
                  {index < stepIndex ? <Check className="size-3.5" /> : index + 1}
                </span>
                {t(`steps.${step}`)}
              </li>
            ))}
          </ol>
        </aside>

        <div className="min-w-0 rounded-[18px] border border-white/10 bg-[#15151b]">
          <div className="border-b border-white/5 px-4 py-4 md:px-5">
            <p className="text-xs text-zinc-500">
              {t('step_count', { current: stepIndex + 1, total: QUICK_STEPS.length })}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
              {t(`${state.step}_title`)}
            </h2>
          </div>

          <div className="p-4 md:p-5">
            {state.step === 'template' ? (
              <TemplateStep
                activeGroup={activeGroup}
                customScene={state.customScene}
                isZh={isZh}
                selectedId={template.id}
                onGroupChange={setActiveGroup}
                onSelect={selectTemplate}
                onCustomSceneChange={(customScene) =>
                  updateState({ customScene })
                }
              />
            ) : state.step === 'traits' ? (
              <TraitsStep
                isZh={isZh}
                traits={state.traits}
                customTrait={state.customTrait}
                template={template}
                onToggle={toggleTrait}
                onCustomTraitChange={(customTrait) =>
                  updateState({ customTrait })
                }
                onAddCustomTrait={() => {
                  const trait = state.customTrait.trim();
                  if (!trait) return;
                  setState((prev) => ({
                    ...prev,
                    customTrait: '',
                    traits: prev.traits.includes(trait)
                      ? prev.traits
                      : [...prev.traits.slice(Math.max(prev.traits.length - 2, 0)), trait],
                  }));
                }}
              />
            ) : state.step === 'relationship' ? (
              <RelationshipStep
                isZh={isZh}
                gender={state.gender || 'non-binary'}
                relationship={state.relationship}
                customRelationship={state.customRelationship}
                userRole={state.userRole}
                customUserRole={state.customUserRole}
                openingHook={state.openingHook}
                customOpeningHook={state.customOpeningHook}
                template={template}
                onUpdate={updateState}
              />
            ) : state.step === 'memory' ? (
              <MemoryStep
                avatarUrl={state.avatarUrl}
                gallery={state.gallery}
                generatingImage={state.generatingImage}
                imagePrompt={state.imagePrompt}
                keyMemory={state.keyMemory}
                customInstruction={state.customInstruction}
                uploadingImage={state.uploadingImage}
                onGenerateImage={generateAvatar}
                onPickImage={() => fileInputRef.current?.click()}
                onUpdate={updateState}
              />
            ) : (
              <PreviewStep
                avatarUrl={state.avatarUrl}
                gallery={state.gallery}
                isZh={isZh}
                draft={state.draft}
                template={template}
                traits={l10nList(state.traits, isZh)}
                relationship={l10n(state.relationship, isZh)}
                savedCharacterId={state.savedCharacterId}
                publishing={state.publishing}
                generating={state.generating}
                onTune={(instruction) => generateDraft(instruction)}
                onPublish={publish}
                onEdit={() =>
                  state.savedCharacterId &&
                  router.push(`/create/edit/${state.savedCharacterId}`)
                }
                onChat={() =>
                  state.savedCharacterId &&
                  router.push(`/chat/profile/${state.savedCharacterId}`)
                }
                generatingImage={state.generatingImage}
                uploadingImage={state.uploadingImage}
                onGenerateImage={generateAvatar}
                onPickImage={() => fileInputRef.current?.click()}
              />
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-white/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
            <button
              type="button"
              onClick={() => goStep(-1)}
              disabled={stepIndex === 0 || state.generating || state.saving}
              className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 disabled:opacity-40"
            >
              {t('previous')}
            </button>
            {state.step === 'memory' ? (
              <button
                type="button"
                onClick={() => generateDraft()}
                disabled={state.generating || state.saving}
                className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                style={{ background: 'var(--roleplay-brand-gradient)' }}
              >
                {state.generating || state.saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {state.generating ? t('generating') : t('generate')}
              </button>
            ) : state.step === 'preview' ? (
              <button
                type="button"
                onClick={() => updateState({ step: 'memory' })}
                disabled={state.generating || state.saving}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 disabled:opacity-40"
              >
                <Pencil className="size-4" />
                {t('adjust_inputs')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goStep(1)}
                disabled={state.generating || state.saving}
                className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                style={{ background: 'var(--roleplay-brand-gradient)' }}
              >
                {t('next')}
                <ChevronRight className="size-4" />
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function TemplateStep({
  activeGroup,
  customScene,
  selectedId,
  isZh,
  onGroupChange,
  onCustomSceneChange,
  onSelect,
}: {
  activeGroup: string;
  customScene: string;
  selectedId: string;
  isZh: boolean;
  onGroupChange: (group: string) => void;
  onCustomSceneChange: (value: string) => void;
  onSelect: (template: QuickCreateTemplate) => void;
}) {
  const t = useTranslations('roleplay.create.quick_create');
  const group = TEMPLATE_GROUPS.find((item) => item.id === activeGroup) ?? TEMPLATE_GROUPS[0];
  const templates = ROLEPLAY_QUICK_CREATE_TEMPLATES.filter((item) =>
    (group.categories as readonly string[]).includes(item.category)
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TEMPLATE_GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onGroupChange(item.id)}
            data-active={activeGroup === item.id}
            className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors data-[active=true]:border-white data-[active=true]:bg-white data-[active=true]:text-black"
          >
            {t(`groups.${item.id}`)}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            data-active={selectedId === item.id}
            className={cn(
              'min-h-48 rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition-colors hover:bg-white/[0.07]',
              'data-[active=true]:border-white/60 data-[active=true]:bg-white/10'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">
                  {isZh ? item.titleZh : item.titleEn}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-400">
                  {isZh ? item.summaryZh : item.summaryEn}
                </p>
              </div>
              {selectedId === item.id ? (
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-black">
                  <Check className="size-4" />
                </span>
              ) : null}
            </div>
            <p className="mt-4 line-clamp-2 text-sm text-zinc-300">
              {l10n(item.sceneConflict, isZh, item.summaryEn)}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {item.suggestedTraits.slice(0, 3).map((trait) => (
                <span
                  key={trait}
                  className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-zinc-300"
                >
                  {l10n(trait, isZh)}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-2 rounded-2xl bg-black/20 p-3">
        <span className="text-sm font-medium text-zinc-200">
          {t('custom_scene_label')}
        </span>
        <Input
          value={customScene}
          onChange={(event) => onCustomSceneChange(event.target.value)}
          placeholder={t('custom_scene_placeholder')}
          className="border-white/10 bg-black/40 text-zinc-100 placeholder:text-zinc-500"
        />
      </label>
    </div>
  );
}

function TraitsStep({
  isZh,
  template,
  traits,
  customTrait,
  onAddCustomTrait,
  onCustomTraitChange,
  onToggle,
}: {
  isZh: boolean;
  template: QuickCreateTemplate;
  traits: string[];
  customTrait: string;
  onAddCustomTrait: () => void;
  onCustomTraitChange: (value: string) => void;
  onToggle: (trait: string) => void;
}) {
  const t = useTranslations('roleplay.create.quick_create');
  const pool = Array.from(new Set([...template.suggestedTraits, ...QUICK_TRAITS]));
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-400">{t('traits_hint')}</p>
      <div className="flex flex-wrap gap-2">
        {pool.map((trait) => (
          <button
            key={trait}
            type="button"
            onClick={() => onToggle(trait)}
            data-active={traits.includes(trait)}
            className="rounded-full border border-white/10 px-3 py-2 text-sm text-zinc-300 transition-colors data-[active=true]:border-white data-[active=true]:bg-white data-[active=true]:text-black"
          >
            {l10n(trait, isZh)}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 rounded-2xl bg-black/20 p-3 sm:flex-row">
        <Input
          value={customTrait}
          onChange={(event) => onCustomTraitChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onAddCustomTrait();
            }
          }}
          placeholder={t('custom_trait_placeholder')}
          className="border-white/10 bg-black/40 text-zinc-100 placeholder:text-zinc-500"
        />
        <button
          type="button"
          onClick={onAddCustomTrait}
          className="shrink-0 rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/5"
        >
          {t('add_custom')}
        </button>
      </div>
      <div className="rounded-2xl bg-black/20 p-3 text-sm text-zinc-300">
        {t('selected_traits')}:{' '}
        {traits.length ? l10nList(traits, isZh).join(' / ') : t('no_traits')}
      </div>
    </div>
  );
}

function RelationshipStep({
  isZh,
  template,
  gender,
  relationship,
  customRelationship,
  userRole,
  customUserRole,
  openingHook,
  customOpeningHook,
  onUpdate,
}: {
  isZh: boolean;
  template: QuickCreateTemplate;
  gender: GenderOption;
  relationship: string;
  customRelationship: string;
  userRole: string;
  customUserRole: string;
  openingHook: string;
  customOpeningHook: string;
  onUpdate: (patch: Partial<QuickCreateState>) => void;
}) {
  const t = useTranslations('roleplay.create');
  const qt = useTranslations('roleplay.create.quick_create');
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SectionBlock title={qt('user_role_title')}>
        <div className="grid gap-2">
          {template.userRoleOptions.map((option) => (
            <ChoiceButton
              key={option}
              active={userRole === option}
              onClick={() => onUpdate({ userRole: option })}
            >
              {l10n(option, isZh)}
            </ChoiceButton>
          ))}
          <InlineCustomChoice
            value={customUserRole}
            placeholder={qt('custom_user_role_placeholder')}
            onChange={(value) => onUpdate({ customUserRole: value })}
            onAdd={() => {
              const value = customUserRole.trim();
              if (value) onUpdate({ userRole: value, customUserRole: '' });
            }}
          />
        </div>
      </SectionBlock>
      <SectionBlock title={qt('relationship_start_title')}>
        <div className="grid gap-2">
          {template.relationshipOptions.map((option) => (
            <ChoiceButton
              key={option}
              active={relationship === option}
              onClick={() => onUpdate({ relationship: option })}
            >
              {l10n(option, isZh)}
            </ChoiceButton>
          ))}
          <InlineCustomChoice
            value={customRelationship}
            placeholder={qt('custom_relationship_placeholder')}
            onChange={(value) => onUpdate({ customRelationship: value })}
            onAdd={() => {
              const value = customRelationship.trim();
              if (value) {
                onUpdate({ relationship: value, customRelationship: '' });
              }
            }}
          />
        </div>
      </SectionBlock>
      <SectionBlock title={t('gender')}>
        <div className="flex flex-wrap gap-2">
          {(['male', 'female', 'non-binary'] as GenderOption[]).map((item) => (
            <ChoiceButton
              key={item}
              active={gender === item}
              onClick={() => onUpdate({ gender: item })}
            >
              {t(`gender_options.${item}`)}
            </ChoiceButton>
          ))}
        </div>
      </SectionBlock>
      <SectionBlock title={qt('opening_hook_title')}>
        <div className="grid gap-2">
          {template.openingHooks.map((hook, index) => (
            <ChoiceButton
              key={hook}
              active={openingHook === hook}
              onClick={() => onUpdate({ openingHook: hook })}
            >
              {isZh ? hook : qt('opening_hook_option', { index: index + 1 })}
            </ChoiceButton>
          ))}
          <InlineCustomChoice
            value={customOpeningHook}
            placeholder={qt('custom_opening_hook_placeholder')}
            onChange={(value) => onUpdate({ customOpeningHook: value })}
            onAdd={() => {
              const value = customOpeningHook.trim();
              if (value) {
                onUpdate({ openingHook: value, customOpeningHook: '' });
              }
            }}
          />
        </div>
      </SectionBlock>
    </div>
  );
}

function MemoryStep({
  avatarUrl,
  gallery,
  generatingImage,
  imagePrompt,
  keyMemory,
  customInstruction,
  uploadingImage,
  onGenerateImage,
  onPickImage,
  onUpdate,
}: {
  avatarUrl: string;
  gallery: string[];
  generatingImage: boolean;
  imagePrompt: string;
  keyMemory: string;
  customInstruction: string;
  uploadingImage: boolean;
  onGenerateImage: () => void;
  onPickImage: () => void;
  onUpdate: (patch: Partial<QuickCreateState>) => void;
}) {
  const t = useTranslations('roleplay.create.quick_create');
  const locale = useLocale();
  const isZh = locale.startsWith('zh');
  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-200">{t('memory_label')}</span>
        <Textarea
          value={keyMemory}
          onChange={(event) => onUpdate({ keyMemory: event.target.value })}
          placeholder={t('memory_placeholder')}
          className="min-h-24 border-white/10 bg-black/40 text-zinc-100 placeholder:text-zinc-500"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {MEMORY_CHIPS.map((chip) => (
          <button
            key={chip.zh}
            type="button"
            onClick={() => onUpdate({ keyMemory: isZh ? chip.zh : chip.en })}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/5"
          >
            {isZh ? chip.zh : chip.en}
          </button>
        ))}
      </div>
      <section className="grid gap-3 rounded-2xl bg-black/20 p-3 sm:grid-cols-[120px_minmax(0,1fr)]">
        <div className="aspect-[3/4] overflow-hidden rounded-xl bg-black/40">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={t('avatar_alt')}
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center px-3 text-center text-xs text-zinc-500">
              {t('avatar_empty')}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-sm font-medium text-zinc-200">
            {t('avatar_title')}
          </span>
          <Input
            value={imagePrompt}
            onChange={(event) => onUpdate({ imagePrompt: event.target.value })}
            placeholder={t('image_prompt_placeholder')}
            className="border-white/10 bg-black/40 text-zinc-100 placeholder:text-zinc-500"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onGenerateImage}
              disabled={generatingImage || uploadingImage}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              {generatingImage ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {t('generate_avatar')}
            </button>
            <button
              type="button"
              onClick={onPickImage}
              disabled={generatingImage || uploadingImage}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              {uploadingImage ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {t('upload_avatar')}
            </button>
          </div>
          {gallery.length > 1 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {gallery.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="overflow-hidden rounded-lg border border-white/10 bg-black/30"
                >
                  <img
                    src={url}
                    alt={`${t('avatar_alt')} ${index + 1}`}
                    className="h-14 w-11 object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-200">{t('custom_label')}</span>
        <Input
          value={customInstruction}
          onChange={(event) =>
            onUpdate({ customInstruction: event.target.value })
          }
          placeholder={t('custom_placeholder')}
          className="border-white/10 bg-black/40 text-zinc-100 placeholder:text-zinc-500"
        />
      </label>
    </div>
  );
}

function PreviewStep({
  avatarUrl,
  gallery,
  isZh,
  draft,
  template,
  traits,
  relationship,
  savedCharacterId,
  publishing,
  generating,
  generatingImage,
  uploadingImage,
  onGenerateImage,
  onPickImage,
  onTune,
  onPublish,
  onEdit,
  onChat,
}: {
  avatarUrl: string;
  gallery: string[];
  isZh: boolean;
  draft?: AiWriterDraft;
  template: QuickCreateTemplate;
  traits: string[];
  relationship: string;
  savedCharacterId?: string;
  publishing: VisibilityOption | null;
  generating: boolean;
  generatingImage: boolean;
  uploadingImage: boolean;
  onGenerateImage: () => void;
  onPickImage: () => void;
  onTune: (instruction: string) => void;
  onPublish: (visibility: VisibilityOption) => void;
  onEdit: () => void;
  onChat: () => void;
}) {
  const t = useTranslations('roleplay.create.quick_create');
  if (!draft) {
    return (
      <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-white/10 text-sm text-zinc-400">
        {t('no_preview')}
      </div>
    );
  }
  return (
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-black/30">
          {(avatarUrl || draft.avatar) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl || draft.avatar}
              alt={draft.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center text-sm text-zinc-500">
              {t('portrait_pending')}
            </div>
          )}
        </div>
        {gallery.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {gallery.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="overflow-hidden rounded-lg border border-white/10 bg-black/30"
              >
                <img
                  src={url}
                  alt={`${draft.name} ${index + 1}`}
                  className="h-14 w-11 object-cover"
                />
              </div>
            ))}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onGenerateImage}
            disabled={generatingImage || uploadingImage}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs text-zinc-200 transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            {generatingImage ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            {t('generate_avatar_short')}
          </button>
          <button
            type="button"
            onClick={onPickImage}
            disabled={generatingImage || uploadingImage}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs text-zinc-200 transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            {uploadingImage ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            {t('upload_avatar_short')}
          </button>
        </div>
        <button
          type="button"
          onClick={onChat}
          disabled={!savedCharacterId}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/5 disabled:opacity-50"
        >
          <MessageCircle className="size-4" />
          {t('try_chat')}
        </button>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-zinc-500">
          {isZh ? template.titleZh : template.titleEn}
        </p>
        <h3 className="mt-1 text-2xl font-semibold tracking-tight">
          {draft.name}
        </h3>
        {draft.tagline ? (
          <p className="mt-2 text-sm text-zinc-300">{draft.tagline}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {[...traits, relationship].filter(Boolean).map((item) => (
            <span
              key={item}
              className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-zinc-300"
            >
              {item}
            </span>
          ))}
        </div>
        <div className="mt-5 rounded-2xl bg-black/25 p-4">
          <p className="text-xs uppercase text-zinc-500">{t('opening')}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
            {draft.opening}
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {TUNING_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onTune(option.instruction)}
              disabled={generating}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              {generating ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
              {t(option.labelKey)}
            </button>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => onPublish('private')}
            disabled={!savedCharacterId || Boolean(publishing)}
            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            style={{ background: 'var(--roleplay-brand-gradient)' }}
          >
            {publishing === 'private' ? <Loader2 className="size-4 animate-spin" /> : null}
            {t('publish_private')}
          </button>
          <button
            type="button"
            onClick={() => onPublish('public')}
            disabled={!savedCharacterId || Boolean(publishing)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-5 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/5 disabled:opacity-60"
          >
            {publishing === 'public' ? <Loader2 className="size-4 animate-spin" /> : null}
            {t('publish_public')}
          </button>
          <button
            type="button"
            onClick={onEdit}
            disabled={!savedCharacterId}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-5 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/5 disabled:opacity-60"
          >
            <Pencil className="size-4" />
            {t('advanced_edit')}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-black/20 p-3">
      <h3 className="mb-3 text-sm font-medium text-zinc-200">{title}</h3>
      {children}
    </section>
  );
}

function InlineCustomChoice({
  value,
  placeholder,
  onAdd,
  onChange,
}: {
  value: string;
  placeholder: string;
  onAdd: () => void;
  onChange: (value: string) => void;
}) {
  const t = useTranslations('roleplay.create.quick_create');
  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onAdd();
          }
        }}
        placeholder={placeholder}
        className="min-w-0 border-white/10 bg-black/40 text-zinc-100 placeholder:text-zinc-500"
      />
      <button
        type="button"
        onClick={onAdd}
        className="shrink-0 rounded-full border border-white/10 px-3 text-sm text-zinc-200 transition-colors hover:bg-white/5"
      >
        {t('use_custom')}
      </button>
    </div>
  );
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      className="rounded-xl border border-white/10 px-3 py-2 text-left text-sm leading-relaxed text-zinc-300 transition-colors hover:bg-white/5 data-[active=true]:border-white/60 data-[active=true]:bg-white/10 data-[active=true]:text-white"
    >
      {children}
    </button>
  );
}
