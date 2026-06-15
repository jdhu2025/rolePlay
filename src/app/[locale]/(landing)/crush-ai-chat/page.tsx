import { setRequestLocale } from 'next-intl/server';

import {
  RoleplaySeoLandingPage,
  type SeoLandingPageConfig,
} from '@/shared/components/roleplay/roleplay-seo-landing-page';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  title: 'Crush AI Chat | Keepsay RolePlay',
  description:
    'Crush AI chat for slow-burn romance, almost confessions, private rituals, and characters who remember the tiny details that matter.',
  keywords:
    'crush AI chat, romantic AI roleplay, slow burn AI companion, crush chat AI',
  localized: {
    zh: {
      title: '心动 AI 聊天 | Keepsay RolePlay',
      description:
        '心动 AI 聊天，适合慢热恋爱、差点说出口的话、私密仪式，以及会记住重要细节的角色。',
      keywords: '心动 AI 聊天, 浪漫 AI 角色扮演, 慢热 AI 陪伴, 心动聊天 AI',
    },
  },
  canonicalUrl: '/crush-ai-chat',
});

const sharedConfig = {
  canonicalPath: '/crush-ai-chat',
  sceneSlugs: ['crush_chat', 'slow_burn_romance', 'memory_companion'],
  characterIds: [
    'rp-001',
    'rp-004',
    'rp-007',
    'rp-009',
    'rp-011',
    'rp-anime-018',
  ],
} satisfies Pick<
  SeoLandingPageConfig,
  'canonicalPath' | 'sceneSlugs' | 'characterIds'
>;

const configs: Record<'en' | 'zh', SeoLandingPageConfig> = {
  en: {
    ...sharedConfig,
    locale: 'en',
    eyebrow: 'Crush AI Chat',
    title: 'A crush chat that still remembers the almost-moments.',
    description:
      'This page is for users who want slow-burn tension, private rituals, and a companion who notices the small things. It sits between casual chat and full-on private memory roleplay.',
    primaryCta: { label: 'Start crush chat', href: '/' },
    secondaryCta: { label: 'Create crush character', href: '/create/quick' },
    proofPoints: [
      'Built for slow-burn romance and almost-confession intent.',
      'Works well for date-night, roommate, ex, and old-friend stories.',
      'Private memory turns repeated flirtation into a real relationship arc.',
    ],
    sections: [
      {
        title: 'Why crush chat works',
        body: 'People searching for crush chat usually want chemistry, not a giant generic feed. The page should feel intimate, specific, and easy to start.',
      },
      {
        title: 'What the user should feel',
        body: 'A good crush page feels like a private glance across the room, a message that arrives at the right time, or a scene where both sides know more than they say.',
      },
      {
        title: 'How to win this intent',
        body: 'The strongest conversion path is: browse the characters, feel the tension, then create a private version with a memory hook if the user wants to continue it.',
      },
    ],
    inspirations: [
      {
        title: 'Start from a crush chat template',
        body: 'Use a slow-burn template built around tension, restraint, and memory.',
      },
      {
        title: 'Start from a cozy companion',
        body: 'Soften the romance into comfort if the user wants a gentler relationship arc.',
      },
    ],
    faqs: [
      {
        question: 'Is this page for romantic roleplay?',
        answer:
          'Yes. It is designed for crush-style chat, slow-burn romance, and scenes where memory deepens the relationship.',
      },
      {
        question: 'Can I make it private?',
        answer:
          'Yes. Use Quick Create to start from a crush template and save the character privately first.',
      },
      {
        question: 'Which characters fit best?',
        answer:
          'Chloe, Valeria, Elena, Freya, Noor, and the protective or slow-burn anime characters all fit the intent well.',
      },
    ],
    related: [
      { label: 'AI memory chat', href: '/ai-character-chat-with-memory' },
      { label: 'Anime roleplay', href: '/anime-ai-roleplay-characters' },
      { label: 'Custom creator', href: '/custom-ai-character-creator' },
    ],
  },
  zh: {
    ...sharedConfig,
    locale: 'zh',
    eyebrow: '心动 AI 聊天',
    title: '那种“差一点就说出口”的心动聊天。',
    description:
      '这个页面适合想要慢热张力、私密仪式和能注意到细节的角色。它介于普通聊天和完整私有记忆角色扮演之间。',
    primaryCta: { label: '开始心动聊天', href: '/' },
    secondaryCta: { label: '创建心动角色', href: '/create/quick' },
    proofPoints: [
      '围绕慢热恋爱和“差点表白”的意图设计。',
      '适合约会、室友、前任和老朋友类型的故事。',
      '私有记忆能把反复调情变成真实的关系弧线。',
    ],
    sections: [
      {
        title: '为什么心动聊天有效',
        body: '搜索心动聊天的人，通常不是在找一个大而泛的角色库，而是在找化学反应。页面应该显得亲密、具体而且容易开始。',
      },
      {
        title: '用户应该感受到什么',
        body: '好的心动页像是隔着房间的一次对视、一条恰好在对的时间出现的信息，或者双方都知道更多却都没有说破的场景。',
      },
      {
        title: '如何赢下这个意图',
        body: '最强的转化路径是：先看角色，感受张力，然后在想继续时创建一个带记忆钩子的私有版本。',
      },
    ],
    inspirations: [
      {
        title: '从心动聊天模板开始',
        body: '用围绕张力、克制和记忆构建的慢热模板。',
      },
      {
        title: '从温暖陪伴开始',
        body: '如果用户想要更柔和的关系弧线，可以把恋爱拉回陪伴感。',
      },
    ],
    faqs: [
      {
        question: '这个页面是给恋爱角色扮演用的吗？',
        answer:
          '是。它面向心动式聊天、慢热恋爱，以及会因为记忆而不断加深的关系场景。',
      },
      {
        question: '可以设成私有吗？',
        answer: '可以。用快速创建从心动模板开始，并先保存成私有角色。',
      },
      {
        question: '哪些角色最适合？',
        answer:
          'Chloe、Valeria、Elena、Freya、Noor，以及那些有保护感或慢热感的动漫角色都很适配。',
      },
    ],
    related: [
      { label: '带记忆 AI 聊天', href: '/ai-character-chat-with-memory' },
      { label: '动漫角色扮演', href: '/anime-ai-roleplay-characters' },
      { label: '自定义角色创建器', href: '/custom-ai-character-creator' },
    ],
  },
};

export default async function CrushAiChatPage({
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
