/// <reference types="@cloudflare/workers-types" />

import { parseWatchersConfig } from "./config";
import { runPoll } from "./poll";
import { loadState, saveState } from "./state";
import { sendListingEmail, ResendEnv } from "./email";

export interface Env extends ResendEnv {
  WATCHER_STATE: KVNamespace;
  WATCHERS_JSON: string;
}

export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(runOnce(env, event.scheduledTime));
  },
};

async function runOnce(env: Env, scheduledTime: number): Promise<void> {
  const startedAt = new Date(scheduledTime).toISOString();
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
