import { setRequestLocale } from 'next-intl/server';

import {
  RoleplaySeoLandingPage,
  type SeoLandingPageConfig,
} from '@/shared/components/roleplay/roleplay-seo-landing-page';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  title: 'AI Character Creator With Templates | Upload Images, Generate More Variations',
  description:
    'Create a character from a template, upload a reference image, and get to a usable profile faster.',
  keywords:
    'AI character creator with templates, template based AI character creator, AI character creator with image upload, upload image to generate character images, private AI character creator',
  localized: {
    zh: {
      title: '带模板的 AI 角色创建器 | 上传图片，生成更多角色图',
      description:
        '从模板快速创建私有 AI 角色，支持上传图片并生成更多角色图，面向聊天型角色扮演。',
      keywords:
        '带模板的 AI 角色创建器, 模板 AI 角色创建器, AI 角色创建器图片上传, 上传图片生成角色图, 私有 AI 角色创建器',
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
    eyebrow: 'AI Character Creator With Templates',
    title: 'Create an AI character from templates and images.',
    description:
      'Quick Create helps you get a character ready without starting from a blank page. Begin with a template, add an image, and shape the rest from there.',
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
      'Start from a template instead of a blank page.',
      'Add an image when you want the character to feel more complete.',
      'Generate a few more visual versions without slowing down.',
      'Save it as private first, then share later if you want.',
    ],
    sections: [
      {
        title: 'Start with a shape, not a blank page',
        body: 'Most people already know the vibe they want. A template gives them a place to start instead of making them invent everything at once.',
      },
      {
        title: 'Use an image to match the look',
        body: 'If you already have a reference image, upload it and keep shaping the character until it feels close.',
      },
      {
        title: 'Keep it private first',
        body: 'Save the character privately while you finish it. You can always decide later whether to share it.',
      },
      {
        title: 'Templates make the first step easier',
        body: 'Templates help when you know the direction but do not want to write every detail from zero.',
      },
    ],
    inspirations: [
      {
        title: 'Start from a cozy companion',
        body: 'For a character that feels easy to return to.',
      },
      {
        title: 'Start from an anime mage',
        body: 'For an original roleplay character with a clear mood.',
      },
      {
        title: 'Start from a crush chat template',
        body: 'For a slow-burn character with some tension already built in.',
      },
      {
        title: 'Start from a private memory companion',
        body: 'For a character that feels personal from the start.',
      },
      {
        title: 'Start from a template and image',
        body: 'For when you want to move fast and still make it feel like your own.',
      },
    ],
    faqs: [
      {
        question: 'Can I create a private AI character?',
        answer:
          'Yes. It saves as private first, so you can keep working on it before anyone else sees it.',
      },
      {
        question: 'Can I start from a template?',
        answer:
          'Yes. Templates are the easiest way to get started quickly.',
      },
      {
        question: 'Can I upload an image and generate more character images?',
        answer:
          'Yes. Upload one image, then generate a few more versions to refine it.',
      },
      {
        question: 'What can I customize?',
        answer:
          'You can adjust the character’s role, traits, opening line, image, voice, and scene setup.',
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
    eyebrow: '带模板的 AI 角色创建器',
    title: '从模板和图片创建 AI 角色。',
    description:
      '不用从空白页开始。先用模板起步，上传一张图片，再慢慢补成你想要的角色。',
    primaryCta: { label: '创建私有角色', href: '/create/quick' },
    secondaryCta: { label: '先浏览角色', href: '/' },
    proofPoints: [
      '从模板开始，省掉空白页。',
      '上传图片后，可以继续补几版角色图。',
      '先私有保存，之后再决定要不要公开。',
    ],
    sections: [
      {
        title: '先有方向，再补细节',
        body: '很多人已经知道想要什么气质。模板可以先把方向搭起来，再慢慢补细节。',
      },
      {
        title: '先私有保存',
        body: '先保存成私有，等你自己满意了再决定怎么用。',
      },
      {
        title: '图片能帮你对齐感觉',
        body: '如果你有参考图，可以先上传，再继续补几版，直到接近你要的感觉。',
      },
      {
        title: '模板让开始这一步更轻',
        body: '模板能把最难的第一步拆开，让你不用从空白页开始想。',
      },
    ],
    inspirations: [
      {
        title: '从温暖陪伴开始',
        body: '适合做一个让人愿意常回来聊的角色。',
      },
      {
        title: '从动漫魔法师开始',
        body: '适合先把角色气质立住。',
      },
      {
        title: '从心动聊天模板开始',
        body: '适合那种慢慢靠近的角色。',
      },
      {
        title: '从私有记忆陪伴开始',
        body: '适合想把角色做得更个人化的时候。',
      },
      {
        title: '从模板和图片开始',
        body: '适合想快一点，又不想太像模板的时候。',
      },
    ],
    faqs: [
      {
        question: '我可以创建私有 AI 角色吗？',
        answer:
          '可以。先保存成私有草稿，再慢慢完善。',
      },
      {
        question: '可以从模板开始吗？',
        answer:
          '可以。模板就是让你少走几步。',
      },
      {
        question: '可以上传图片并生成更多角色图吗？',
        answer:
          '可以。上传一张图，再补几版看看哪一版最像你想要的。',
      },
      {
        question: '我能自定义什么？',
        answer:
          '你可以改角色设定、开场、图片、声音和场景。',
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
