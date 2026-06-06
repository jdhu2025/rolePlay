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
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
    'image/heic': 'heic',
    'image/heif': 'heif',
  };
  return map[mimeType] || '';
};

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const type = String(formData.get('type') || 'image');
    const characterId = String(formData.get('characterId') || '') || null;
    const conversationId = String(formData.get('conversationId') || '') || null;
    const messageId = String(formData.get('messageId') || '') || null;

    console.log('[API] Received files:', files.length);
    files.forEach((file, i) => {
      console.log(`[API] File ${i}:`, {
        name: file.name,
        type: file.type,
        size: file.size,
      });
    });

    if (!files || files.length === 0) {
      return respErr('No files provided');
    }

    const storageService = await getStorageService();
    const uploadResults = [];

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return respErr(`File ${file.name} is not an image`);
      }

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);

      const digest = md5(body);
      const ext = extFromMime(file.type) || file.name.split('.').pop() || 'bin';
      const key = `${digest}.${ext}`;

      // If the same image already exists, reuse its URL to save storage space.
      // (Still depends on provider supporting signed HEAD + public url generation.)
      const exists = await storageService.exists({ key });
      if (exists) {
        const publicUrl = storageService.getPublicUrl({ key });
        if (publicUrl) {
          const asset = await createRoleplayAsset({
            userId: user.id,
            characterId,
            conversationId,
            messageId,
            type,
            url: publicUrl,
            storageKey: key,
            contentType: file.type,
            status: 'created',
            metadata: serializeJson({
              filename: file.name,
              size: file.size,
              deduped: true,
              source: 'storage-upload-image',
            }),
          });

          uploadResults.push({
            url: publicUrl,
            key,
            filename: file.name,
            deduped: true,
            asset,
          });
          continue;
        }
      }

      // Upload to storage
      const result = await storageService.uploadFile({
        body,
        key: key,
        contentType: file.type,
        disposition: 'inline',
      });

      if (!result.success) {
        console.error('[API] Upload failed:', result.error);
        return respErr(result.error || 'Upload failed');
      }

      console.log('[API] Upload success:', result.url);

      uploadResults.push({
        url: result.url,
        key: result.key,
        filename: file.name,
        deduped: false,
        asset: await createRoleplayAsset({
          userId: user.id,
          characterId,
          conversationId,
          messageId,
          type,
          url: result.url || '',
          storageKey: result.key || key,
          contentType: file.type,
          status: 'created',
          metadata: serializeJson({
            filename: file.name,
            size: file.size,
            provider: result.provider,
            deduped: false,
            source: 'storage-upload-image',
          }),
        }),
      });
    }

    console.log(
      '[API] All uploads complete. Returning URLs:',
      uploadResults.map((r) => r.url)
    );

    return respData({
      urls: uploadResults.map((r) => r.url),
      results: uploadResults,
    });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respErr('roleplay database tables are not migrated yet');
    }
    console.error('upload image failed:', e);
    return respErr(e.message || 'upload image failed');
  }
}
