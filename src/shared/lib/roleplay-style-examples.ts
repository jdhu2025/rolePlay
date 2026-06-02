export type RoleplayStyleExample = {
  user: string;
  character: string;
};

export const MAX_STYLE_EXAMPLES = 3;

export function normalizeStyleExamples(raw: unknown): RoleplayStyleExample[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null;
      }
      const user = typeof (item as any).user === 'string'
        ? (item as any).user.trim().slice(0, 500)
        : '';
      const character = typeof (item as any).character === 'string'
        ? (item as any).character.trim().slice(0, 800)
        : '';
      if (!user || !character) return null;
      return { user, character };
    })
    .filter((item): item is RoleplayStyleExample => Boolean(item))
    .slice(0, MAX_STYLE_EXAMPLES);
}

export function parseStyleExamples(raw: string | null | undefined): RoleplayStyleExample[] {
  if (!raw) return [];
  try {
    return normalizeStyleExamples(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function serializeStyleExamples(examples: RoleplayStyleExample[]): string {
  return JSON.stringify(normalizeStyleExamples(examples));
}

export function emptyStyleExample(): RoleplayStyleExample {
  return { user: '', character: '' };
}
