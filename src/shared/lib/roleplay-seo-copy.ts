export const ROLEPLAY_HOME_SEO = {
  brandName: 'Keepsay',
  title: 'Keepsay AI Character Chat With Memory',
  subtitle:
    'Discover AI characters for anime, comfort, fantasy, and private stories that remember names, scenes, and the small details you bring back.',
  description:
    'Keepsay is an AI character chat app for memory-led roleplay, anime stories, comfort companions, fantasy scenes, and private characters.',
  keywords: [
    'Keepsay',
    'AI character chat',
    'AI roleplay with memory',
    'AI character chat with memory',
    'create AI character with memory',
    'private AI character creator',
    'Character.AI alternative with memory',
    'Talkie AI alternative with memory',
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
    58
  );
  const role = compactText(character.role);
  const location = compactText(character.location);
  const context = [role, location].filter(Boolean).join(' in ');
  const title = `${name} AI Character Chat | AI Roleplay | Keepsay`;
  const description = truncateText(
    `Chat with ${name}, ${intro || 'an AI roleplay character'}, on Keepsay. Build a private story with memory and scene continuity.`,
    155
  );

  return {
    title,
    description,
    keywords: [
      name,
      context,
      'AI Character Chat',
      'AI Roleplay',
      'AI roleplay character',
      'AI character chat with memory',
      'Character.AI alternative with memory',
      'Talkie AI alternative with memory',
      'AI companion chat with memory',
      'anime AI roleplay',
    ].filter(Boolean),
  };
}
