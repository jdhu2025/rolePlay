import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import { md5 } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import {
  createRoleplayAsset,
  isMissingRoleplayTable,
  serializeJson,
} from '@/shared/models/roleplay';
import { getUserInfo } from '@/shared/models/user';
import { getStorageService } from '@/shared/services/storage';

const extFromMime = (mimeType: string) => {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
  };
  return map[mimeType] || 'bin';
};

async function uploadRoleplayFile({
  body,
  key,
  contentType,
}: {
  body: Uint8Array;
  key: string;
  contentType: string;
}) {
  try {
    const storageService = await getStorageService();
    const result = await storageService.uploadFile({
      body,
      key,
      contentType,
      disposition: 'inline',
    });

    if (result.success && result.url) {
      return result;
    }

    if (process.env.NODE_ENV === 'production') {
      return result;
    }
  } catch (error: any) {
    if (
      process.env.NODE_ENV === 'production' ||
      !String(error?.message || '').includes('No storage provider configured')
    ) {
      throw error;
    }
  }

  const uploadKey = key.replace(/^\/+/, '');
  const publicPath = path.join(process.cwd(), 'public', 'uploads', uploadKey);
  await mkdir(path.dirname(publicPath), { recursive: true });
  await writeFile(publicPath, body);

  return {
    success: true,
    key,
    url: `/uploads/${uploadKey}`,
    provider: 'local-dev',
  };
}

export async function POST(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const formData = await request.formData();
    const files = [
      ...(formData.getAll('files') as File[]),
      ...(formData.getAll('file') as File[]),
    ].filter((file) => file instanceof File && file.size > 0);
    const type = String(formData.get('type') || 'image');
    const characterId = String(formData.get('characterId') || '') || null;
    const conversationId = String(formData.get('conversationId') || '') || null;
    const messageId = String(formData.get('messageId') || '') || null;

    if (!files.length) {
      return respErr('No files provided');
    }

    const assets = [];

    for (const file of files) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('audio/')) {
        return respErr(`Unsupported file type: ${file.type}`);
      }

      const body = new Uint8Array(await file.arrayBuffer());
      const digest = md5(body);
      const ext = extFromMime(file.type);
      const key = `roleplay/${type}/${user.id}/${digest}.${ext}`;

      const result = await uploadRoleplayFile({
        body,
        key,
        contentType: file.type,
      });

      if (!result.success || !result.url) {
        return respErr(result.error || 'Upload failed');
      }

      const asset = await createRoleplayAsset({
        userId: user.id,
        characterId,
        conversationId,
        messageId,
        type,
        url: result.url,
        storageKey: result.key || key,
        contentType: file.type,
        status: 'created',
        metadata: serializeJson({
          filename: file.name,
          size: file.size,
          provider: result.provider,
        }),
      });
      assets.push(asset);
    }

    return respData({ assets, asset: assets[0] || null });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respErr('roleplay database tables are not migrated yet');
    }
    console.log('upload roleplay asset failed:', e);
    return respErr(e.message || 'upload roleplay asset failed');
  }
}
