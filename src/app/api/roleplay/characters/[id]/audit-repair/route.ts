import { respData, respErr } from '@/shared/lib/resp';
import {
  generateRoleplayCharacterAuditRepair,
  runRoleplayCharacterPublishAudit,
  simulateRoleplayCharacterAuditRepair,
} from '@/shared/lib/roleplay-publish-audit';
import {
  findRoleplayCharacterById,
  isMissingRoleplayTable,
  RoleplayStatus,
} from '@/shared/models/roleplay';
import { getUserInfo } from '@/shared/models/user';

/**
 * Suggest a form patch for a failed publish audit. The patch is returned to
 * the editor and is not persisted here; the creator can review, tweak, save,
 * then publish again.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');

    const character = await findRoleplayCharacterById(id);
    if (!character || character.userId !== user.id) {
      return respErr('character not found');
    }
    if (
      character.status !== RoleplayStatus.DRAFT &&
      character.status !== RoleplayStatus.REJECTED
    ) {
      return respErr('only draft or rejected characters can be repaired');
    }

    const audit = await runRoleplayCharacterPublishAudit(character, {
      persist: false,
    });
    if (audit.passed) {
      return respData({ audit, beforeAudit: audit, repair: null });
    }

    const repair = await generateRoleplayCharacterAuditRepair({
      character,
      audit,
    });
    const simulated = await simulateRoleplayCharacterAuditRepair({
      character,
      repair,
    });

    return respData({
      audit: simulated.audit,
      beforeAudit: audit,
      repair,
      patched: {
        age: simulated.patched.age,
      },
    });
  } catch (e: any) {
    if (isMissingRoleplayTable(e))
      return respErr('roleplay tables not migrated');
    console.log('repair roleplay character audit failed:', e);
    return respErr(e.message || 'repair roleplay character audit failed');
  }
}
