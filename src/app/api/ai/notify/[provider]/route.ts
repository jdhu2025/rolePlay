import { respData, respErr } from '@/shared/lib/resp';
import {
  findAITaskByProviderTaskId,
  UpdateAITask,
  updateAITaskById,
} from '@/shared/models/ai_task';
import { getAIService } from '@/shared/services/ai';

function extractProviderTaskId(provider: string, payload: any) {
  if (provider === 'fal') {
    return payload?.request_id || payload?.requestId || payload?.taskId;
  }

  if (provider === 'replicate') {
    return payload?.id || payload?.taskId;
  }

  if (provider === 'kie') {
    return (
      payload?.data?.taskId ||
      payload?.taskId ||
      payload?.id ||
      payload?.request_id
    );
  }

  return payload?.taskId || payload?.id || payload?.request_id;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const payload = await request.json();
    const providerTaskId = extractProviderTaskId(provider, payload);

    if (!provider || !providerTaskId) {
      return respErr('invalid ai notify payload');
    }

    const task = await findAITaskByProviderTaskId(providerTaskId);
    if (!task) {
      return respErr('ai task not found');
    }

    const aiService = await getAIService();
    const aiProvider = aiService.getProvider(provider);
    if (!aiProvider?.query) {
      const updateTask: UpdateAITask = {
        taskInfo: JSON.stringify(payload),
        taskResult: JSON.stringify(payload),
      };
      await updateAITaskById(task.id, updateTask);
      return respData({ updated: true, taskId: task.id });
    }

    const result = await aiProvider.query({
      taskId: task.taskId || providerTaskId,
      mediaType: task.mediaType,
      model: task.model,
    });

    const updateTask: UpdateAITask = {
      status: result.taskStatus,
      taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
      taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
      creditId: task.creditId,
    };
    await updateAITaskById(task.id, updateTask);

    return respData({ updated: true, taskId: task.id, status: result.taskStatus });
  } catch (e: any) {
    console.log('ai notify failed:', e);
    return respErr(e.message || 'ai notify failed');
  }
}
