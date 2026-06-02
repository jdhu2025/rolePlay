#!/usr/bin/env node
/**
 * Upload roleplay character images from public/roleplay/characters/
 * to R2 at {R2_UPLOAD_PATH}/roleplay/characters/{filename}.
 *
 * Usage:
 *   node --env-file=.env.development scripts/data/upload-roleplay-character-images.mjs
 *   node --env-file=.env.development scripts/data/upload-roleplay-character-images.mjs chloe-1.jpeg sienna-1.jpeg
 *
 * Requires: R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY, R2_SECRET_KEY,
 *           R2_UPLOAD_PATH, R2_DOMAIN (R2_ENDPOINT optional).
 *
 * Idempotent: re-uploading the same filename overwrites the same R2 key.
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AwsClient } from 'aws4fetch';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, '..', '..');
const sourceDir = path.join(appDir, 'public', 'roleplay', 'characters');
const SUBPREFIX = 'roleplay/characters';

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
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function publicUrlFor(key) {
  const uploadPath = trimSlashes(cleanEnv('R2_UPLOAD_PATH', 'uploads'));
  const domain = trimSlashes(requiredEnv('R2_DOMAIN'));
  return `${domain}/${uploadPath}/${key}`;
}

async function listLocalFiles() {
  const entries = await readdir(sourceDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
    .sort();
}

async function uploadOne({ client, endpoint, bucket, uploadPath }, filename) {
  const localPath = path.join(sourceDir, filename);
  const body = await readFile(localPath);
  const key = `${SUBPREFIX}/${filename}`;
  const url = `${trimSlashes(endpoint)}/${bucket}/${uploadPath}/${key}`;
  const response = await client.fetch(
    new Request(url, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeTypeFor(localPath),
        'Content-Disposition': 'inline',
        'Content-Length': String(body.length),
      },
      body,
      signal: AbortSignal.timeout(60_000),
    })
  );

  if (!response.ok) {
    throw new Error(
      `${filename} upload failed: ${response.status} ${response.statusText}`
    );
  }

  return { filename, url: publicUrlFor(key) };
}

async function main() {
  const accountId = requiredEnv('R2_ACCOUNT_ID');
  const bucket = requiredEnv('R2_BUCKET_NAME');
  const accessKeyId = requiredEnv('R2_ACCESS_KEY');
  const secretAccessKey = requiredEnv('R2_SECRET_KEY');
  const uploadPath = trimSlashes(cleanEnv('R2_UPLOAD_PATH', 'uploads'));
  const endpoint =
    cleanEnv('R2_ENDPOINT') ||
    `https://${accountId}.r2.cloudflarestorage.com`;
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    region: 'auto',
  });

  const requested = process.argv.slice(2);
  const localFiles = await listLocalFiles();
  if (!localFiles.length) {
    throw new Error(`No image files found under ${sourceDir}`);
  }

  const targets = requested.length
    ? localFiles.filter((name) => requested.includes(name))
    : localFiles;

  if (!targets.length) {
    throw new Error(
      `No matching files. Requested: ${requested.join(', ')}, available: ${localFiles.join(', ')}`
    );
  }

  console.log(
    `Uploading ${targets.length} file(s) from ${sourceDir} to ${endpoint}/${bucket}/${uploadPath}/${SUBPREFIX}/`
  );

  const results = [];
  for (const filename of targets) {
    try {
      const result = await uploadOne(
        { client, endpoint, bucket, uploadPath },
        filename
      );
      results.push(result);
      console.log(`OK  ${filename}  ->  ${result.url}`);
    } catch (error) {
      const cause =
        error instanceof Error && error.cause
          ? ` (${String(error.cause)})`
          : '';
      const message =
        error instanceof Error ? `${error.message}${cause}` : String(error);
      results.push({ filename, error: message });
      console.error(`FAIL ${filename}: ${message}`);
    }
  }

  const failed = results.filter((r) => r.error);
  console.log(
    `\nDone. ${results.length - failed.length}/${results.length} uploaded.`
  );
  if (failed.length) process.exit(1);
}

await main();
