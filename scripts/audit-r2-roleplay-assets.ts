#!/usr/bin/env tsx
/**
 * Audit Cloudflare R2 objects against database references.
 *
 * This script is intentionally read-only. It lists objects under R2_UPLOAD_PATH
 * and compares them with URLs / storage keys found in common DB asset fields.
 *
 * Usage:
 *   pnpm roleplay:audit-r2-assets
 *   pnpm roleplay:audit-r2-assets -- --prefix roleplay/
 *   pnpm roleplay:audit-r2-assets -- --json scripts/data/r2-audit.json
 */

type R2Object = {
  key: string;
  size: number;
  lastModified: string;
};

type DbReference = {
  source: string;
  id?: string;
  field: string;
  objectKey: string;
  raw: string;
};

const IMAGE_EXTENSIONS = new Set([
  'avif',
  'gif',
  'heic',
  'heif',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'webp',
]);

function argValue(name: string) {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (exact) return exact.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1];
  return '';
}

function hasArg(name: string) {
  return process.argv.includes(name);
}

function cleanEnv(name: string, fallback = '') {
  return (process.env[name] || fallback).trim().replace(/^"|"$/g, '');
}

function requiredEnv(name: string) {
  const value = cleanEnv(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, '');
}

function ensureTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`;
}

function xmlDecode(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function readTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? xmlDecode(match[1]) : '';
}

function parseListObjectsXml(xml: string) {
  const objects: R2Object[] = [];
  for (const match of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
    const block = match[1];
    const key = readTag(block, 'Key');
    if (!key) continue;
    objects.push({
      key,
      size: Number(readTag(block, 'Size')) || 0,
      lastModified: readTag(block, 'LastModified'),
    });
  }

  return {
    objects,
    isTruncated: readTag(xml, 'IsTruncated') === 'true',
    nextContinuationToken: readTag(xml, 'NextContinuationToken'),
  };
}

function normalizeEndpoint(endpoint: string, accountId: string) {
  return trimSlashes(
    endpoint || `https://${accountId}.r2.cloudflarestorage.com`
  );
}

function buildObjectKeyNormalizer({
  uploadPath,
  bucket,
  endpoint,
  publicDomain,
}: {
  uploadPath: string;
  bucket: string;
  endpoint: string;
  publicDomain: string;
}) {
  const uploadPrefix = ensureTrailingSlash(trimSlashes(uploadPath || 'uploads'));
  const publicHost = publicDomain ? new URL(publicDomain).host : '';
  const endpointHost = endpoint ? new URL(endpoint).host : '';

  function fromPathname(pathname: string) {
    const path = trimSlashes(decodeURIComponent(pathname));
    const endpointPrefix = ensureTrailingSlash(trimSlashes(`${bucket}/${uploadPrefix}`));
    if (path.startsWith(endpointPrefix)) {
      return path.slice(bucket.length + 1);
    }
    if (path.startsWith(uploadPrefix)) return path;
    return '';
  }

  function normalize(raw: unknown): string {
    if (typeof raw !== 'string') return '';
    const value = raw.trim();
    if (!value) return '';

    if (/^https?:\/\//i.test(value)) {
      try {
        const url = new URL(value);
        if (publicHost && url.host === publicHost) {
          return fromPathname(url.pathname);
        }
        if (endpointHost && url.host === endpointHost) {
          return fromPathname(url.pathname);
        }
      } catch {
        return '';
      }
      return '';
    }

    const clean = trimSlashes(value);
    if (!clean || clean.startsWith('roleplay/characters/')) return '';
    if (clean.startsWith(uploadPrefix)) return clean;
    if (clean.includes('/') || IMAGE_EXTENSIONS.has(clean.split('.').pop() || '')) {
      return `${uploadPrefix}${clean}`;
    }

    return '';
  }

  return normalize;
}

function collectStringLeaves(value: unknown, out: string[]) {
  if (typeof value === 'string') {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStringLeaves(item, out));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectStringLeaves(item, out));
  }
}

function collectRawValues(value: unknown) {
  const values: string[] = [];
  collectStringLeaves(value, values);

  if (typeof value === 'string') {
    try {
      collectStringLeaves(JSON.parse(value), values);
    } catch {
      // Plain text fields are common; ignore JSON parse failures.
    }
  }

  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

async function listR2Objects({
  endpoint,
  bucket,
  prefix,
  accessKeyId,
  secretAccessKey,
}: {
  endpoint: string;
  bucket: string;
  prefix: string;
  accessKeyId: string;
  secretAccessKey: string;
}) {
  const { AwsClient } = await import('aws4fetch');
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    region: 'auto',
  });

  const objects: R2Object[] = [];
  let continuationToken = '';

  do {
    const url = new URL(`${endpoint}/${bucket}`);
    url.searchParams.set('list-type', '2');
    url.searchParams.set('prefix', prefix);
    if (continuationToken) {
      url.searchParams.set('continuation-token', continuationToken);
    }

    const response = await client.fetch(
      new Request(url, {
        method: 'GET',
      })
    );
    if (!response.ok) {
      throw new Error(`R2 list failed: ${response.status} ${response.statusText}`);
    }

    const parsed = parseListObjectsXml(await response.text());
    objects.push(...parsed.objects);
    continuationToken = parsed.isTruncated ? parsed.nextContinuationToken : '';
  } while (continuationToken);

  return objects;
}

async function readDbReferences(normalizeObjectKey: (raw: unknown) => string) {
  const postgres = (await import('postgres')).default;
  const databaseUrl = requiredEnv('DATABASE_URL');
  const schemaName = cleanEnv('DB_SCHEMA', 'public');
  const sql = postgres(databaseUrl, {
    prepare: false,
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    connection:
      schemaName && schemaName !== 'public'
        ? { options: `-c search_path=${schemaName}` }
        : undefined,
  });

  const refs: DbReference[] = [];

  async function scanRows(
    source: string,
    query: () => Promise<Array<Record<string, unknown>>>,
    fields: string[]
  ) {
    const rows = await query();
    for (const row of rows) {
      const id = typeof row.id === 'string' ? row.id : undefined;
      for (const field of fields) {
        for (const raw of collectRawValues(row[field])) {
          const objectKey = normalizeObjectKey(raw);
          if (!objectKey) continue;
          refs.push({ source, id, field, objectKey, raw });
        }
      }
    }
  }

  try {
    await scanRows(
      'user',
      () => sql`select id, image from "user" where image is not null and image <> ''`,
      ['image']
    );
    await scanRows(
      'taxonomy',
      () => sql`select id, image from taxonomy where image is not null and image <> ''`,
      ['image']
    );
    await scanRows(
      'post',
      () => sql`select id, image, author_image from post`,
      ['image', 'author_image']
    );
    await scanRows(
      'roleplay_character',
      () => sql`select id, avatar_url, cover_url, gallery, metadata from roleplay_character`,
      ['avatar_url', 'cover_url', 'gallery', 'metadata']
    );
    await scanRows(
      'roleplay_conversation',
      () => sql`select id, character_snapshot, metadata from roleplay_conversation`,
      ['character_snapshot', 'metadata']
    );
    await scanRows(
      'roleplay_message',
      () => sql`select id, media, metadata from roleplay_message`,
      ['media', 'metadata']
    );
    await scanRows(
      'roleplay_asset',
      () => sql`select id, url, storage_key, metadata from roleplay_asset`,
      ['url', 'storage_key', 'metadata']
    );
  } finally {
    await sql.end({ timeout: 5 });
  }

  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.source}:${ref.id || ''}:${ref.field}:${ref.objectKey}:${ref.raw}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  if (hasArg('--help')) {
    console.log(`
Audit R2 objects against database references.

Options:
  --prefix <path>   Override object prefix. Defaults to R2_UPLOAD_PATH.
  --json <path>     Write full report JSON to this file.
  --help            Show this help.
`);
    return;
  }

  const accountId = requiredEnv('R2_ACCOUNT_ID');
  const bucket = requiredEnv('R2_BUCKET_NAME');
  const accessKeyId = requiredEnv('R2_ACCESS_KEY');
  const secretAccessKey = requiredEnv('R2_SECRET_KEY');
  const uploadPath = trimSlashes(cleanEnv('R2_UPLOAD_PATH', 'uploads'));
  const prefix = ensureTrailingSlash(trimSlashes(argValue('--prefix') || uploadPath));
  const endpoint = normalizeEndpoint(cleanEnv('R2_ENDPOINT'), accountId);
  const publicDomain = cleanEnv('R2_DOMAIN');
  const normalizeObjectKey = buildObjectKeyNormalizer({
    uploadPath,
    bucket,
    endpoint,
    publicDomain,
  });

  const [objects, references] = await Promise.all([
    listR2Objects({
      endpoint,
      bucket,
      prefix,
      accessKeyId,
      secretAccessKey,
    }),
    readDbReferences(normalizeObjectKey),
  ]);

  const objectByKey = new Map(objects.map((object) => [object.key, object]));
  const refsByObject = new Map<string, DbReference[]>();
  for (const ref of references) {
    const list = refsByObject.get(ref.objectKey) || [];
    list.push(ref);
    refsByObject.set(ref.objectKey, list);
  }

  const referencedObjects = objects.filter((object) => refsByObject.has(object.key));
  const orphanObjects = objects.filter((object) => !refsByObject.has(object.key));
  const missingObjects = Array.from(refsByObject.keys())
    .filter((key) => !objectByKey.has(key))
    .sort()
    .map((key) => ({
      key,
      references: refsByObject.get(key) || [],
    }));

  const report = {
    generatedAt: new Date().toISOString(),
    bucket,
    prefix,
    totals: {
      objects: objects.length,
      referencedObjects: referencedObjects.length,
      orphanObjects: orphanObjects.length,
      missingObjects: missingObjects.length,
      references: references.length,
      bytes: objects.reduce((sum, object) => sum + object.size, 0),
      orphanBytes: orphanObjects.reduce((sum, object) => sum + object.size, 0),
    },
    orphanObjects,
    missingObjects,
    referencedObjects: referencedObjects.map((object) => ({
      ...object,
      references: refsByObject.get(object.key) || [],
    })),
  };

  const jsonPath = argValue('--json');
  if (jsonPath) {
    const { mkdir, writeFile } = await import('node:fs/promises');
    const path = await import('node:path');
    await mkdir(path.dirname(jsonPath), { recursive: true });
    await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  console.log(`R2 audit complete: ${bucket}/${prefix}`);
  console.log(`Objects: ${report.totals.objects}`);
  console.log(`Referenced: ${report.totals.referencedObjects}`);
  console.log(`Orphans: ${report.totals.orphanObjects}`);
  console.log(`Missing referenced objects: ${report.totals.missingObjects}`);
  console.log(`Bytes: ${report.totals.bytes}`);
  console.log(`Orphan bytes: ${report.totals.orphanBytes}`);
  if (jsonPath) console.log(`Report: ${jsonPath}`);

  if (orphanObjects.length) {
    console.log('\nTop orphan candidates:');
    orphanObjects.slice(0, 20).forEach((object) => {
      console.log(`- ${object.key} (${object.size} bytes, ${object.lastModified})`);
    });
  }

  if (missingObjects.length) {
    console.log('\nMissing objects referenced by DB:');
    missingObjects.slice(0, 20).forEach((item) => {
      console.log(`- ${item.key} (${item.references.length} reference(s))`);
    });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
