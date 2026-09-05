export const ROLEPLAY_HOME_SEO = {
  brandName: 'Keepsay',
  title: 'Free AI character chat, no sign up | Keepsay',
  subtitle:
    'Meet original characters, keep memory between chats, and create quick roleplay characters from templates or image upload.',
  description:
    'Keepsay is free AI character chat with no sign up, original characters, memory, roleplay scenes, and quick character creation from templates or image upload.',
  keywords: [
    'Keepsay',
    'free AI character chat',
    'AI character chat no sign up',
    'AI character chat no login',
    'AI roleplay',
    'original characters',
    'AI roleplay with memory',
    'quick AI character creator',
    'image upload character creation',
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
