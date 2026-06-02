#!/usr/bin/env node
/**
 * Validate the official RolePlay character seed data.
 *
 * Checks (no network, no DB, no R2):
 * - There are exactly 12 records.
 * - All ids are unique.
 * - Ids match the rp-NNN convention.
 * - Ages are integers in [18, 25].
 * - sortOrder is unique and 1-based.
 * - avatar is in images.
 * - Every filename in images / avatar exists under public/roleplay/characters/.
 *
 * Run:
 *   node scripts/data/validate-roleplay-characters.mjs
 *
 * Exits 0 on success, 1 with a per-issue listing on failure. Designed to be
 * run after the image agent reports their final filenames so we can catch
 * typos before the upload + seed scripts touch anything.
 */

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, '..', '..');
const dataFile = path.join(appDir, 'src', 'data', 'roleplay-characters.ts');
const imageDir = path.join(appDir, 'public', 'roleplay', 'characters');

/**
 * Parse the typed seed file without compiling TS. We only care about the
 * literal values inside ROLEPLAY_OFFICIAL_CHARACTERS, which are static, so a
 * forgiving regex extractor is enough and avoids dragging in tsc/tsx for a
 * single check.
 */
async function loadCharacters() {
  const source = await readFile(dataFile, 'utf8');
  const start = source.indexOf('ROLEPLAY_OFFICIAL_CHARACTERS');
  if (start < 0) throw new Error('ROLEPLAY_OFFICIAL_CHARACTERS not found');
  const arrayStart = source.indexOf('[', start);
  const arrayEnd = source.indexOf('];', arrayStart);
  if (arrayStart < 0 || arrayEnd < 0)
    throw new Error('Could not bracket the characters array');
  const body = source.slice(arrayStart + 1, arrayEnd);

  // Split on top-level objects: scan brace depth.
  const records = [];
  let depth = 0;
  let buffer = '';
  for (const ch of body) {
    if (ch === '{') {
      if (depth === 0) buffer = '';
      depth += 1;
    }
    if (depth > 0) buffer += ch;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        records.push(buffer);
        buffer = '';
      }
    }
  }

  return records.map((block) => parseRecord(block));
}

function readScalar(block, key) {
  const re = new RegExp(`${key}:\\s*('([^']*)'|"([^"]*)"|(\\d+))`);
  const match = block.match(re);
  if (!match) return undefined;
  if (match[2] !== undefined) return match[2];
  if (match[3] !== undefined) return match[3];
  if (match[4] !== undefined) return Number(match[4]);
  return undefined;
}

function readStringArray(block, key) {
  const re = new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`);
  const match = block.match(re);
  if (!match) return [];
  return [...match[1].matchAll(/'([^']*)'|"([^"]*)"/g)].map(
    (m) => m[1] ?? m[2]
  );
}

function parseRecord(block) {
  return {
    id: readScalar(block, 'id'),
    name: readScalar(block, 'name'),
    age: readScalar(block, 'age'),
    avatar: readScalar(block, 'avatar'),
    sortOrder: readScalar(block, 'sortOrder'),
    images: readStringArray(block, 'images'),
    tags: readStringArray(block, 'tags'),
    personality: readStringArray(block, 'personality'),
  };
}

async function fileExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const issues = [];
  const characters = await loadCharacters();

  if (characters.length !== 12) {
    issues.push(`expected 12 characters, found ${characters.length}`);
  }

  const seenIds = new Map();
  const seenSorts = new Map();
  const idShape = /^rp-\d{3}$/;

  for (const c of characters) {
    const label = c.id || c.name || '<unknown>';
    if (!c.id) {
      issues.push(`${label}: missing id`);
    } else {
      if (!idShape.test(c.id)) {
        issues.push(`${c.id}: id does not match rp-NNN`);
      }
      if (seenIds.has(c.id)) {
        issues.push(`${c.id}: duplicate id (also at #${seenIds.get(c.id)})`);
      } else {
        seenIds.set(c.id, characters.indexOf(c) + 1);
      }
    }

    if (!c.name) issues.push(`${label}: missing name`);
    if (typeof c.age !== 'number' || !Number.isInteger(c.age)) {
      issues.push(`${label}: age must be an integer (got ${c.age})`);
    } else if (c.age < 18 || c.age > 25) {
      issues.push(`${label}: age ${c.age} out of allowed range [18, 25]`);
    }

    if (typeof c.sortOrder !== 'number') {
      issues.push(`${label}: missing sortOrder`);
    } else {
      if (seenSorts.has(c.sortOrder)) {
        issues.push(
          `${label}: duplicate sortOrder ${c.sortOrder} (also on ${seenSorts.get(c.sortOrder)})`
        );
      } else {
        seenSorts.set(c.sortOrder, label);
      }
    }

    if (!c.avatar) issues.push(`${label}: missing avatar`);
    if (!c.images || c.images.length === 0) {
      issues.push(`${label}: images[] is empty`);
    } else if (c.avatar && !c.images.includes(c.avatar)) {
      issues.push(
        `${label}: avatar ${c.avatar} is not present in images [${c.images.join(', ')}]`
      );
    }

    const filenames = [c.avatar, ...(c.images || [])].filter(Boolean);
    for (const filename of filenames) {
      if (!/\.(jpe?g|png|webp)$/i.test(filename)) {
        issues.push(`${label}: ${filename} has unsupported extension`);
      }
      if (filename !== filename.toLowerCase()) {
        issues.push(`${label}: ${filename} should be all lowercase`);
      }
      if (/\s/.test(filename)) {
        issues.push(`${label}: ${filename} contains whitespace`);
      }
      const exists = await fileExists(path.join(imageDir, filename));
      if (!exists) {
        issues.push(
          `${label}: ${filename} does not exist under public/roleplay/characters/`
        );
      }
    }
  }

  // Verify sortOrder is contiguous 1..N
  const sorts = [...seenSorts.keys()].sort((a, b) => a - b);
  for (let i = 0; i < sorts.length; i += 1) {
    if (sorts[i] !== i + 1) {
      issues.push(
        `sortOrder is not contiguous starting at 1 (got [${sorts.join(', ')}])`
      );
      break;
    }
  }

  if (issues.length === 0) {
    console.log(
      `OK: ${characters.length} characters validated against ${imageDir}.`
    );
    process.exit(0);
  }

  console.error(`Found ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}

await main();
