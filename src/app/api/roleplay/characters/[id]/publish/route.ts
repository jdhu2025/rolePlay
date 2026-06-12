import { respData, respErr } from '@/shared/lib/resp';
import { createRoleplayAuthRequiredPayload } from '@/shared/lib/roleplay-ai';
import {
  assertRoleplayCreditsAvailable,
  consumeRoleplayCredits,
  getRoleplayRequestIdempotencyKey,
  isRoleplayInsufficientCreditsError,
} from '@/shared/lib/roleplay-billing';
import { runRoleplayCharacterPublishAudit } from '@/shared/lib/roleplay-publish-audit';
import {
  findRoleplayCharacterById,
  isMissingRoleplayTable,
  RoleplayStatus,
  RoleplayVisibility,
  updateRoleplayCharacter,
} from '@/shared/models/roleplay';
import { getOptionalUserInfo } from '@/shared/models/user';

/**
 * Publish a character from DRAFT (or REJECTED).
 *
 * Why a separate endpoint instead of a PATCH field: making the moderation
 * transition explicit keeps the PATCH idempotent for content edits and
 * lets us hook moderation triggers (notifications, queue insert, ...)
 * without the client having to know about them.
 *
 * P3-5 rule: publish is always gated by a card-consistency audit. Private
 * publishing becomes PUBLISHED + PRIVATE immediately after passing; public
 * publishing becomes UNDER_REVIEW + PUBLIC and still needs admin approval.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getOptionalUserInfo();
    if (!user) {
      return respErr(
        'no auth, please sign in',
        createRoleplayAuthRequiredPayload()
      );
    }

    const character = await findRoleplayCharacterById(id);
    if (!character || character.userId !== user.id) {
      return respErr('character not found');
    }

    if (
      character.status !== RoleplayStatus.DRAFT &&
      character.status !== RoleplayStatus.REJECTED
    ) {
      return respErr('only draft or rejected characters can be published');
    }

    if (!character.name?.trim()) {
      return respErr('character name is required before publishing');
    }
    if (!character.settings?.trim()) {
      return respErr('character settings are required before publishing');
    }

    const body = await request.json().catch(() => ({}));
    const idempotencyKey = getRoleplayRequestIdempotencyKey(
      request,
      body?.requestId
    );
    const publishVisibility =
      body?.visibility === RoleplayVisibility.PUBLIC
        ? RoleplayVisibility.PUBLIC
        : RoleplayVisibility.PRIVATE;

    const billingPreview = await assertRoleplayCreditsAvailable({
      userId: user.id,
      action:
        publishVisibility === RoleplayVisibility.PUBLIC
          ? 'roleplay_publish_public'
          : 'roleplay_publish_private',
      idempotencyKey,
    });

    const audit = await runRoleplayCharacterPublishAudit(character);
    if (!audit.passed) {
      return respData({
        blocked: true,
        audit,
      });
    }

    const consumedCredit =
      publishVisibility === RoleplayVisibility.PUBLIC
        ? await consumeRoleplayCredits({
            userId: user.id,
            action: 'roleplay_publish_public',
            description: 'roleplay public character submission',
            metadata: {
              characterId: character.id,
              visibility: publishVisibility,
            },
            idempotencyKey,
          })
        : null;

    const updated = await updateRoleplayCharacter(id, {
      status:
        publishVisibility === RoleplayVisibility.PUBLIC
          ? RoleplayStatus.UNDER_REVIEW
          : RoleplayStatus.PUBLISHED,
      visibility: publishVisibility,
      rejectionReason: '',
    });

    return respData({
      character: {
        id: updated.id,
        status: updated.status,
        visibility: updated.visibility,
      },
      audit,
      billing: {
        action:
          publishVisibility === RoleplayVisibility.PUBLIC
            ? 'roleplay_publish_public'
            : 'roleplay_publish_private',
        costCredits: billingPreview.costCredits,
        freePlay: billingPreview.freePlay,
        consumedCreditId: consumedCredit?.id || '',
      },
    });
  } catch (e: any) {
    if (isMissingRoleplayTable(e))
      return respErr('roleplay tables not migrated');
    console.log('publish roleplay character failed:', e);
    if (isRoleplayInsufficientCreditsError(e)) {
      return respErr(e.message, e.data);
    }
    return respErr(e.message || 'publish roleplay character failed');
  }
}
