import { setRequestLocale } from 'next-intl/server';

import {
  RoleplaySeoLandingPage,
  type SeoLandingPageConfig,
} from '@/shared/components/roleplay/roleplay-seo-landing-page';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  title: 'Anime AI Roleplay Characters | Keepsay RolePlay',
  description:
    'Original anime AI roleplay characters for fantasy, campus, cozy, mystery, cyberpunk, vampire, and memory-based companion stories.',
  keywords:
    'anime AI roleplay characters, anime character AI chat, anime AI chat, original anime roleplay',
  localized: {
    zh: {
      title: '动漫 AI 角色扮演角色 | Keepsay RolePlay',
      description:
        '原创动漫 AI 角色扮演角色，适合幻想、校园、治愈、推理、赛博朋克、吸血鬼和带记忆陪伴故事。',
      keywords:
        '动漫 AI 角色扮演角色, 动漫角色 AI 聊天, 动漫 AI 聊天, 原创动漫角色扮演',
    },
  },
  canonicalUrl: '/anime-ai-roleplay-characters',
});

const sharedConfig = {
  canonicalPath: '/anime-ai-roleplay-characters',
  sceneSlugs: ['anime_roleplay', 'fantasy_roleplay', 'comfort_companion'],
  characterIds: [
    'rp-anime-001',
    'rp-anime-002',
    'rp-anime-003',
    'rp-anime-004',
    'rp-anime-005',
    'rp-anime-008',
    'rp-anime-009',
    'rp-anime-018',
    'rp-anime-019',
  ],
} satisfies Pick<
  SeoLandingPageConfig,
  'canonicalPath' | 'sceneSlugs' | 'characterIds'
>;

const configs: Record<'en' | 'zh', SeoLandingPageConfig> = {
  en: {
    ...sharedConfig,
    locale: 'en',
    eyebrow: 'Anime AI Roleplay Characters',
    title: 'Original anime roleplay characters with scenes you can step into.',
    description:
      'Choose a mage, campus mentor, android, detective, hacker, vampire curator, or cozy cafe companion. Every character starts with a scene, a voice, and a relationship hook.',
    primaryCta: { label: 'Start anime roleplay', href: '/' },
    secondaryCta: { label: 'Create anime character', href: '/create/quick' },
    sceneSlugs: ['anime_roleplay', 'fantasy_roleplay', 'comfort_companion'],
    characterIds: [
      'rp-anime-001',
      'rp-anime-002',
      'rp-anime-003',
      'rp-anime-004',
      'rp-anime-005',
      'rp-anime-008',
      'rp-anime-009',
      'rp-anime-018',
      'rp-anime-019',
    ],
    proofPoints: [
      'Original anime characters, not copied franchise roles.',
      'Fantasy, campus, mystery, cozy, and supernatural roleplay scenes.',
      'Quick Create supports anime-inspired private characters.',
    ],
    sections: [
      {
        title: 'Original anime scenes',
        body: 'Anime roleplay works best when the scene is clear. These characters start from libraries, tea rooms, rainy campuses, night offices, neon hideouts, museums, and cozy fantasy cafes.',
      },
      {
        title: 'Comfort plus adventure',
        body: 'The strongest anime characters are not only visual. They bring a relationship hook: slow trust, emotional reflection, protection, playfulness, or a private ritual.',
      },
      {
        title: 'Create your own anime character',
        body: 'Use Quick Create to start from an anime mage or a memory companion, then tune the relationship, scene conflict, traits, and opening moment.',
      },
    ],
    inspirations: [
      {
        title: 'Start from an anime mage',
        body: 'Build a magical companion with a clear ritual, scene, and emotional style.',
      },
      {
        title: 'Start from a cozy companion',
        body: 'Make anime roleplay softer with a cafe, tea room, or late-night comfort scene.',
      },
    ],
    faqs: [
      {
        question: 'Are these anime characters original?',
        answer:
          'Yes. The anime characters are designed as original companions and avoid copying existing franchise characters.',
      },
      {
        question: 'Can I make my own anime roleplay character?',
        answer:
          'Yes. Quick Create can start from anime and fantasy inspirations, then make the character private.',
      },
      {
        question: 'Which anime scene should I start with?',
        answer:
          'Try a mage for fantasy comfort, a campus mentor for daily support, or a detective/hacker for story-driven roleplay.',
      },
    ],
    related: [
      { label: 'AI chat with memory', href: '/ai-character-chat-with-memory' },
      { label: 'Custom creator', href: '/custom-ai-character-creator' },
      { label: 'Free character chat', href: '/free-ai-character-chat' },
    ],
  },
  zh: {
    ...sharedConfig,
    locale: 'zh',
    eyebrow: '动漫 AI 角色扮演角色',
    title: '原创动漫角色扮演角色，直接进入你想要的场景。',
    description:
      '你可以选择魔法师、校园前辈、安卓、侦探、黑客、吸血鬼馆长或治愈咖啡馆伙伴。每个角色都从场景、声音和关系钩子开始。',
    primaryCta: { label: '开始动漫角色扮演', href: '/' },
    secondaryCta: { label: '创建动漫角色', href: '/create/quick' },
    proofPoints: [
      '原创动漫角色，不是搬运现成 IP。',
      '覆盖幻想、校园、推理、治愈和超自然场景。',
      '快速创建支持动漫风格的私有角色。',
    ],
    sections: [
      {
        title: '原创动漫场景',
        body: '动漫角色扮演最好从清晰的场景开始。这里的角色会从图书馆、茶室、雨夜校园、深夜办公室、霓虹据点、博物馆和治愈系咖啡馆展开。',
      },
      {
        title: '既有陪伴感，也有冒险感',
        body: '最强的动漫角色不只是好看。它们还要带有关系钩子：慢慢建立信任、情绪反思、保护感、俏皮感，或者只属于你们的私密仪式。',
      },
      {
        title: '创建你自己的动漫角色',
        body: '可以用快速创建从动漫魔法师或记忆陪伴开始，再调节关系、冲突、性格和开场时刻。',
      },
    ],
    inspirations: [
      {
        title: '从动漫魔法师开始',
        body: '打造一个有明确仪式感、场景感和情绪风格的魔法角色。',
      },
      {
        title: '从温暖陪伴开始',
        body: '用咖啡馆、茶室或深夜场景，把动漫角色扮演做得更柔和。',
      },
    ],
    faqs: [
      {
        question: '这些动漫角色是原创的吗？',
        answer: '是。角色都按原创陪伴来设计，不会复制现成的动漫 IP。',
      },
      {
        question: '我可以自己做动漫角色吗？',
        answer: '可以。快速创建可以从动漫和幻想灵感开始，然后保存成私有角色。',
      },
      {
        question: '我应该从哪个动漫场景开始？',
        answer:
          '想要幻想和安定感可以试魔法师；想要日常陪伴可以试校园前辈；想要剧情推进可以试侦探或黑客。',
      },
    ],
    related: [
      { label: '带记忆 AI 聊天', href: '/ai-character-chat-with-memory' },
      { label: '自定义角色创建器', href: '/custom-ai-character-creator' },
      { label: '免费角色聊天', href: '/free-ai-character-chat' },
    ],
  },
};

export default async function AnimeAiRoleplayCharactersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <RoleplaySeoLandingPage config={configs[locale === 'zh' ? 'zh' : 'en']} />
  );
}
