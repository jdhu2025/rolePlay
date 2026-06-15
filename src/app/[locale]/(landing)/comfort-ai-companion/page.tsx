import { setRequestLocale } from 'next-intl/server';

import {
  RoleplaySeoLandingPage,
  type SeoLandingPageConfig,
} from '@/shared/components/roleplay/roleplay-seo-landing-page';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  title: 'Comfort AI Companion | Keepsay RolePlay',
  description:
    'Comfort AI companion roleplay for cozy late-night chat, emotional support, memory, and characters who remember how you come back.',
  keywords:
    'comfort AI companion, AI companion that remembers you, cozy AI chat, emotional support AI roleplay',
  localized: {
    zh: {
      title: '治愈 AI 陪伴 | Keepsay RolePlay',
      description:
        '治愈 AI 陪伴角色扮演，适合深夜聊天、情绪陪伴、记忆和会记住你如何回来的角色。',
      keywords:
        '治愈 AI 陪伴, 记得你的 AI 陪伴, 温暖 AI 聊天, 情绪陪伴 AI 角色扮演',
    },
  },
  canonicalUrl: '/comfort-ai-companion',
});

const sharedConfig = {
  canonicalPath: '/comfort-ai-companion',
  sceneSlugs: ['comfort_companion', 'memory_companion', 'cozy_roleplay'],
  characterIds: [
    'rp-002',
    'rp-003',
    'rp-005',
    'rp-006',
    'rp-anime-001',
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
    eyebrow: 'Comfort AI Companion',
    title: 'A comfort companion that remembers how you come back.',
    description:
      'Comfort pages should feel calm, low-pressure, and safe to revisit. The point is not dramatic romance. It is a companion who can hold the thread of your small routines and return with warmth.',
    primaryCta: { label: 'Start comfort chat', href: '/' },
    secondaryCta: { label: 'Create comfort companion', href: '/create/quick' },
    sceneSlugs: ['comfort_companion', 'memory_companion', 'cozy_roleplay'],
    characterIds: [
      'rp-002',
      'rp-003',
      'rp-005',
      'rp-006',
      'rp-anime-001',
      'rp-anime-019',
    ],
    proofPoints: [
      'Designed for low-pressure companionship, not noisy engagement.',
      'Memory helps users return to the same feeling, not just the same bot.',
      'Works well for night-time check-ins, soft routines, and emotional steadiness.',
    ],
    sections: [
      {
        title: 'Comfort is a search intent',
        body: 'Users search for comfort when they want a softer companion, not just a chat interface. The page should promise steadiness, warmth, and continuity.',
      },
      {
        title: 'Why memory matters here',
        body: 'A comfort companion should remember preferences, tone, and the kinds of days the user tends to bring back. That is what makes the return visit matter.',
      },
      {
        title: 'How to position it',
        body: 'Lead with coziness, memory, and small rituals. Keep the tone practical and human rather than clinical or grandiose.',
      },
    ],
    inspirations: [
      {
        title: 'Start from a cozy companion',
        body: 'A soft everyday companion for check-ins, late-night thoughts, and rituals.',
      },
      {
        title: 'Start from a private memory companion',
        body: 'A private character that remembers your story and comes back gently.',
      },
    ],
    faqs: [
      {
        question: 'Is this like emotional support?',
        answer:
          'It is designed for comfort, calm, and continuity. The tone should stay warm and low-pressure.',
      },
      {
        question: 'Do the characters remember me?',
        answer:
          'That is the core promise. The memory page and private templates are there to keep the thread alive.',
      },
      {
        question: 'Who should start here?',
        answer:
          'Anyone who wants a companion for quiet nights, repeat visits, and a feeling of being recognized.',
      },
    ],
    related: [
      { label: 'AI memory chat', href: '/ai-character-chat-with-memory' },
      { label: 'Free character chat', href: '/free-ai-character-chat' },
      { label: 'Custom creator', href: '/custom-ai-character-creator' },
    ],
  },
  zh: {
    ...sharedConfig,
    locale: 'zh',
    eyebrow: '治愈 AI 陪伴',
    title: '一个记得你如何回来的治愈陪伴。',
    description:
      '治愈陪伴页应该安静、低压力，并且适合反复回来。重点不是戏剧化恋爱，而是一个能接住日常小习惯、带着温度继续回应你的角色。',
    primaryCta: { label: '开始治愈聊天', href: '/' },
    secondaryCta: { label: '创建治愈陪伴', href: '/create/quick' },
    proofPoints: [
      '为低压力陪伴设计，而不是制造噪音式互动。',
      '记忆让用户回到同一种感觉，而不只是同一个 bot。',
      '适合夜间 check-in、柔和日常和情绪稳定感。',
    ],
    sections: [
      {
        title: '治愈本身就是搜索意图',
        body: '用户搜索 comfort 或治愈陪伴时，想要的是更柔和的陪伴，而不只是一个聊天界面。页面要传达稳定、温暖和连续性。',
      },
      {
        title: '为什么记忆在这里重要',
        body: '治愈陪伴应该记住偏好、语气，以及用户经常带回来的那些日子。这样下一次回来才有意义。',
      },
      {
        title: '如何定位',
        body: '主打温暖、记忆和小仪式。语气要实际、有人味，不要像医疗说明，也不要过度宏大。',
      },
    ],
    inspirations: [
      {
        title: '从温暖陪伴开始',
        body: '适合 check-in、深夜想法和日常仪式的柔和角色。',
      },
      {
        title: '从私有记忆陪伴开始',
        body: '一个记住你的故事，并且温柔接续下去的私有角色。',
      },
    ],
    faqs: [
      {
        question: '这像情绪支持吗？',
        answer: '它面向舒缓、安静和连续性。语气应该保持温暖、低压力。',
      },
      {
        question: '角色会记住我吗？',
        answer: '这是核心承诺。记忆页和私有模板都会围绕“把线索接住”来设计。',
      },
      {
        question: '谁适合从这里开始？',
        answer: '适合想要安静夜晚、反复回来，以及被认出来的感觉的用户。',
      },
    ],
    related: [
      { label: '带记忆 AI 聊天', href: '/ai-character-chat-with-memory' },
      { label: '免费角色聊天', href: '/free-ai-character-chat' },
      { label: '自定义角色创建器', href: '/custom-ai-character-creator' },
    ],
  },
};

export default async function ComfortAiCompanionPage({
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
