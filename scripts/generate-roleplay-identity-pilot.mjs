import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AwsClient } from 'aws4fetch';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, '..');
const workspaceDir = path.resolve(appDir, '..');
const outputDir = path.join(
  appDir,
  'output',
  'imagegen',
  'roleplay-identity-pilot'
);
const pilotOutputPath = 'output/imagegen/roleplay-identity-pilot';

const defaultCharacters = [
  {
    id: 'B3',
    name: 'Amara',
    source: `${pilotOutputPath}/A3Amara-reference-face-clean.png`,
    scene: 'beach-club-brunch',
    prompt:
      'Create a bright beach-club brunch portrait. She wears a tailored coral summer dress with delicate gold jewelry, seated near an open-air terrace with ocean light and palm shadows softly blurred behind her, warm genuine smile, photorealistic premium lifestyle photography.',
  },
  {
    id: 'B6',
    name: 'Priya',
    source: ' A6Priya.png',
    scene: 'rooftop-dinner',
    prompt:
      'Create a polished lifestyle portrait at a rooftop dinner after sunset. She wears an elegant emerald evening dress with understated gold jewelry, city lights softly blurred behind her, warm table candlelight on her face, relaxed direct eye contact, tasteful editorial photography.',
  },
  {
    id: 'B7',
    name: 'Elena',
    source: 'A7Elena.png',
    scene: 'old-town-walk',
    prompt:
      'Create a sunlit lifestyle portrait during an old-town cafe walk. She wears a fitted white linen top and a light denim skirt, holding an iced coffee near a stone street corner, bright late-afternoon light, lively but natural expression, premium travel editorial photography.',
  },
  {
    id: 'B8',
    name: 'Maya',
    source: 'A8Maya.png',
    scene: 'creative-studio',
    prompt:
      'Create a modern creative-studio portrait. She wears a chic black sleeveless knit top and tailored trousers, standing beside a large window with sketchbooks and soft daylight in the background, calm confident posture, clean fashion editorial photography.',
  },
  {
    id: 'B9',
    name: 'Freya',
    source:
      `${pilotOutputPath}/A9Freya-reference-face-clean.png`,
    scene: 'cocktail-lounge-v2',
    prompt:
      'Create an upscale cocktail-lounge portrait that keeps the refined cool elegance of the reference. The same fair-skinned blonde woman has straight shoulder-length pale blonde hair, blue-gray eyes, a calm composed gaze, soft matte lips, and a sculpted delicate face. She wears a fitted black satin dress with a slim ivory blazer draped over one shoulder, seated at a marble bar in warm evening light with glass reflections blurred behind her. Keep the mood polished, quiet, expensive, and photorealistic; do not make her generic, overly smiling, or younger-looking.',
  },
  {
    id: 'B10',
    name: 'Zuri',
    source:
      `${pilotOutputPath}/A10Zuri-reference-face-clean.png`,
    scene: 'poolside-afterparty-v2',
    prompt:
      'Create a glamorous poolside afterparty portrait of the exact same woman from the reference. Preserve her short tightly curled black pixie hair, bright smile, warm deep skin tone, bold lashes, softly rounded face, and colorful playful energy. She wears a vivid fuchsia halter dress with statement earrings, standing near a modern rooftop pool at sunset with party lights softly blurred behind her. Keep her hair short, keep her face recognizable, keep a confident joyful expression, photorealistic premium social portrait.',
  },
  {
    id: 'B11',
    name: 'Camila',
    source:
      `${pilotOutputPath}/A11Camila-reference-face-clean.png`,
    scene: 'coastal-sunset-v2',
    prompt:
      'Create a romantic coastal sunset portrait that keeps the same woman from the reference. Preserve her long voluminous copper-red curls, dense natural freckles across face and shoulders, hazel-green eyes, soft full lips, and warm golden-hour complexion. She wears a fitted deep teal evening dress with subtle gold earrings, standing on a sea-view terrace with wind moving her curls and soft sunset rim light. Keep the freckles visible and natural, keep her red curls long and abundant, polished photorealistic dating-profile portrait.',
  },
  {
    id: 'B12',
    name: 'Noor',
    source:
      `${pilotOutputPath}/A12Noor-reference-face-clean.png`,
    scene: 'hotel-lobby',
    prompt:
      'Create a luxurious hotel-lobby portrait at blue hour. She wears a sophisticated midnight-blue dress with delicate jewelry, marble and warm lamps softly blurred behind her, composed direct gaze, high-end photorealistic editorial portrait.',
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

function mimeTypeFor(filePath) {
  return filePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
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

async function uploadReference(character) {
  const accountId = requiredEnv('R2_ACCOUNT_ID');
  const bucket = requiredEnv('R2_BUCKET_NAME');
  const accessKeyId = requiredEnv('R2_ACCESS_KEY');
  const secretAccessKey = requiredEnv('R2_SECRET_KEY');
  const uploadPath = trimSlashes(cleanEnv('R2_UPLOAD_PATH', 'uploads'));
  const endpoint =
    cleanEnv('R2_ENDPOINT') ||
    `https://${accountId}.r2.cloudflarestorage.com`;
  const key = `roleplay/identity-pilot/reference/${character.id.toLowerCase()}-${character.name.toLowerCase()}.png`;
  const sourceBase = character.source.startsWith('output/')
    ? appDir
    : workspaceDir;
  const sourcePath = path.join(sourceBase, character.source);
  const body = await readFile(sourcePath);
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    region: 'auto',
  });
  const url = `${trimSlashes(endpoint)}/${bucket}/${uploadPath}/${key}`;
  const response = await client.fetch(
    new Request(url, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeTypeFor(sourcePath),
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

async function generateImage(character, referenceUrl) {
  const apiKey = requiredEnv('VOLCENGINE_API_KEY');
  const baseURL = trimSlashes(requiredEnv('VOLCENGINE_BASE_URL'));
  const model = cleanEnv(
    'VOLCENGINE_GENERAL_IMAGE_MODEL',
    'doubao-seedream-5-0-260128'
  );
  const prompt = [
    character.prompt,
    `Use the reference image as the identity anchor for the same adult woman, ${character.name}.`,
    'Preserve her facial identity, face shape, skin tone, eye shape, hair color, hair texture, and overall likeness.',
    'Do not replace her with a different model or smooth away distinctive facial features.',
    'Change only outfit, pose, scene, lighting, and composition.',
    'Photorealistic, flattering but non-explicit, natural anatomy, no text, no watermark.',
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
      `${character.name} image generation failed: ${response.status} ${await response.text()}`
    );
  }

  const urls = await parseImageUrls(response);
  if (!urls.length) throw new Error(`${character.name} returned no image URL`);
  return urls[0];
}

async function saveGeneratedImage(character, imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(
      `${character.name} image download failed: ${response.status} ${response.statusText}`
    );
  }

  const outputPath = path.join(
    outputDir,
    `${character.id}${character.name}-${character.scene}.jpeg`
  );
  await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
  return outputPath;
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const requestedIds = new Set(process.argv.slice(2).map((value) => value.toUpperCase()));
  const characters = requestedIds.size
    ? defaultCharacters.filter((character) =>
        requestedIds.has(character.id.toUpperCase())
      )
    : defaultCharacters;
  if (!characters.length) {
    throw new Error(
      `No matching characters found for: ${[...requestedIds].join(', ')}`
    );
  }

  const results = [];
  for (const character of characters) {
    try {
      console.log(`Generating ${character.id} ${character.name}...`);
      const referenceUrl = await uploadReference(character);
      const imageUrl = await generateImage(character, referenceUrl);
      const outputPath = await saveGeneratedImage(character, imageUrl);
      results.push({ character: character.name, outputPath });
      console.log(`Saved ${outputPath}`);
    } catch (error) {
      results.push({
        character: character.name,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(results.at(-1).error);
    }
  }

  console.log('\nIdentity pilot summary');
  for (const result of results) {
    console.log(
      result.outputPath
        ? `OK ${result.character}: ${result.outputPath}`
        : `FAIL ${result.character}: ${result.error}`
    );
  }
}

await main();
