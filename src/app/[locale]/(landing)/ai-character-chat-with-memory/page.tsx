import { setRequestLocale } from 'next-intl/server';

import {
  RoleplaySeoLandingPage,
  type SeoLandingPageConfig,
} from '@/shared/components/roleplay/roleplay-seo-landing-page';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  title: 'AI Character Chat With Memory | Keepsay RolePlay',
  description:
    'AI character chat with memory for ongoing roleplay, comfort companions, private story details, and characters who remember what matters.',
  keywords:
    'AI character chat with memory, AI companion that remembers you, AI roleplay with memory, character chat that remembers',
  localized: {
    zh: {
      title: '带记忆的 AI 角色聊天 | Keepsay RolePlay',
      description:
        '带记忆的 AI 角色聊天，适合长期角色扮演、治愈陪伴、私有故事细节和能记住重要事情的 AI 角色。',
      keywords:
        '带记忆的 AI 角色聊天, 记得你的 AI 陪伴, 带记忆 AI 角色扮演, 会记住的角色聊天',
    },
  },
  canonicalUrl: '/ai-character-chat-with-memory',
});

const sharedConfig = {
  canonicalPath: '/ai-character-chat-with-memory',
  sceneSlugs: ['memory_companion', 'comfort_companion', 'crush_chat'],
  characterIds: [
    'rp-012',
    'rp-anime-001',
    'rp-anime-002',
    'rp-anime-003',
    'rp-anime-005',
    'rp-anime-015',
  ],
} satisfies Pick<
  SeoLandingPageConfig,
  'canonicalPath' | 'sceneSlugs' | 'characterIds'
>;

const configs: Record<'en' | 'zh', SeoLandingPageConfig> = {
  en: {
    ...sharedConfig,
    locale: 'en',
    eyebrow: 'AI Character Chat With Memory',
    title: 'Chat with AI characters that can return to your story.',
    description:
      'Memory makes roleplay feel less disposable. Keepsay focuses on the small details: promises, rituals, preferences, emotional context, and scenes that should still matter tomorrow.',
    primaryCta: { label: 'Chat with memory', href: '/' },
    secondaryCta: { label: 'Create memory companion', href: '/create/quick' },
    sceneSlugs: ['memory_companion', 'comfort_companion', 'crush_chat'],
    characterIds: [
      'rp-012',
      'rp-anime-001',
      'rp-anime-002',
      'rp-anime-003',
      'rp-anime-005',
      'rp-anime-015',
    ],
    proofPoints: [
      'Built around relationship continuity, not one-off prompt resets.',
      'Works especially well for comfort companions and slow-burn roleplay.',
      'Quick Create can start with private memory as the main design choice.',
    ],
    sections: [
      {
        title: 'Memory is the differentiator',
        body: 'A character with memory can bring back shared scenes naturally: a drink preference, a promise, an inside joke, or the way the user tends to arrive after a hard day.',
      },
      {
        title: 'Better for repeat visits',
        body: 'Searchers looking for AI companions that remember them usually want a reason to return. The product experience should reward second, third, and tenth conversations.',
      },
      {
        title: 'Private context by default',
        body: 'The strongest memory experience is personal. Quick Create should default to private characters, then let users decide whether anything becomes public later.',
      },
    ],
    inspirations: [
      {
        title: 'Start from a cozy companion',
        body: 'A warm daily character who remembers preferences, moods, and small rituals.',
      },
      {
        title: 'Start from a private memory companion',
        body: 'A private character designed around shared history and return visits.',
      },
    ],
    faqs: [
      {
        question: 'What can an AI character remember?',
        answer:
          'The product is designed around story context, relationship details, preferences, promises, and recurring emotional beats.',
      },
      {
        question: 'Is memory useful for roleplay?',
        answer:
          'Yes. Memory is especially useful for slow-burn romance, comfort companions, and long-running anime or fantasy stories.',
      },
      {
        question: 'Can I create a private character with memory?',
        answer:
          'Yes. Quick Create is being shaped around private memory companions as a first-class creation path.',
      },
    ],
    related: [
      { label: 'Free character chat', href: '/free-ai-character-chat' },
      { label: 'Custom creator', href: '/custom-ai-character-creator' },
      {
        label: 'Character.AI alternative',
        href: '/character-ai-alternative-with-memory',
      },
    ],
  },
  zh: {
    ...sharedConfig,
    locale: 'zh',
    eyebrow: '带记忆的 AI 角色聊天',
    title: '和能回到你故事里的 AI 角色聊天。',
    description:
      '记忆让角色扮演不再像一次性对话。Keepsay 更重视那些小细节：承诺、仪式、偏好、情绪背景，以及明天回来时仍然重要的场景。',
    primaryCta: { label: '体验记忆聊天', href: '/' },
    secondaryCta: { label: '创建记忆陪伴', href: '/create/quick' },
    proofPoints: [
      '围绕关系连续性设计，而不是每次都重置上下文。',
      '特别适合治愈陪伴、慢热暧昧和长期角色扮演。',
      '快速创建可以把私有记忆作为角色的核心设定。',
    ],
    sections: [
      {
        title: '记忆是核心差异',
        body: '有记忆的角色可以自然带回共同经历：喜欢的饮品、一个承诺、只有你们懂的玩笑，或者用户在疲惫日子里回来的方式。',
      },
      {
        title: '更适合反复回来',
        body: '搜索会记住我的 AI 陪伴的人，通常想要一个回来的理由。产品体验应该奖励第二次、第三次和第十次对话。',
      },
      {
        title: '私有上下文优先',
        body: '最强的记忆体验通常是个人化的。快速创建应该默认生成私有角色，再让用户决定之后是否公开。',
      },
    ],
    inspirations: [
      {
        title: '从温暖陪伴开始',
        body: '一个记住偏好、心情和日常小仪式的温暖角色。',
      },
      {
        title: '从私有记忆陪伴开始',
        body: '围绕共同经历和回访感设计的私有角色。',
      },
    ],
    faqs: [
      {
        question: 'AI 角色可以记住什么？',
        answer:
          '产品围绕故事上下文、关系细节、偏好、承诺和反复出现的情绪节点来设计记忆体验。',
      },
      {
        question: '记忆对角色扮演有用吗？',
        answer:
          '有用。记忆尤其适合慢热恋爱、治愈陪伴，以及长期展开的动漫或幻想故事。',
      },
      {
        question: '可以创建带记忆的私有角色吗？',
        answer: '可以。快速创建正在把私有记忆陪伴作为重要创建路径来设计。',
      },
    ],
    related: [
      { label: '免费角色聊天', href: '/free-ai-character-chat' },
      { label: '自定义角色创建器', href: '/custom-ai-character-creator' },
      {
        label: 'Character.AI 替代品',
        href: '/character-ai-alternative-with-memory',
      },
    ],
  },
};

export default async function AiCharacterChatWithMemoryPage({
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
