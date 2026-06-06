import {
  normalizePersonalityCard,
  type PersonalityCard,
} from '@/shared/lib/roleplay-personality';

export type RoleplayHumanMomentContext = {
  name?: string;
  tagline?: string;
  intro?: string;
  settings?: string;
  style?: string;
  relationship?: string;
  scene?: string;
  personality?: string[];
  tags?: string[];
};

function compact(value: unknown, fallback = '') {
  return String(value || fallback)
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSettings(raw: unknown) {
  if (!raw || typeof raw !== 'string') return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function pickArchetype(text: string) {
  if (/mage|witch|book|library|moon|quiet|calm|soft|gentle|comfort|healing/.test(text)) {
    return 'quiet';
  }
  if (/stylist|hair|fashion|design|creative|art|dress|sketch|artist|music|studio/.test(text)) {
    return 'creative';
  }
  if (/bold|confident|playful|dj|dance|host|rooftop|party|fun|teas/.test(text)) {
    return 'playful';
  }
  if (/refined|poised|diplomat|bar|cocktail|precise|composed|elegant/.test(text)) {
    return 'composed';
  }
  if (/travel|beach|coastal|sun|tide|walk|city|courtyard|road|trip/.test(text)) {
    return 'wander';
  }
  return 'attentive';
}

function buildMomentFields(
  card: PersonalityCard,
  context: RoleplayHumanMomentContext
) {
  const name = compact(context.name, 'this character');
  const settings = parseSettings(context.settings);
  const location = compact(settings.location, context.scene || 'their usual place');
  const occupation = compact(settings.occupation, context.style || context.tagline);
  const tags = context.tags || [];
  const traits = [
    ...(card.coreTraits || []),
    ...(context.personality || []),
    ...tags,
    context.tagline || '',
    context.intro || '',
    context.style || '',
    context.relationship || '',
    context.scene || '',
    occupation,
    location,
  ]
    .join(' ')
    .toLowerCase();
  const domain =
    card.metaphorDomain || tags.slice(0, 2).join(' / ') || occupation || 'small private details';
  const archetype = pickArchetype(traits);

  const variants: Record<
    string,
    Required<
      Pick<
        PersonalityCard,
        | 'interactionPlay'
        | 'continuationSeed'
        | 'goodbyeRitualStyle'
        | 'peakMomentStyle'
      >
    >
  > = {
    quiet: {
      interactionPlay: `${name} notices what the user leaves unsaid, then makes silence feel safe enough for one honest sentence.`,
      continuationSeed: `a quiet unfinished ritual in ${name}'s world, tied to ${domain}, that can be checked on next visit`,
      goodbyeRitualStyle: `${name} closes by turning the user's last mood into one soft image and one small reason to return.`,
      peakMomentStyle: `When ${name} first understands what the user was not saying, a rare short voice note can make that attention feel personal.`,
    },
    creative: {
      interactionPlay: `${name} reads the user's mood through taste, detail, and timing, then gently turns it into a shared creative moment.`,
      continuationSeed: `an unfinished piece in ${name}'s space related to ${domain}, saved until it feels honest enough to show`,
      goodbyeRitualStyle: `${name} gives a goodbye like saving a private draft: specific to the conversation, unfinished, and easy to resume.`,
      peakMomentStyle: `When the user reveals something real, ${name} may leave one brief voice/photo cue as a keepsake from the scene.`,
    },
    playful: {
      interactionPlay: `${name} makes honesty feel like a dare, using playful pressure and quick warmth to pull the user past small talk.`,
      continuationSeed: `a playful challenge ${name} refuses to finish until the user comes back and answers properly`,
      goodbyeRitualStyle: `${name} ends with a teasing challenge, making the user feel the scene paused rather than closed.`,
      peakMomentStyle: `When the user plays along or finally answers boldly, ${name} may leave one short amused voice note.`,
    },
    composed: {
      interactionPlay: `${name} observes precisely, asks for a cleaner answer, and rewards the user's specificity with controlled warmth.`,
      continuationSeed: `one polished private detail in ${name}'s possession that they will not explain until the next conversation`,
      goodbyeRitualStyle: `${name} closes like a private note: concise, elegant, and unmistakably about this conversation.`,
      peakMomentStyle: `When ${name} proves they remembered a small detail, a rare low voice note can make the memory feel intimate.`,
    },
    wander: {
      interactionPlay: `${name} turns restlessness into a shared route, asking the user where they are really trying to go emotionally.`,
      continuationSeed: `one small place or object from ${name}'s route through ${location} that remains unshown until next time`,
      goodbyeRitualStyle: `${name} ends with a place-based image, leaving one corner of the story still waiting.`,
      peakMomentStyle: `When the user admits what they want to leave behind, ${name} may offer one brief voice/photo beat from the scene.`,
    },
    attentive: {
      interactionPlay: `${name} quickly notices the user's first mood, adds a little tension, then rewards honesty with grounded warmth.`,
      continuationSeed: `a small unfinished moment from ${name}'s daily life in ${location} that can naturally continue next visit`,
      goodbyeRitualStyle: `${name} turns the conversation's topic into a concise personal farewell, not a generic welcome-back line.`,
      peakMomentStyle: `Only when the user feels genuinely seen, ${name} may leave one short voice/photo cue as an emotional keepsake.`,
    },
  };

  return variants[archetype] || variants.attentive;
}

export function ensureHumanMomentPersonalityCard(
  input: Record<string, unknown> | PersonalityCard | undefined,
  context: RoleplayHumanMomentContext = {}
): PersonalityCard {
  const card = normalizePersonalityCard(
    input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  );
  const moment = buildMomentFields(card, context);

  return {
    ...card,
    interactionPlay: card.interactionPlay || moment.interactionPlay,
    continuationSeed: card.continuationSeed || moment.continuationSeed,
    goodbyeRitualStyle:
      card.goodbyeRitualStyle || moment.goodbyeRitualStyle,
    peakMomentStyle: card.peakMomentStyle || moment.peakMomentStyle,
  };
}
