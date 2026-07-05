import type { RoleplayCharacterClient } from '@/shared/lib/roleplay-client';

export type RoleplayCharacterSeoLink = {
  href: string;
  label: string;
  slug?: string;
};

export type RoleplayCharacterSeoProfile = {
  title: string;
  paragraphs: string[];
  bullets: string[];
  relatedLinks: RoleplayCharacterSeoLink[];
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  wordCount: number;
};

function compactText(value: unknown, fallback = '') {
  return String(value || fallback)
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function readableList(items: string[], fallback: string) {
  const cleanItems = items.map((item) => compactText(item)).filter(Boolean);
  if (cleanItems.length === 0) return fallback;
  if (cleanItems.length === 1) return cleanItems[0];
  if (cleanItems.length === 2) return `${cleanItems[0]} and ${cleanItems[1]}`;
  return `${cleanItems.slice(0, -1).join(', ')}, and ${cleanItems.at(-1)}`;
}

function chineseList(items: string[], fallback: string) {
  const cleanItems = items.map((item) => compactText(item)).filter(Boolean);
  return cleanItems.length ? cleanItems.join('、') : fallback;
}

function countEnglishWords(value: string) {
  return value.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)?/g)?.length ?? 0;
}

function dedupeLinks(links: RoleplayCharacterSeoLink[]) {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = link.href;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildRoleplayCharacterSeoProfile({
  character,
  occupation,
  location,
  sceneLinks,
  isZh,
}: {
  character: RoleplayCharacterClient;
  occupation?: string;
  location?: string;
  sceneLinks: RoleplayCharacterSeoLink[];
  isZh: boolean;
}): RoleplayCharacterSeoProfile {
  const name = compactText(character.name, 'this character');
  const role = compactText(
    occupation || character.style,
    'AI roleplay character'
  );
  const place = compactText(
    location || character.scene,
    'a private story scene'
  );
  const intro = compactText(
    character.intro || character.tagline,
    `${name} is a memory-ready AI character for ongoing roleplay.`
  );
  const tagline = compactText(character.tagline || character.intro, intro);
  const opening = compactText(
    character.opening,
    'Start with a small scene and let the story continue from there.'
  );
  const relationship = compactText(
    character.relationship,
    'a character relationship that can develop through return visits'
  );
  const traitsEn = readableList(
    character.personality.slice(0, 5),
    'attentive, grounded, and story-aware'
  );
  const traitsZh = chineseList(
    character.personality.slice(0, 5),
    '细心、稳定、有故事感'
  );
  const tagsEn = readableList(
    [...character.tags, ...sceneLinks.map((link) => link.label)].slice(0, 7),
    'memory chat, private roleplay, and character creation'
  );
  const tagsZh = chineseList(
    [...character.tags, ...sceneLinks.map((link) => link.label)].slice(0, 7),
    '记忆聊天、私有角色扮演、自定义角色'
  );
  const bestForEn = readableList(
    sceneLinks.map((link) => link.label).slice(0, 4),
    'AI character chat with memory'
  );
  const bestForZh = chineseList(
    sceneLinks.map((link) => link.label).slice(0, 4),
    '带记忆的 AI 角色聊天'
  );

  const relatedLinks = dedupeLinks([
    ...sceneLinks,
    {
      href: '/ai-character-chat-with-memory',
      label: isZh ? '带记忆 AI 角色聊天' : 'AI character chat with memory',
    },
    {
      href: '/create-ai-character-with-memory',
      label: isZh ? '创建带记忆角色' : 'Create an AI character with memory',
    },
    {
      href: '/free-ai-character-chat',
      label: isZh ? '免费 AI 角色聊天' : 'Free AI character chat',
    },
  ]).slice(0, 6);

  const paragraphs = isZh
    ? [
        `${name} 是一个适合持续聊天的 Keepsay 角色。角色定位是 ${role}，故事起点在 ${place}。${intro} 这类资料页不是只给你看头像和一句简介，而是帮助你判断这个角色是否适合你的 AI character chat、私有故事和回访式 roleplay。`,
        `如果你想要带记忆的 AI roleplay，可以从 ${name} 的固定场景开始：${tagline}。角色关系更接近${relationship}，语气关键词是 ${traitsZh}。这些细节会让下一次聊天不只是重新开场，而是能回到已经建立过的称呼、地点、情绪和小约定。`,
        `${name} 的开场通常围绕「${opening}」展开。你可以把它当作第一幕，然后继续补充你们见面的原因、今天的情绪、想保留的秘密或一个反复出现的小仪式。Keepsay 的记忆设计适合记录这些上下文，让角色更容易接住“上次聊到哪里”。`,
        `再次回来时，可以直接提醒 ${name} 一个具体线索：比如你们上次停在 ${place}、你希望角色继续记住某个昵称，或者你想让今天的聊天更像朋友、同学、室友、幻想冒险伙伴或安静的治愈陪伴。这样的输入比泛泛地说“继续”更有用，也能让角色资料里的性格和关系设定真正参与下一轮回复。`,
        `这个角色最适合 ${bestForZh}，同时也覆盖 ${tagsZh}。如果你正在比较 Character.AI、Talkie 或其他 AI companion 应用，${name} 的价值在于更私有、更可控的故事连续性：你可以先免费试聊，再把喜欢的设定延伸成自己的私有角色。`,
      ]
    : [
        `${name} is a Keepsay character built for ongoing AI character chat rather than a one-off prompt. The profile starts with a clear role, ${role}, and a usable setting, ${place}. ${intro} That gives searchers and returning users a quick way to decide whether this character fits memory-based roleplay, private companion stories, or a lighter free chat session.`,
        `The strongest way to start with ${name} is to treat the first message as the first scene of a longer story. The profile promise is simple: ${tagline}. The relationship frame is ${relationship}, and the voice leans ${traitsEn}. Those details make the page more than a gallery card; they define how the character should remember tone, places, repeated habits, and emotional context across visits.`,
        `The opening line is a practical entry point: "${opening}" You can answer it directly, add why you came back, name a mood, or introduce a small ritual such as a favorite drink, a private nickname, a shared notebook, or a place you always return to. Keepsay works best when these details become story memory instead of being reset every time you start a new chat.`,
        `${name} is a good fit for ${bestForEn}, while also touching ${tagsEn}. If you are comparing Character.AI alternatives, Talkie alternatives, or custom AI character creators, the useful difference is continuity: start with a public character, test the tone for free, then create a private AI character with memory when you know the story you want to keep.`,
      ];

  const bullets = isZh
    ? [
        `角色定位：${role}`,
        `主要场景：${place}`,
        `适合意图：${bestForZh}`,
        `记忆钩子：称呼、地点、情绪、小仪式和上次场景`,
      ]
    : [
        `Role: ${role}`,
        `Primary setting: ${place}`,
        `Best-fit intent: ${bestForEn}`,
        `Memory hooks: names, places, moods, rituals, and last-scene context`,
      ];

  const faqs = isZh
    ? [
        {
          question: `${name} 适合带记忆聊天吗？`,
          answer: `适合。${name} 的资料里包含角色定位、场景、关系语气和开场线，适合把这些内容延伸成持续 AI roleplay。`,
        },
        {
          question: `我可以用 ${name} 创建私有角色吗？`,
          answer: `可以先用公开角色试聊，确认语气和场景后，再用 Keepsay 创建带记忆的私有角色。`,
        },
        {
          question: `${name} 和普通聊天机器人有什么不同？`,
          answer: `${name} 是围绕故事连续性设计的角色资料，更适合记住反复出现的细节、关系变化和你们上次停下的位置。`,
        },
      ]
    : [
        {
          question: `Is ${name} good for AI character chat with memory?`,
          answer: `Yes. ${name} has a defined role, setting, relationship tone, and opening scene, which makes the profile useful for ongoing roleplay with memory.`,
        },
        {
          question: `Can I create a private character based on ${name}?`,
          answer: `You can start with the public profile, test the tone for free, then create a private AI character with memory when you know which details you want to keep.`,
        },
        {
          question: `How is ${name} different from a generic chatbot?`,
          answer: `${name} is presented as a story character with continuity, so the chat can return to recurring details, relationship context, and the last scene instead of restarting from scratch.`,
        },
      ];

  return {
    title: isZh ? `${name} 的记忆故事指南` : `${name} memory story guide`,
    paragraphs,
    bullets,
    relatedLinks,
    faqs,
    wordCount: countEnglishWords([...paragraphs, ...bullets].join(' ')),
  };
}
