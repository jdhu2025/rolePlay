import { setRequestLocale } from 'next-intl/server';

import {
  RoleplaySeoLandingPage,
  type SeoLandingPageConfig,
} from '@/shared/components/roleplay/roleplay-seo-landing-page';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  title: 'Private AI Character Creator With Memory | Keepsay RolePlay',
  description:
    'Create a private AI character with memory, relationship setup, voice, first scene, and story-continuity templates for chat-first roleplay.',
  keywords:
    'private AI character creator, create AI character with memory, custom chat character creator, AI character creator with memory',
  localized: {
    zh: {
      title: '带记忆的私有 AI 角色创建器 | Keepsay RolePlay',
      description:
        '创建带记忆的私有 AI 角色，支持关系设定、语音、首个场景和故事连续性模板，面向聊天型角色扮演。',
      keywords:
        '私有 AI 角色创建器, 创建带记忆的 AI 角色, 自定义聊天角色创建器, 带记忆的 AI 角色创建器',
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
    eyebrow: 'Private AI Character Creator',
    title: 'Create an AI character that remembers the story.',
    description:
      'Quick Create is for chat-first characters, not generic avatar generation. Start with an AI friend, anime school story, roommate roleplay, comfort companion, fantasy adventure, or fictional crush story, then save a private character with a memory seed.',
    primaryCta: { label: 'Create private character', href: '/create/quick' },
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
      'Built for chat characters, not only visual avatars.',
      'Templates include memory seeds, scene hooks, and relationship setup.',
      'New characters save as private drafts before sharing.',
    ],
    sections: [
      {
        title: 'Chat character before avatar',
        body: 'Search results for custom AI character creator often skew toward image makers. Keepsay is different: the character needs a scene, a voice, a relationship start, and memory that can make the next reply feel connected.',
      },
      {
        title: 'Private by default',
        body: 'A personal AI friend, roommate character, fictional crush story, or comfort companion should start private. Public sharing can happen later after the user knows the roleplay works.',
      },
      {
        title: 'Templates with memory hooks',
        body: 'Every quick-create template includes a relationship start, a scene tension, memory seeds, safety boundaries, and a starter memory mode so the character can remember your story.',
      },
    ],
    inspirations: [
      {
        title: 'Start from a cozy companion',
        body: 'For comfort chat, daily rituals, favorite-drink memory, and low-pressure return visits.',
      },
      {
        title: 'Start from an anime mage',
        body: 'For original anime roleplay, fantasy adventure, and a vivid scene that can continue.',
      },
      {
        title: 'Start from a crush chat template',
        body: 'For a fictional crush story with slow-burn tension, almost confessions, and romantic memory.',
      },
      {
        title: 'Start from a private memory companion',
        body: 'For an AI character built around shared history, nicknames, and a story you can resume tomorrow.',
      },
    ],
    faqs: [
      {
        question: 'Can I create a private AI character?',
        answer:
          'Yes. Quick Create saves characters as private drafts first, so an AI friend, comfort companion, roommate roleplay, or fictional crush story can stay personal.',
      },
      {
        question: 'Can I start from a template?',
        answer:
          'Yes. The creator is organized around inspiration templates such as anime roleplay, comfort chat, private memory, and story-first character creation.',
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
    eyebrow: '私有 AI 角色创建器',
    title: '创建会记住故事的 AI 角色。',
    description:
      '快速创建面向聊天型角色，而不是通用头像生成。可以从 AI friend、动漫校园故事、室友角色扮演、治愈陪伴、幻想冒险或虚构心动故事开始，再保存一个带记忆种子的私有角色。',
    primaryCta: { label: '创建私有角色', href: '/create/quick' },
    secondaryCta: { label: '先浏览角色', href: '/' },
    proofPoints: [
      '面向聊天角色，而不只是视觉头像。',
      '模板包含记忆种子、场景钩子和关系设定。',
      '新角色默认先保存为私有草稿。',
    ],
    sections: [
      {
        title: '先是聊天角色，再是头像',
        body: 'custom AI character creator 的搜索结果常常偏向图像生成。Keepsay 更重视聊天角色本身：场景、声音、关系起点，以及能让下一句回复接上的记忆。',
      },
      {
        title: '默认私有',
        body: 'AI friend、室友角色、虚构心动故事或治愈陪伴都应该先保持私有。等用户确认这个角色真的适合角色扮演之后，再考虑公开。',
      },
      {
        title: '带记忆钩子的模板',
        body: '每个快速创建模板都包含关系起点、场景张力、记忆种子、安全边界和 starter memory mode，让角色能记住你的故事。',
      },
    ],
    inspirations: [
      {
        title: '从温暖陪伴开始',
        body: '适合治愈聊天、日常仪式、喜欢的饮料记忆和低压力回访。',
      },
      {
        title: '从动漫魔法师开始',
        body: '适合原创动漫角色扮演、幻想冒险和可以继续的鲜明场景。',
      },
      {
        title: '从心动聊天模板开始',
        body: '适合虚构心动故事、慢热张力、差点说出口的话和浪漫记忆。',
      },
      {
        title: '从私有记忆陪伴开始',
        body: '适合围绕共同经历、昵称和明天还能接上的故事构建 AI 角色。',
      },
    ],
    faqs: [
      {
        question: '我可以创建私有 AI 角色吗？',
        answer:
          '可以。快速创建会先把角色保存成私有草稿，让 AI friend、治愈陪伴、室友角色扮演或虚构心动故事保持个人化。',
      },
      {
        question: '可以从模板开始吗？',
        answer:
          '可以。创建器围绕动漫角色扮演、治愈聊天、私有记忆和故事型角色创建等灵感模板组织，而不是强迫用户从空白开始。',
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
