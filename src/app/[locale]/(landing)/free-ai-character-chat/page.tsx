import { setRequestLocale } from 'next-intl/server';

import {
  RoleplaySeoLandingPage,
  type SeoLandingPageConfig,
} from '@/shared/components/roleplay/roleplay-seo-landing-page';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  title: 'Free AI Character Chat | Keepsay RolePlay',
  description:
    'Start free AI character chat with anime, crush, and comfort companions. Try public characters, then create your own private AI character with memory.',
  keywords:
    'free AI character chat, AI character chat free, free AI roleplay, chat with AI characters free',
  localized: {
    zh: {
      title: '免费 AI 角色聊天 | Keepsay RolePlay',
      description:
        '免费开始 AI 角色聊天，体验动漫角色、心动聊天和治愈陪伴，再创建带记忆的私有 AI 角色。',
      keywords:
        '免费 AI 角色聊天, AI 角色聊天免费, 免费 AI 角色扮演, 免费和 AI 角色聊天',
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
    eyebrow: 'Free AI Character Chat',
    title: 'Start free AI character chat before you build your private story.',
    description:
      'Try public AI roleplay characters for free, then turn the scenes you like into a private companion with memory, voice, and a first moment that already feels personal.',
    primaryCta: { label: 'Start free chat', href: '/' },
    secondaryCta: { label: 'Create a character', href: '/create/quick' },
    proofPoints: [
      'Public characters are ready to chat immediately.',
      'Anime, crush, and comfort scenes give new users fast ways to start.',
      'Quick Create turns a favorite scene into a private character.',
    ],
    sections: [
      {
        title: 'Free first, private when it matters',
        body: 'Free chat should help users feel the product quickly. The best path is simple: try a public character, notice which scene feels right, then create a private version when the user wants memory and continuity.',
      },
      {
        title: 'Scene-first discovery',
        body: 'Instead of browsing an endless feed, users can choose a situation: anime roleplay, a crush chat, or a calm companion who remembers the details they return with later.',
      },
      {
        title: 'Built for conversion',
        body: 'This page is designed for low-friction search intent. Users looking for free AI character chat should land on characters, not a long explanation.',
      },
    ],
    faqs: [
      {
        question: 'Can I start AI character chat for free?',
        answer:
          'Yes. You can start from public characters, then create a private character when you want a more personal memory-based experience.',
      },
      {
        question: 'Do I need to create a character first?',
        answer:
          'No. Start with a public roleplay character first. Quick Create is there when you want your own private companion.',
      },
      {
        question: 'What should I try first?',
        answer:
          'Try anime roleplay for fantasy scenes, crush chat for romantic tension, or comfort companions for low-pressure late-night conversation.',
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
    eyebrow: '免费 AI 角色聊天',
    title: '先免费和 AI 角色聊天，再把喜欢的场景变成你的私有故事。',
    description:
      '从公开角色开始体验动漫角色扮演、心动聊天和治愈陪伴。找到喜欢的感觉后，再用快速创建做成带记忆、语音和专属开场的私有角色。',
    primaryCta: { label: '开始免费聊天', href: '/' },
    secondaryCta: { label: '创建角色', href: '/create/quick' },
    proofPoints: [
      '公开角色可以直接开始聊天，降低第一次体验门槛。',
      '动漫、心动、治愈场景让新用户更快找到入口。',
      '快速创建可以把喜欢的场景转成私有角色。',
    ],
    sections: [
      {
        title: '先免费体验，重要时再私有化',
        body: '免费聊天页的目标不是讲很多概念，而是让用户马上感受到产品。先试公开角色，确认哪类场景有感觉，再在需要记忆和连续性时创建私有版本。',
      },
      {
        title: '按场景发现角色',
        body: '不要只给用户一个无尽角色流。搜索免费 AI 角色聊天的人，需要快速选择一个情境：动漫角色扮演、心动聊天，或者记得细节的安静陪伴。',
      },
      {
        title: '为转化设计',
        body: '这个页面承接低门槛但强意图的搜索。用户找免费 AI character chat 时，应该先看到能直接聊天的角色，而不是一篇长解释。',
      },
    ],
    faqs: [
      {
        question: '可以免费开始 AI 角色聊天吗？',
        answer:
          '可以。你可以先从公开角色开始聊天，等想要更个人化、带记忆的体验时，再创建私有角色。',
      },
      {
        question: '必须先创建角色吗？',
        answer:
          '不需要。可以先和公开角色聊天。快速创建适合在你想拥有专属私有角色时使用。',
      },
      {
        question: '第一次应该试什么？',
        answer:
          '想要幻想和剧情可以试动漫角色扮演；想要暧昧张力可以试心动聊天；想要低压力陪伴可以试治愈陪伴。',
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
