import { queryOptions } from '@tanstack/react-query';
import { Router, SCOPE_BOUNDARY, taskAdapter, vaultAdapter } from 'epicenter-libs';
import { type TaskReadOutView, type TickState } from '~/types/task';

/**
 * Every Task API operation the demo needs — create, list, cancel — is facilitator-gated
 * on the platform, so this module calls Epicenter directly with the facilitator's own
 * session. The proxy is involved only as the task's TARGET: the scheduled fire POSTs to
 * the proxy's `/tick` route (see `proxy/index.js`), which is the one capability a client
 * cannot host itself.
 *
 * Task and vault are both scoped to an EPISODE, so each episode carries its own
 * independent task and tick state; starting a new episode is a clean slate.
 */

const TASK_NAME = 'task-tick';

/** Must match TICK_VAULT in proxy/index.js. */
const TICK_VAULT = 'task-tick';

/**
 * Interval presets, as Quartz cron (seconds first). Five minutes is the platform floor:
 * anything scheduled sooner than five minutes out is silently clamped to now + 5 minutes,
 * at creation and at every reschedule — a faster cron doesn't error, it just degrades to
 * a 5-minute metronome. The first fire of any task lands ~5 minutes after creation.
 */
export const INTERVALS = [
  { label: 'Every 5 minutes', cron: '0 0/5 * * * ?' },
  { label: 'Every 15 minutes', cron: '0 0/15 * * * ?' },
  { label: 'Every hour', cron: '0 0 * * * ?' },
] as const;

/** Tasks self-destruct after this long even if nobody cancels them — demo hygiene. */
const FAIL_SAFE_MS = 2 * 60 * 60 * 1000;

const TERMINAL_STATUSES = ['cancelled', 'terminated'];

const episodeScope = (episodeKey: string) => ({
  scopeBoundary: SCOPE_BOUNDARY.EPISODE,
  scopeKey: episodeKey,
});

const demoTasks = async (scope: ReturnType<typeof episodeScope>) => {
  const page = await new Router()
    .withSearchParams({ filter: `task.scopeKey=${scope.scopeKey}` })
    .get('/task/search')
    .then(({ body }) => body as { values?: TaskReadOutView[] });
  const values = page?.values ?? [];
  return values.filter((task) => task.name?.startsWith(TASK_NAME));
};

const active = ({ episodeKey }: { episodeKey: string }) => {
  const scope = episodeScope(episodeKey);
  return queryOptions({
    queryKey: ['task', 'active', scope],
    queryFn: async () => {
      const tasks = await demoTasks(scope);
      return tasks.find((task) => !TERMINAL_STATUSES.includes(task.status)) ?? null;
    },
    // The platform never fires more often than every 5 minutes; this cadence is only to
    // catch the status flip (initialized → succeeded) reasonably soon after a fire.
    refetchInterval: 30_000,
  });
};

const ticks = ({ episodeKey }: { episodeKey: string }) => {
  const scope = episodeScope(episodeKey);
  return queryOptions({
    queryKey: ['task', 'ticks', scope],
    queryFn: async () => {
      const vault = await vaultAdapter.withScope(TICK_VAULT, scope);
      return (vault?.items ?? { tickCount: 0 }) as TickState;
    },
    refetchInterval: 30_000,
  });
};

const stop = async (episodeKey: string) => {
  const tasks = await demoTasks(episodeScope(episodeKey));
  await Promise.all(tasks.map((task) => taskAdapter.destroy(task.taskKey)));
};

const start = (episodeKey: string, cron: string) => {
  // The runner constructs the fire URL itself as
  // {host}{target-path}/{account}/{project}{url} — `url` must stay relative, and
  // target 'PROXY' aims it at this project's proxy server.
  const payload = {
    method: 'POST',
    url: '/tick',
    target: 'PROXY',
    timeoutSeconds: 10,
    body: { episodeKey },
    headers: { 'Content-Type': 'application/json' },
  };
  // Task creation is idempotent by scope+name — the platform returns an existing
  // same-named task unmodified — so names carry a timestamp.
  return taskAdapter.create(
    episodeScope(episodeKey),
    `${TASK_NAME}-${Date.now()}`,
    payload,
    { objectType: 'cron', value: cron },
    { failSafeTermination: new Date(Date.now() + FAIL_SAFE_MS).toISOString() }
  ) as Promise<TaskReadOutView>;
};

export const TaskQuery = {
  active,
  ticks,
  start,
  stop,
};
