/// <reference types="@cloudflare/workers-types" />

import { parseWatchersConfig } from "./config";
import { runPoll } from "./poll";
import { loadState, saveState } from "./state";
import { sendListingEmail, sendCleanupReminder, ResendEnv } from "./email";

const POLL_CRON = "*/10 12-23 * * *";
const REMINDER_CRON = "0 15 * * *";

export interface Env extends ResendEnv {
  WATCHER_STATE: KVNamespace;
  WATCHERS_JSON: string;
  POLL_CUTOFF?: string;
}

export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(handleTrigger(event, env));
  },
};

async function handleTrigger(event: ScheduledEvent, env: Env): Promise<void> {
  const startedAt = new Date(event.scheduledTime).toISOString();
  const pastCutoff = isPastCutoff(env.POLL_CUTOFF, event.scheduledTime);

  if (event.cron === REMINDER_CRON) {
    if (pastCutoff && env.POLL_CUTOFF) {
      console.log(`[reminder] ${startedAt}: cutoff passed, sending cleanup reminder`);
      await sendCleanupReminder(env, env.POLL_CUTOFF);
    } else {
      console.log(`[reminder] ${startedAt}: cutoff not yet passed, skipping`);
    }
    return;
  }

  if (pastCutoff) {
    console.log(`[cutoff] ${startedAt} ≥ ${env.POLL_CUTOFF}, skipping poll`);
    return;
  }

  await runPollBatch(env, startedAt);
}

function isPastCutoff(raw: string | undefined, scheduledTime: number): boolean {
  if (!raw) return false;
  const cutoff = Date.parse(raw);
  if (Number.isNaN(cutoff)) {
    console.error(`[cutoff] invalid POLL_CUTOFF ${raw}, ignoring`);
    return false;
  }
  return scheduledTime >= cutoff;
}

async function runPollBatch(env: Env, startedAt: string): Promise<void> {
  console.log(`[poll] cron fired at ${startedAt}`);

  const config = parseWatchersConfig(env.WATCHERS_JSON);
  const state = await loadState(env.WATCHER_STATE);

  for (const spec of config.watchers) {
    try {
      const result = await runPoll({
        areas: config.areas,
        spec,
        state: state.watchers[spec.label],
      });

      console.log(
        `[poll ${spec.label}] totalCount=${result.totalCount} new=${result.newListings.length} drops=${result.priceDrops.length}`,
      );

      await sendListingEmail(env, spec.label, result.newListings, result.priceDrops);
      state.watchers[spec.label] = result.newState;
    } catch (err) {
      console.error(
        `[error ${spec.label}]`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  state.updatedAt = new Date().toISOString();
  await saveState(env.WATCHER_STATE, state);
}
