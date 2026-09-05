import { setRequestLocale } from 'next-intl/server';

import {
  RoleplaySeoLandingPage,
  type SeoLandingPageConfig,
} from '@/shared/components/roleplay/roleplay-seo-landing-page';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  title: 'AI Character Chat With Memory | Free Chat, Roleplay & Original Characters',
  description:
    'AI character chat with memory when you want a story to keep going instead of restarting each time.',
  keywords:
    'AI character chat with memory, AI companion that remembers you, AI roleplay with memory, original characters, character chat no login',
  localized: {
    zh: {
      title: '带记忆的 AI 角色聊天 | 免费聊天、角色扮演与原创角色',
      description:
        '带记忆的 AI 角色聊天，适合长期角色扮演、原创角色、私有故事细节和能延续上下文的聊天。',
      keywords:
        '带记忆的 AI 角色聊天, 记得你的 AI 陪伴, 带记忆 AI 角色扮演, 原创角色, 免登录 AI 角色聊天',
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
    title: 'Chat with AI characters that can return to your story and keep the details.',
    description:
      'Memory keeps a story from resetting. It helps a character remember the little things that make the next chat feel familiar.',
    primaryCta: { label: 'Start free chat', href: '/' },
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
      'Pick up where the last chat left off.',
      'Keep small details without starting over.',
      'Create a private character when you want the story to stick.',
      'Templates and images help you move faster.',
    ],
    sections: [
      {
        title: 'No need to repeat yourself',
        body: 'A character with memory can remember a drink, a promise, or a small habit, so you do not have to explain it again every time.',
      },
      {
        title: 'Built for the stories you return to',
        body: 'The best memory chat feels like coming back to someone who already knows the setup.',
      },
      {
        title: 'Private makes it feel personal',
        body: 'Quick Create starts private, because the story usually feels more real when it stays close.',
      },
      {
        title: 'Templates and images speed up creation',
        body: 'Templates and images help users get to a usable character faster, without building everything from scratch.',
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
          'It can remember the small things that matter in a story: a preference, a promise, or a detail from the last chat.',
      },
      {
        question: 'Is memory useful for roleplay?',
        answer:
          'Yes. It helps when you want the story to feel continuous instead of reset.',
      },
      {
        question: 'Can I create a private character with memory?',
        answer:
          'Yes. Quick Create starts private so the memory stays with the character.',
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
    title: '和能回到你故事里的 AI 角色聊天，并记住细节。',
    description:
      '记忆让角色扮演不用每次都从头开始。它会记住那些小细节，让下一次聊天还是熟悉的。',
    primaryCta: { label: '开始免费聊天', href: '/' },
    secondaryCta: { label: '创建记忆陪伴', href: '/create/quick' },
    proofPoints: [
      '直接接上上一次聊天。',
      '记住细节，而不是每次重开。',
      '先做私有角色，再慢慢补故事。',
      '模板和图片让创建快一点。',
    ],
    sections: [
      {
        title: '记忆是核心差异',
        body: '有记忆的角色会自然记住饮料、承诺或习惯，不用每次都重新解释。',
      },
      {
        title: '更适合反复回来',
        body: '如果角色已经认识你，第二次聊天就会轻很多。这种感觉会让人更愿意回来。',
      },
      {
        title: '私有上下文优先',
        body: '记忆最适合先放在私有角色里，这样故事会更完整，也更安心。',
      },
      {
        title: '模板和图片让创建更快',
        body: '模板和图片只是帮你少做几步，让角色更快变成可用的样子。',
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
          '它会记住故事里真正重要的小事：偏好、承诺，或者上一次聊过的细节。',
      },
      {
        question: '记忆对角色扮演有用吗？',
        answer:
          '有用。它会让故事更连贯，不用每次都从头解释。',
      },
      {
        question: '可以创建带记忆的私有角色吗？',
        answer: '可以。快速创建一开始就是私有的。',
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
