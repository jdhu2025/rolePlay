#!/usr/bin/env node
/**
 * Generate supplemental official RolePlay character images.
 *
 * Writes directly to public/roleplay/characters/{name}-{n}.jpeg and never
 * overwrites existing files. Each prompt uses the existing -1 image as the
 * identity anchor and varies scene, outfit, pose, and lighting only.
 *
 * Usage:
 *   node --env-file=.env.development scripts/data/generate-roleplay-character-supplements.mjs
 *   node --env-file=.env.development scripts/data/generate-roleplay-character-supplements.mjs chloe sienna
 */

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AwsClient } from 'aws4fetch';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, '..', '..');
const sourceDir = path.join(appDir, 'public', 'roleplay', 'characters');
const referencePrefix = 'roleplay/identity-pilot/reference';

const characters = [
  {
    slug: 'chloe',
    name: 'Chloe',
    identity:
      'same soft-spoken young adult fashion student; delicate face, warm natural skin tone, long dark hair, gentle observant expression',
    variants: [
      {
        filename: 'chloe-2.jpeg',
        scene: 'morning-cafe',
        prompt:
          'Create a natural morning cafe dating-profile portrait. She wears a cream ribbed cardigan over a simple white top, seated by a window with a sketchbook and coffee, soft Los Angeles daylight, relaxed half-smile, candid premium lifestyle photography.',
      },
      {
        filename: 'chloe-3.jpeg',
        scene: 'fashion-studio',
        prompt:
          'Create a tasteful fashion-studio portrait. She wears a charcoal slip dress with an oversized tailored blazer, standing near fabric samples and mood boards, clean side light, quiet confident gaze, editorial lifestyle photography.',
      },
    ],
  },
  {
    slug: 'sienna',
    name: 'Sienna',
    identity:
      'same confident young adult Miami stylist; golden warm complexion, blonde hair, polished makeup, bright attentive expression',
    variants: [
      {
        filename: 'sienna-2.jpeg',
        scene: 'rooftop-coffee',
        prompt:
          'Create a golden-hour rooftop coffee portrait. She wears a white linen shirt tucked into tailored tan trousers with small gold hoops, Miami skyline softly blurred behind her, friendly direct eye contact, premium lifestyle photography.',
      },
      {
        filename: 'sienna-3.jpeg',
        scene: 'evening-lounge',
        prompt:
          'Create an upscale evening lounge portrait. She wears a satin champagne blouse with black wide-leg trousers, seated near a low table with warm lamp light and soft city reflections, confident relaxed smile, photorealistic editorial portrait.',
      },
    ],
  },
  {
    slug: 'amara',
    name: 'Amara',
    identity:
      'same warm young adult travel writer; rich brown skin, natural textured dark hair, expressive eyes, easygoing genuine smile',
    variants: [
      {
        filename: 'amara-2.jpeg',
        scene: 'lisbon-bookshop',
        prompt:
          'Create a cozy Lisbon bookshop portrait. She wears a sage wrap dress and delicate earrings, holding a small notebook between warm shelves and tile details, natural afternoon light, thoughtful smile, premium travel lifestyle photography.',
      },
      {
        filename: 'amara-3.jpeg',
        scene: 'terrace-selfie',
        prompt:
          'Create a natural-light terrace portrait with a candid selfie feeling but professional quality. She wears a soft blue linen top, ocean and white buildings blurred behind her, relaxed posture, warm authentic expression, no phone visible.',
      },
    ],
  },
  {
    slug: 'valeria',
    name: 'Valeria',
    identity:
      'same bold young adult Ibiza pool-club host; sun-kissed complexion, dark hair, magnetic direct gaze, playful confident expression',
    variants: [
      {
        filename: 'valeria-2.jpeg',
        scene: 'ibiza-night-entry',
        prompt:
          'Create an Ibiza night-entry portrait outside an upscale venue. She wears a black one-shoulder evening dress with silver earrings, warm doorway light and soft nightlife bokeh behind her, playful confident gaze, photorealistic lifestyle editorial.',
      },
      {
        filename: 'valeria-3.jpeg',
        scene: 'resort-breakfast',
        prompt:
          'Create a bright resort breakfast portrait. She wears a fitted white sundress with a light scarf, seated at an outdoor table with citrus drinks and blurred greenery, direct relaxed smile, tasteful premium dating-profile photography.',
      },
    ],
  },
  {
    slug: 'leila',
    name: 'Leila',
    identity:
      'same graceful young adult Dubai hospitality intern; olive warm skin, dark hair, soft attentive eyes, calm composed expression',
    variants: [
      {
        filename: 'leila-2.jpeg',
        scene: 'quiet-cafe',
        prompt:
          'Create a quiet luxury cafe portrait. She wears a pale rose blouse and tailored ivory trousers, seated near brass details and soft morning light, gentle attentive smile, polished non-explicit lifestyle photography.',
      },
      {
        filename: 'leila-3.jpeg',
        scene: 'gallery-evening',
        prompt:
          'Create an elegant evening gallery portrait. She wears a modest emerald midi dress with delicate jewelry, standing near abstract art and warm track lighting, composed direct gaze, premium editorial photography.',
      },
    ],
  },
  {
    slug: 'priya',
    name: 'Priya',
    identity:
      'same thoughtful young adult Mumbai architect; South Asian features, dark hair, warm brown skin, precise calm gaze',
    variants: [
      {
        filename: 'priya-2.jpeg',
        scene: 'architecture-studio',
        prompt:
          'Create a refined architecture-studio portrait. She wears a sleeveless navy blouse and tailored cream trousers, standing beside drawings and material samples in soft daylight, focused warm expression, premium lifestyle photography.',
      },
      {
        filename: 'priya-3.jpeg',
        scene: 'monsoon-cafe',
        prompt:
          'Create a rainy-window cafe portrait during monsoon season. She wears a rust silk blouse with simple gold jewelry, city rain softly blurred behind glass, thoughtful direct eye contact, cinematic but natural editorial photography.',
      },
    ],
  },
  {
    slug: 'elena',
    name: 'Elena',
    identity:
      'same sweet young adult Florence art-history student; Mediterranean features, brown hair, bright curious eyes, spirited soft smile',
    variants: [
      {
        filename: 'elena-2.jpeg',
        scene: 'museum-courtyard',
        prompt:
          'Create a museum courtyard portrait in Florence. She wears a fitted navy knit top and light linen skirt, holding a small guidebook near pale stone arches, bright clean daylight, curious lively expression, premium travel editorial photography.',
      },
      {
        filename: 'elena-3.jpeg',
        scene: 'evening-gelato',
        prompt:
          'Create a warm evening street portrait after getting gelato. She wears a soft yellow cardigan over a white dress, old-town lights softly blurred behind her, playful natural smile, tasteful photorealistic lifestyle photography.',
      },
    ],
  },
  {
    slug: 'maya',
    name: 'Maya',
    identity:
      'same composed young adult New York creative director; East Asian features, sleek dark hair, refined style, calm decisive gaze',
    variants: [
      {
        filename: 'maya-2.jpeg',
        scene: 'soho-cafe-meeting',
        prompt:
          'Create a Soho cafe meeting portrait. She wears a structured ivory vest with black tailored trousers, seated with a notebook and espresso, soft urban daylight, composed subtle smile, premium editorial lifestyle photography.',
      },
      {
        filename: 'maya-3.jpeg',
        scene: 'gallery-opening',
        prompt:
          'Create a gallery-opening evening portrait. She wears a minimalist black dress with a cropped slate jacket, standing near white walls and blurred guests, cool confident posture, photorealistic fashion editorial portrait.',
      },
    ],
  },
  {
    slug: 'freya',
    name: 'Freya',
    identity:
      'same refined young adult Icelandic cocktail-lounge manager; fair skin, straight shoulder-length pale blonde hair, blue-gray eyes, sculpted delicate face, calm composed gaze',
    variants: [
      {
        filename: 'freya-2.jpeg',
        scene: 'reykjavik-street',
        prompt:
          'Create a crisp Reykjavik street portrait in soft overcast daylight. She wears a charcoal wool coat over a cream turtleneck, pale buildings and harbor air softly blurred behind her, calm expensive presence, photorealistic editorial photography.',
      },
      {
        filename: 'freya-3.jpeg',
        scene: 'private-bar-booth',
        prompt:
          'Create a private cocktail-bar booth portrait. She wears a deep burgundy satin blouse with small pearl earrings, seated in warm low light with glass reflections blurred behind her, composed almost-smile, premium non-explicit nightlife portrait.',
      },
    ],
  },
  {
    slug: 'zuri',
    name: 'Zuri',
    identity:
      'same vibrant young adult Cape Town DJ; warm deep skin tone, short tightly curled black pixie hair, bold lashes, rounded face, joyful magnetic expression',
    variants: [
      {
        filename: 'zuri-2.jpeg',
        scene: 'record-shop',
        prompt:
          'Create a colorful record-shop portrait. She wears a cobalt cropped jacket over a simple black top with hoop earrings, standing between vinyl shelves, bright playful smile, premium music lifestyle photography.',
      },
      {
        filename: 'zuri-3.jpeg',
        scene: 'sunset-rooftop-dj',
        prompt:
          'Create a sunset rooftop DJ portrait. She wears a vivid orange tailored jumpsuit with statement earrings, standing beside turntables with Cape Town lights softly blurred behind her, confident joyful energy, photorealistic editorial photography.',
      },
    ],
  },
  {
    slug: 'camila',
    name: 'Camila',
    identity:
      'same warm young adult coastal biologist; long voluminous copper-red curls, dense natural freckles across face and shoulders, hazel-green eyes, soft full lips',
    variants: [
      {
        filename: 'camila-2.jpeg',
        scene: 'coastal-lab',
        prompt:
          'Create a coastal research-lab lifestyle portrait. She wears a sea-green button shirt with sleeves rolled neatly, standing near sample jars and a sunlit window, freckles visible and natural, grounded warm smile, premium photorealistic photography.',
      },
      {
        filename: 'camila-3.jpeg',
        scene: 'terrace-dinner',
        prompt:
          'Create a Cabo terrace dinner portrait at blue hour. She wears a cream linen dress with small gold earrings, red curls softly moved by ocean wind, freckles clear, relaxed romantic expression, tasteful dating-profile editorial photography.',
      },
    ],
  },
  {
    slug: 'noor',
    name: 'Noor',
    identity:
      'same poised young adult diplomatic attache; Middle Eastern features, warm olive skin, dark hair, composed direct gaze, refined presence',
    variants: [
      {
        filename: 'noor-2.jpeg',
        scene: 'museum-reception',
        prompt:
          'Create a museum reception portrait. She wears an elegant ivory blouse with a long black skirt and delicate jewelry, warm marble and art lighting softly blurred behind her, composed attentive expression, high-end editorial photography.',
      },
      {
        filename: 'noor-3.jpeg',
        scene: 'doha-cafe',
        prompt:
          'Create a refined Doha cafe portrait in late afternoon light. She wears a deep green tailored dress with understated gold earrings, seated beside a window with city architecture softly blurred, calm warm gaze, photorealistic lifestyle portrait.',
      },
    ],
  },
];

function requiredEnv(name) {
  const value = process.env[name]?.trim().replace(/^"|"$/g, '');
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function cleanEnv(name, fallback = '') {
  return (process.env[name] || fallback).trim().replace(/^"|"$/g, '');
}

function trimSlashes(value) {
  return value.replace(/^\/+|\/+$/g, '');
}

function extractUrls(value, urls = new Set()) {
  if (!value) return urls;
  if (typeof value === 'string') {
    const matches = value.match(/https?:\/\/[^\s"'\\]+/g) || [];
    matches.forEach((url) => urls.add(url));
    return urls;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => extractUrls(item, urls));
    return urls;
  }
  if (typeof value === 'object') {
    Object.values(value).forEach((item) => extractUrls(item, urls));
  }
  return urls;
}

async function parseImageUrls(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream')) {
    const text = await response.text();
    const urls = new Set();
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.replace(/^data:\s*/, '');
      if (!payload || payload === '[DONE]') continue;
      try {
        extractUrls(JSON.parse(payload), urls);
      } catch {
        extractUrls(payload, urls);
      }
    }
    return [...urls];
  }

  return [...extractUrls(await response.json())];
}

function publicUrlFor(key) {
  const uploadPath = trimSlashes(cleanEnv('R2_UPLOAD_PATH', 'uploads'));
  const domain = trimSlashes(requiredEnv('R2_DOMAIN'));
  return `${domain}/${uploadPath}/${key}`;
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function uploadReference(character, context) {
  const sourcePath = path.join(sourceDir, `${character.slug}-1.jpeg`);
  const body = await readFile(sourcePath);
  const key = `${referencePrefix}/${character.slug}-1.jpeg`;
  const url = `${trimSlashes(context.endpoint)}/${context.bucket}/${context.uploadPath}/${key}`;
  const response = await context.client.fetch(
    new Request(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': 'inline',
        'Content-Length': String(body.length),
      },
      body,
    })
  );

  if (!response.ok) {
    throw new Error(
      `${character.name} reference upload failed: ${response.status} ${response.statusText}`
    );
  }

  return publicUrlFor(key);
}

async function generateImage(character, variant, referenceUrl) {
  const apiKey = requiredEnv('VOLCENGINE_API_KEY');
  const baseURL = trimSlashes(requiredEnv('VOLCENGINE_BASE_URL'));
  const model = cleanEnv(
    'VOLCENGINE_GENERAL_IMAGE_MODEL',
    'doubao-seedream-5-0-260128'
  );
  const prompt = [
    variant.prompt,
    `Identity lock: use the reference image as the identity anchor for the same adult woman, ${character.name}.`,
    `Preserve: ${character.identity}.`,
    'Preserve her face shape, skin tone, eye shape, hair color, hair texture, age range, and distinctive facial features.',
    'Change only outfit, pose, scene, lighting, and composition.',
    'Dating-profile and lifestyle editorial style, photorealistic, flattering but non-explicit.',
    'No nudity, no lingerie, no swimwear close-up, no text, no watermark, no UI elements.',
  ].join('\n');

  const response = await fetch(`${baseURL}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      watermark: false,
      prompt,
      image: [referenceUrl],
      size: cleanEnv('VOLCENGINE_IMAGE_SIZE', '2k'),
      sequential_image_generation: 'auto',
      sequential_image_generation_options: { max_images: 1 },
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `${character.name} ${variant.scene} generation failed: ${response.status} ${await response.text()}`
    );
  }

  const urls = await parseImageUrls(response);
  if (!urls.length) {
    throw new Error(`${character.name} ${variant.scene} returned no image URL`);
  }
  return urls[0];
}

async function saveGeneratedImage(variant, imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(
      `${variant.filename} download failed: ${response.status} ${response.statusText}`
    );
  }

  const outputPath = path.join(sourceDir, variant.filename);
  await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
  return outputPath;
}

async function main() {
  await mkdir(sourceDir, { recursive: true });

  const accountId = requiredEnv('R2_ACCOUNT_ID');
  const bucket = requiredEnv('R2_BUCKET_NAME');
  const accessKeyId = requiredEnv('R2_ACCESS_KEY');
  const secretAccessKey = requiredEnv('R2_SECRET_KEY');
  const uploadPath = trimSlashes(cleanEnv('R2_UPLOAD_PATH', 'uploads'));
  const endpoint =
    cleanEnv('R2_ENDPOINT') ||
    `https://${accountId}.r2.cloudflarestorage.com`;
  const context = {
    bucket,
    uploadPath,
    endpoint,
    client: new AwsClient({
      accessKeyId,
      secretAccessKey,
      region: 'auto',
    }),
  };

  const requested = new Set(
    process.argv.slice(2).map((value) => value.toLowerCase())
  );
  const selected = requested.size
    ? characters.filter((character) => requested.has(character.slug))
    : characters;
  if (!selected.length) {
    throw new Error(`No matching characters for: ${[...requested].join(', ')}`);
  }

  const results = [];
  for (const character of selected) {
    const referenceUrl = await uploadReference(character, context);
    for (const variant of character.variants) {
      const outputPath = path.join(sourceDir, variant.filename);
      if (await exists(outputPath)) {
        console.log(`SKIP ${variant.filename}: already exists`);
        results.push({ filename: variant.filename, skipped: true });
        continue;
      }

      try {
        console.log(`Generating ${variant.filename} (${character.name}, ${variant.scene})...`);
        const imageUrl = await generateImage(character, variant, referenceUrl);
        const savedPath = await saveGeneratedImage(variant, imageUrl);
        console.log(`OK   ${savedPath}`);
        results.push({ filename: variant.filename, outputPath: savedPath });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`FAIL ${variant.filename}: ${message}`);
        results.push({ filename: variant.filename, error: message });
      }
    }
  }

  const failed = results.filter((result) => result.error);
  const generated = results.filter((result) => result.outputPath);
  const skipped = results.filter((result) => result.skipped);
  console.log(
    `\nDone. ${generated.length} generated, ${skipped.length} skipped, ${failed.length} failed.`
  );
  if (failed.length) process.exit(1);
}

await main();
