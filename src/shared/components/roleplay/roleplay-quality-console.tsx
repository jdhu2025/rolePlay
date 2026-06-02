'use client';

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Target,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Skeleton } from '@/shared/components/ui/skeleton';
import { cn } from '@/shared/lib/utils';

type ReportItem = {
  character: {
    id: string;
    name: string;
    avatarUrl: string;
    tagline: string;
  };
  metrics: {
    conversations: number;
    userMessages: number;
    avgTurns: number;
    avgUserChars: number;
    regenerateCount: number;
    explicitOocCount: number;
    regenerateRate: number;
    evaluationCount: number;
  };
  rubric: {
    voice: number;
    values: number;
    relationship: number;
    immersion: number;
    ooc: number;
  };
  topIssues: { label: string; count: number }[];
  topRecommendations: { label: string; count: number }[];
  cardAudit: {
    overallRisk: 'low' | 'medium' | 'high';
    scores: {
      identity: number;
      visual: number;
      voicePreset: number;
      relationship: number;
      persona: number;
      reply: number;
    };
    conflicts: {
      severity: 'low' | 'medium' | 'high';
      type: string;
      fields: string[];
      evidence: string;
      recommendation: string;
    }[];
    promptFixSuggestions: string[];
    latestSummary: string;
  };
  flags: string[];
  latestSummary: string;
};

type Report = {
  days: number;
  since: string;
  totals: {
    characters: number;
    conversations: number;
    userMessages: number;
    qualityEvents: number;
    evaluations: number;
  };
  items: ReportItem[];
  migrationRequired?: boolean;
};

const WINDOWS = [7, 14, 30] as const;
const RUBRIC_LABELS: Record<keyof ReportItem['rubric'], string> = {
  voice: '声音',
  values: '价值观',
  relationship: '关系',
  immersion: '沉浸',
  ooc: 'OOC',
};
const AUDIT_LABELS: Record<keyof ReportItem['cardAudit']['scores'], string> = {
  identity: '身份',
  visual: '视觉',
  voicePreset: '音色',
  relationship: '关系',
  persona: '人设',
  reply: '回复',
};
const CONFLICT_TYPE_LABELS: Record<string, string> = {
  no_major_conflict: '未发现明显字段冲突',
  gender_visual_conflict: '性别与视觉提示词冲突',
  age_visual_conflict: '年龄与视觉描述冲突',
  relationship_opening_conflict: '关系阶段与开场白冲突',
  relationship_reply_conflict: '关系阶段与回复亲密度冲突',
  persona_style_conflict: '人设与说话风格冲突',
  negative_anchor_conflict: '违反反例约束',
  voice_preset_conflict: '音色与角色设定冲突',
  scene_visual_conflict: '场景与视觉提示词冲突',
  scene_reply_conflict: '场景与回复内容冲突',
  character_consistency_conflict: '角色一致性冲突',
};

export function RoleplayQualityConsole() {
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(14);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);

  const load = useCallback(async (nextDays = days, signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/roleplay/quality/report?days=${nextDays}`,
        { credentials: 'include', cache: 'no-store', signal }
      );
      const payload = await res.json().catch(() => ({}));
      if (signal?.aborted) return;
      if (!res.ok || (payload?.code && payload.code !== 0)) {
        toast.error(payload?.message || 'load report failed');
        setReport(null);
        return;
      }
      setReport(payload.data as Report);
    } catch (error: any) {
      if (!signal?.aborted) toast.error(error?.message || 'load report failed');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    const controller = new AbortController();
    load(days, controller.signal);
    return () => controller.abort();
  }, [days, load]);

  const topRisk = useMemo(() => report?.items?.[0] ?? null, [report]);

  const runEvaluation = async () => {
    setEvaluating(true);
    try {
      const res = await fetch('/api/admin/roleplay/quality/evaluate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ limit: 8 }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || (payload?.code && payload.code !== 0)) {
        toast.error(payload?.message || 'evaluation failed');
        return;
      }
      toast.success(`Evaluated ${payload.data.evaluated} samples`);
      await load(days);
    } catch (error: any) {
      toast.error(error?.message || 'evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <main className="min-h-dvh bg-background px-4 py-5 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Roleplay QA
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              角色质量分析报告
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border p-1">
              {WINDOWS.map((window) => (
                <button
                  key={window}
                  type="button"
                  onClick={() => setDays(window)}
                  data-active={days === window}
                  className="h-8 rounded-md px-3 text-sm text-muted-foreground transition-colors data-[active=true]:bg-foreground data-[active=true]:text-background"
                >
                  {window}d
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => load(days)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted"
            >
              <RefreshCw className="size-4" />
              刷新
            </button>
            <button
              type="button"
              onClick={runEvaluation}
              disabled={evaluating}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-3 text-sm font-semibold text-background hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              {evaluating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <BarChart3 className="size-4" />
              )}
              评测样本
            </button>
          </div>
        </header>

        {report?.migrationRequired ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
            质量表未迁移，请先运行数据库 migration。
          </p>
        ) : loading ? (
          <ReportSkeleton />
        ) : report ? (
          <>
            <section className="grid gap-3 md:grid-cols-4">
              <Metric label="角色数" value={report.totals.characters} icon={Target} />
              <Metric
                label="会话数"
                value={report.totals.conversations}
                icon={MessageSquareText}
              />
              <Metric
                label="用户消息"
                value={report.totals.userMessages}
                icon={Activity}
              />
              <Metric
                label="rubric 样本"
                value={report.totals.evaluations}
                icon={BarChart3}
              />
            </section>

            {topRisk ? (
              <>
                <section className="grid gap-4 lg:grid-cols-[1.1fr_1.9fr]">
                  <RiskBrief item={topRisk} />
                  <AuditBrief item={topRisk} />
                </section>
                <QualityTable items={report.items} />
              </>
            ) : (
              <p className="rounded-lg border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
                暂无角色质量数据。
              </p>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function RiskBrief({ item }: { item: ReportItem }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-300">
          <AlertTriangle className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            当前优先排查
          </p>
          <h2 className="mt-1 truncate text-lg font-semibold">
            {item.character.name}
          </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        重发率 {item.metrics.regenerateRate}% · OOC 标记{' '}
        {item.metrics.explicitOocCount} · 平均 {item.metrics.avgTurns} 轮
      </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {(item.flags.length
          ? item.flags
          : ['暂无明显风险，继续累积反馈与 rubric 样本']
        ).map((flag) => (
          <p
            key={flag}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {flag}
          </p>
        ))}
      </div>
      {item.topRecommendations.length ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            调整方向
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {item.topRecommendations.map((rec) => (
              <span
                key={rec.label}
                className="rounded-full border border-border px-2.5 py-1 text-xs"
              >
                {rec.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AuditBrief({ item }: { item: ReportItem }) {
  const conflicts = item.cardAudit.conflicts;
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          角色卡一致性审计
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">字段冲突和修复方向</h2>
          <RiskBadge risk={item.cardAudit.overallRisk} />
        </div>
        {item.cardAudit.latestSummary ? (
          <p className="text-sm text-muted-foreground">
            {item.cardAudit.latestSummary}
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-1.5 md:grid-cols-2">
        {(Object.keys(item.cardAudit.scores) as (keyof ReportItem['cardAudit']['scores'])[]).map(
          (key) => (
            <RubricBar
              key={key}
              label={AUDIT_LABELS[key]}
              value={item.cardAudit.scores[key]}
            />
          )
        )}
      </div>

      <div className="mt-4 grid gap-2">
        {(conflicts.length
          ? conflicts.slice(0, 3)
          : [
              {
                severity: 'low' as const,
                type: 'no_major_conflict',
                fields: [],
                evidence: '暂无明显字段冲突。',
                recommendation: '继续积累 rubric 样本。',
              },
            ]
        ).map((conflict, idx) => (
          <ConflictCard key={`${conflict.type}-${idx}`} conflict={conflict} />
        ))}
      </div>

      {item.cardAudit.promptFixSuggestions.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {item.cardAudit.promptFixSuggestions.slice(0, 4).map((suggestion) => (
            <span
              key={suggestion}
              className="rounded-full border border-border px-2.5 py-1 text-xs"
            >
              {suggestion}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function RiskBadge({ risk }: { risk: 'low' | 'medium' | 'high' }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        risk === 'high'
          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-200'
          : risk === 'medium'
            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-200'
            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
      )}
    >
      {risk === 'high' ? '高风险' : risk === 'medium' ? '中风险' : '低风险'}
    </span>
  );
}

function ConflictCard({
  conflict,
}: {
  conflict: ReportItem['cardAudit']['conflicts'][number];
}) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <RiskBadge risk={conflict.severity} />
        <span className="text-xs font-medium">
          {readableConflictType(conflict.type)}
        </span>
        {conflict.fields.length ? (
          <span className="text-xs text-muted-foreground">
            {conflict.fields.join(' / ')}
          </span>
        ) : null}
      </div>
      {conflict.evidence ? (
        <p className="mt-1 text-xs text-muted-foreground">
          证据：{conflict.evidence}
        </p>
      ) : null}
      {conflict.recommendation ? (
        <p className="mt-1 text-xs">建议：{conflict.recommendation}</p>
      ) : null}
    </div>
  );
}

function QualityTable({ items }: { items: ReportItem[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-[1.3fr_1fr_1.4fr] border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <span>角色</span>
        <span>rubric</span>
        <span>问题和方向</span>
      </div>
      <div className="divide-y divide-border">
        {items.map((item) => (
          <article
            key={item.character.id}
            className="grid gap-4 px-4 py-4 md:grid-cols-[1.3fr_1fr_1.4fr]"
          >
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">
                {item.character.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {item.character.tagline || 'No tagline'}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {item.metrics.conversations} 会话 · {item.metrics.userMessages}{' '}
                用户消息 · {item.metrics.regenerateRate}% 重发
              </p>
            </div>
            <div className="grid gap-1.5">
              {(Object.keys(item.rubric) as (keyof ReportItem['rubric'])[]).map(
                (key) => (
                  <RubricBar
                    key={key}
                    label={RUBRIC_LABELS[key]}
                    value={item.rubric[key]}
                  />
                )
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-1.5">
                {(item.topIssues.length
                  ? item.topIssues
                  : [{ label: '暂无集中问题', count: 0 }]
                ).map((issue) => (
                  <span
                    key={issue.label}
                    className={cn(
                      'rounded-full px-2 py-1 text-xs',
                      issue.count
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-200'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {issue.label}
                  </span>
                ))}
              </div>
              {item.latestSummary ? (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {item.latestSummary}
                </p>
              ) : null}
              <CharacterAuditMini item={item} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CharacterAuditMini({ item }: { item: ReportItem }) {
  const firstConflict = item.cardAudit.conflicts[0];
  const hasConflict = Boolean(firstConflict);
  const title = hasConflict
    ? readableConflictType(firstConflict.type)
    : '未发现明显字段冲突';
  const detail = hasConflict
    ? firstConflict.evidence || firstConflict.recommendation
    : item.cardAudit.latestSummary ||
      '当前样本里没有发现人设、视觉提示词、音色、关系阶段或回复风格的明显冲突。';

  return (
    <div className="mt-2 rounded-md border border-border bg-background px-2.5 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <RiskBadge risk={item.cardAudit.overallRisk} />
        <span className="text-xs font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">
          {hasConflict
            ? `${item.cardAudit.conflicts.length} 个冲突`
            : '角色卡审计'}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        {detail}
      </p>
      {hasConflict && firstConflict.recommendation ? (
        <p className="mt-1 line-clamp-2 text-xs">
          建议：{firstConflict.recommendation}
        </p>
      ) : null}
    </div>
  );
}

function RubricBar({ label, value }: { label: string; value: number }) {
  const width = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <div className="grid grid-cols-[4rem_1fr_2rem] items-center gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-muted">
        <span
          className={cn(
            'block h-full rounded-full',
            value && value < 3
              ? 'bg-rose-500'
              : value < 4
                ? 'bg-amber-500'
                : 'bg-emerald-500'
          )}
          style={{ width: `${width}%` }}
        />
      </span>
      <span className="text-right tabular-nums text-muted-foreground">
        {value || '-'}
      </span>
    </div>
  );
}

function readableConflictType(type: string) {
  if (CONFLICT_TYPE_LABELS[type]) return CONFLICT_TYPE_LABELS[type];
  return type
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

function ReportSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <Skeleton key={idx} className="h-24 rounded-lg" />
      ))}
    </div>
  );
}
