import { setRequestLocale } from 'next-intl/server';

import {
  RoleplaySeoLandingPage,
  type SeoLandingPageConfig,
} from '@/shared/components/roleplay/roleplay-seo-landing-page';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  title: 'Custom AI Character Creator | Keepsay RolePlay',
  description:
    'Create a custom AI character with personality, relationship, memory, voice, first scene, and private roleplay templates.',
  keywords:
    'custom AI character creator, create AI character, private AI character, AI character creator with memory',
  localized: {
    zh: {
      title: '自定义 AI 角色创建器 | Keepsay RolePlay',
      description:
        '创建自定义 AI 角色，支持性格、关系、记忆、语音、首个场景和私有角色模板。',
      keywords:
        '自定义 AI 角色创建器, 创建 AI 角色, 私有 AI 角色, 带记忆的 AI 角色创建器',
    },
  },
  canonicalUrl: '/custom-ai-character-creator',
});

const sharedConfig = {
  canonicalPath: '/custom-ai-character-creator',
  sceneSlugs: [
    'custom_character',
    'private_character_template',
    'memory_companion',
  ],
  characterIds: [
    'rp-006',
    'rp-008',
    'rp-012',
    'rp-anime-001',
    'rp-anime-005',
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
    eyebrow: 'Custom AI Character Creator',
    title: 'Create a private AI character from a scene, not a blank prompt.',
    description:
      'Quick Create starts with intent: anime roleplay, crush chat, comfort companion, or private character. Pick an inspiration template, tune the relationship, and save a character that is private by default.',
    primaryCta: { label: 'Create custom character', href: '/create/quick' },
    secondaryCta: { label: 'Browse characters first', href: '/' },
    sceneSlugs: [
      'custom_character',
      'private_character_template',
      'memory_companion',
    ],
    characterIds: [
      'rp-006',
      'rp-008',
      'rp-012',
      'rp-anime-001',
      'rp-anime-005',
      'rp-anime-019',
    ],
    proofPoints: [
      'Starts from scene intent instead of a blank form.',
      'Inspiration templates cover cozy, anime, crush, and private memory.',
      'New characters save as private drafts first.',
    ],
    sections: [
      {
        title: 'Scene before settings',
        body: 'Users do not usually want to configure a prompt from scratch. They want a feeling: an anime mage, a cozy companion, a crush chat, or a private memory companion.',
      },
      {
        title: 'Private by default',
        body: 'The creator should treat personal characters as private first. Public sharing can happen later after the user knows the roleplay works.',
      },
      {
        title: 'Templates with memory hooks',
        body: 'Every quick-create template should include a relationship start, a tension, memory seeds, safety boundaries, and a starter memory mode.',
      },
    ],
    inspirations: [
      {
        title: 'Start from a cozy companion',
        body: 'For comfort, daily rituals, and low-pressure return visits.',
      },
      {
        title: 'Start from an anime mage',
        body: 'For original fantasy roleplay with a vivid scene and magical ritual.',
      },
      {
        title: 'Start from a crush chat template',
        body: 'For slow-burn tension, almost confessions, and romantic memory.',
      },
      {
        title: 'Start from a private memory companion',
        body: 'For a private character built around shared history.',
      },
    ],
    faqs: [
      {
        question: 'Can I create a private AI character?',
        answer:
          'Yes. Quick Create saves characters as private drafts first, so the experience can stay personal.',
      },
      {
        question: 'Can I start from a template?',
        answer:
          'Yes. The creator is being organized around inspiration templates instead of forcing users to start blank.',
      },
      {
        question: 'What can I customize?',
        answer:
          'You can tune the relationship, user role, traits, opening hook, memory seed, image, voice style, and scene instructions.',
      },
    ],
    related: [
      { label: 'Anime roleplay', href: '/anime-ai-roleplay-characters' },
      { label: 'AI chat with memory', href: '/ai-character-chat-with-memory' },
      {
        label: 'Character.AI alternative',
        href: '/character-ai-alternative-with-memory',
      },
    ],
  },
  zh: {
    ...sharedConfig,
    locale: 'zh',
    eyebrow: '自定义 AI 角色创建器',
    title: '从场景开始创建私有 AI 角色，而不是从空白提示词开始。',
    description:
      '快速创建会先从意图出发：动漫角色扮演、心动聊天、治愈陪伴，或私有角色。先选灵感模板，再调节关系，最后保存成默认私有的角色。',
    primaryCta: { label: '创建自定义角色', href: '/create/quick' },
    secondaryCta: { label: '先浏览角色', href: '/' },
    proofPoints: [
      '先从场景意图出发，而不是空白表单。',
      '灵感模板覆盖治愈、动漫、心动和私有记忆。',
      '新角色默认先保存为私有草稿。',
    ],
    sections: [
      {
        title: '先场景，后设置',
        body: '用户通常不是想从零配置一个 prompt，而是先要一个感觉：动漫魔法师、温暖陪伴、心动聊天，或者私有记忆陪伴。',
      },
      {
        title: '默认私有',
        body: '创建器应该把个人角色先当成私有内容处理。等用户确认这个角色真的适合角色扮演之后，再考虑公开。',
      },
      {
        title: '带记忆钩子的模板',
        body: '每个快速创建模板都应该包含关系起点、张力、记忆种子、安全边界和 starter memory mode。',
      },
    ],
    inspirations: [
      {
        title: '从温暖陪伴开始',
        body: '适合治愈、日常仪式和反复回来的低压力陪伴。',
      },
      {
        title: '从动漫魔法师开始',
        body: '适合有明确场景和魔法仪式感的原创幻想角色扮演。',
      },
      {
        title: '从心动聊天模板开始',
        body: '适合慢热张力、差点说出口的话和浪漫记忆。',
      },
      {
        title: '从私有记忆陪伴开始',
        body: '适合围绕共同历史构建的私有角色。',
      },
    ],
    faqs: [
      {
        question: '我可以创建私有 AI 角色吗？',
        answer: '可以。快速创建会先把角色保存成私有草稿，让体验保持个人化。',
      },
      {
        question: '可以从模板开始吗？',
        answer:
          '可以。创建器正在围绕灵感模板来组织，而不是强迫用户从空白开始。',
      },
      {
        question: '我能自定义什么？',
        answer:
          '你可以调整关系、用户身份、性格、开场钩子、记忆种子、图片、语音风格和场景说明。',
      },
    ],
    related: [
      { label: '动漫角色扮演', href: '/anime-ai-roleplay-characters' },
      { label: '带记忆 AI 聊天', href: '/ai-character-chat-with-memory' },
      {
        label: 'Character.AI 替代品',
        href: '/character-ai-alternative-with-memory',
      },
    ],
  },
};

export default async function CustomAiCharacterCreatorPage({
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
