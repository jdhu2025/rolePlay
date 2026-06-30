export const ROLEPLAY_HOME_SEO = {
  title: 'Keepsay | AI Character Chat & AI Roleplay',
  subtitle:
    'Crush-style companions, anime personas, and immersive stories for late-night company.',
  description:
    'Keepsay is an AI character chat and AI roleplay app for crush-style stories, anime personas, and immersive companion chats. Create characters with voice, photos, memory, and clear story boundaries as a Character.AI alternative.',
  keywords: [
    'Keepsay',
    'AI Character Chat',
    'AI Roleplay',
    'AI roleplay characters',
    'Best Character AI alternatives',
    'Character.AI alternative',
    'Talkie AI alternative',
    'PolyBuzz alternative',
    'AI companion chat',
    'lonely AI companion',
    'not alone AI chat',
    'crush AI chat',
    'anime AI roleplay',
    'immersive roleplay chat',
    'voice photo memory AI chat',
  ],
} as const;

type CharacterSeoInput = {
  name: string;
  intro?: string | null;
  tagline?: string | null;
  opening?: string | null;
  role?: string | null;
  location?: string | null;
};

function compactText(value: unknown, fallback = '') {
  return String(value || fallback)
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(value: string, maxLength: number) {
  const text = compactText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

export function buildCharacterSeoCopy(character: CharacterSeoInput) {
  const name = compactText(character.name, 'AI character');
  const intro = truncateText(
    character.intro || character.tagline || character.opening || '',
    72
  );
  const role = compactText(character.role);
  const location = compactText(character.location);
  const context = [role, location].filter(Boolean).join(' in ');
  const title = `${name} AI Character Chat | AI Roleplay | Keepsay`;
  const description = [
    `AI Character Chat with ${name}:`,
    intro || 'start an immersive companion story',
    'Explore AI Roleplay with voice, photos, memory, and Character.AI alternative discovery.',
  ].join(' ');

  return {
    title,
    description,
    keywords: [
      name,
      context,
      'AI Character Chat',
      'AI Roleplay',
      'AI roleplay character',
      'Best Character AI alternatives',
      'Character.AI alternative',
      'Talkie AI alternative',
      'PolyBuzz alternative',
      'AI companion chat',
      'lonely AI companion',
      'crush AI chat',
      'anime AI roleplay',
    ].filter(Boolean),
  };
}
