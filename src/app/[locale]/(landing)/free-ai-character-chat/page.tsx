import { setRequestLocale } from 'next-intl/server';

import {
  RoleplaySeoLandingPage,
  type SeoLandingPageConfig,
} from '@/shared/components/roleplay/roleplay-seo-landing-page';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  title: 'AI Character Chat Free No Sign Up | Keepsay RolePlay',
  description:
    'If you want to try AI character chat free without login, start with guest replies. Pick a scene fast, then save it or build your own from a template.',
  keywords:
    'AI character chat free, AI character chat without login, free AI character chat no sign up, free AI character chat no login, free AI character chat, ai roleplay chat, original characters',
  localized: {
    zh: {
      title: 'AI 角色聊天免费，无需登录 | Keepsay RolePlay',
      description:
        '先免费免登录开始 AI 角色聊天，体验原创角色、角色扮演场景和快速创建，再在需要时加入记忆。',
      keywords:
        '免费 AI 角色聊天, 免费免登录 AI 角色聊天, AI 角色聊天免费, AI 角色扮演聊天, 原创角色',
    },
  },
  canonicalUrl: '/free-ai-character-chat',
});

const sharedConfig = {
  canonicalPath: '/free-ai-character-chat',
  sceneSlugs: [
    'free_chat',
    'anime_roleplay',
    'crush_chat',
    'comfort_companion',
  ],
  characterIds: [
    'rp-001',
    'rp-010',
    'rp-011',
    'rp-anime-001',
    'rp-anime-003',
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
    eyebrow: 'Free AI Character Chat No Sign Up',
    title: 'AI character chat free no sign up, with memory when you want it.',
    description:
      'Use guest replies to test the character fast. If it fits, save it, add memory, and keep going.',
    primaryCta: { label: 'Start free now', href: '/' },
    secondaryCta: { label: 'Quick create character', href: '/create/quick' },
    proofPoints: [
      'Try a first chat without signing up.',
      'Jump into a scene instead of scrolling a feed.',
      'Save the character when it feels worth keeping.',
      'Use templates and images when you want to create faster.',
    ],
    sections: [
      {
        title: 'Free first chat, no sign up required',
        body: 'A lot of people just want to know whether the character feels right. Guest replies let them try first and save later.',
      },
      {
        title: 'Original characters, not an endless feed',
        body: 'Instead of scrolling forever, users can jump into a roleplay, a crush chat, or a calm companion and start talking immediately.',
      },
      {
        title: 'Memory is the upgrade',
        body: 'When a character remembers the last chat, the next one feels less like a restart.',
      },
      {
        title: 'Templates and images make creation faster',
        body: 'If you already know the vibe, templates and images help you get there faster.',
      },
    ],
    faqs: [
      {
        question: 'Can I start free AI character chat without login?',
        answer:
          'Yes. You can start with guest replies, then save the chat later if you want to keep it.',
      },
      {
        question: 'Can I start AI character chat for free?',
        answer:
          'Yes. Start free, then keep the character if it feels worth saving.',
      },
      {
        question: 'Do I need to create a character first?',
        answer:
          'No. Start with a public character first. Quick Create is there when you want your own.',
      },
      {
        question: 'What should I try first?',
        answer:
          'Try the scene that feels easiest to jump into. Roleplay, crush chat, and comfort companions are all good starting points.',
      },
    ],
    related: [
      { label: 'AI chat with memory', href: '/ai-character-chat-with-memory' },
      { label: 'Anime roleplay', href: '/anime-ai-roleplay-characters' },
      { label: 'Custom creator', href: '/custom-ai-character-creator' },
    ],
  },
  zh: {
    ...sharedConfig,
    locale: 'zh',
    eyebrow: '免费 AI 角色聊天，无需登录',
    title: '先免费免登录和 AI 角色聊天，再把喜欢的场景变成你的私有故事。',
    description:
      '先用访客身份开始聊天。喜欢哪个角色，就把它保存下来，慢慢补上记忆。',
    primaryCta: { label: '免费先试聊', href: '/' },
    secondaryCta: { label: '快速创建角色', href: '/create/quick' },
    proofPoints: [
      '先用访客身份开始，不用先注册。',
      '直接进入你喜欢的角色和场景。',
      '喜欢的话再保存成私有角色。',
      '模板和图片能让创建快一点。',
    ],
    sections: [
      {
        title: '先免费试聊，不用先注册',
        body: '很多人只是想先试一下。你可以先聊，觉得对味了再保存。',
      },
      {
        title: '原创角色，不是无尽角色流',
        body: '你不需要翻很久。挑一个场景，马上开始就行。',
      },
      {
        title: '记忆是升级项',
        body: '等你想继续的时候，记忆会把上一次的内容接住。',
      },
      {
        title: '模板和图片让创建更快',
        body: '模板和图片只是帮你少走几步，不是把流程变复杂。',
      },
    ],
    faqs: [
      {
        question: '可以免登录开始免费 AI 角色聊天吗？',
        answer:
          '可以。你先聊，喜欢的话再保存。',
      },
      {
        question: '可以免费开始 AI 角色聊天吗？',
        answer:
          '可以。先开始聊天，再决定要不要把它变成你的私有角色。',
      },
      {
        question: '必须先创建角色吗？',
        answer:
          '不需要。可以先和公开角色聊天。快速创建适合在你想拥有专属私有角色时使用。',
      },
      {
        question: '第一次应该试什么？',
        answer:
          '先挑一个最顺手的场景就行。想剧情、想聊天、想轻松陪伴都可以。',
      },
    ],
    related: [
      { label: '带记忆 AI 聊天', href: '/ai-character-chat-with-memory' },
      { label: '动漫角色扮演', href: '/anime-ai-roleplay-characters' },
      { label: '自定义角色创建器', href: '/custom-ai-character-creator' },
    ],
  },
};

export default async function FreeAiCharacterChatPage({
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
