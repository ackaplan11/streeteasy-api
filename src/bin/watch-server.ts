#!/usr/bin/env node
import * as dotenv from "dotenv";
import * as path from "path";
import {
  EmailNotifier,
  ListingWatcher,
  WatcherServer,
  loadState,
  saveState,
  loadWatchersConfig,
  PersistedState,
} from "../index";

dotenv.config();

const STATE_PATH = process.env.STATE_PATH
  ? path.resolve(process.env.STATE_PATH)
  : path.resolve(process.cwd(), "state.json");

const WATCHERS_PATH = process.env.WATCHERS_PATH
  ? path.resolve(process.env.WATCHERS_PATH)
  : path.resolve(process.cwd(), "watchers.json");

const WS_PORT = Number(process.env.WS_PORT ?? "8787");
const POLL_MS = Number(process.env.POLL_INTERVAL_MS ?? String(10 * 60_000));

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function main(): Promise<void> {
  const resendApiKey = requireEnv("RESEND_API_KEY");
  const resendFrom = requireEnv("RESEND_FROM");
  const resendTo = requireEnv("RESEND_TO");

  const config = await loadWatchersConfig(WATCHERS_PATH);
  console.log(
    `[boot] config loaded from ${WATCHERS_PATH}: ${config.watchers.length} watcher(s), ${config.areas.length} area(s)`,
  );

  const state = await loadState(STATE_PATH);
  console.log(`[boot] state loaded from ${STATE_PATH}`);
  for (const [label, s] of Object.entries(state.watchers)) {
    console.log(`  ${label}: ${Object.keys(s.listings).length} tracked listings`);
  }

  const notifier = new EmailNotifier({
    apiKey: resendApiKey,
    from: resendFrom,
    to: resendTo,
  });

  const labeledWatchers: { label: string; watcher: ListingWatcher }[] = [];

  const persist = async (): Promise<void> => {
    const snapshot: PersistedState = {
      version: 1,
      updatedAt: new Date().toISOString(),
      watchers: Object.fromEntries(
        labeledWatchers.map(({ label, watcher }) => [label, watcher.getState()]),
      ),
    };
    try {
      await saveState(STATE_PATH, snapshot);
    } catch (err) {
      console.error("[persist] failed:", err);
    }
  };

  for (const spec of config.watchers) {
    const watcher = new ListingWatcher({
      search: {
        sorting: { attribute: "LISTED_AT", direction: "DESCENDING" },
        filters: {
          areas: config.areas,
          rentalStatus: "ACTIVE",
          price: { lowerBound: null, upperBound: spec.upperPrice },
          bedrooms: {
            lowerBound: spec.bedroomLower,
            upperBound: spec.bedroomUpper,
          },
        },
        perPage: 100,
      },
      pollIntervalMs: POLL_MS,
      suppressInitialResults: true,
      initialState: state.watchers[spec.label],
    });

    watcher.on("new-listing", (l) =>
      console.log(
        `[new ${spec.label}] $${l.price}/mo ${l.bedroomCount}BR — ${l.street}${l.unit ? ` ${l.unit}` : ""}`,
      ),
    );
    watcher.on("price-drop", (d) =>
      console.log(
        `[drop ${spec.label}] $${d.previousPrice} → $${d.newPrice} — ${d.listing.street}${d.listing.unit ? ` ${d.listing.unit}` : ""}`,
      ),
    );
    watcher.on("poll", async (info) => {
      console.log(
        `[poll ${spec.label}] ${info.timestamp}: totalCount=${info.totalCount} new=${info.newCount} drops=${info.priceDropCount}`,
      );
      await persist();
    });
    watcher.on("error", (err) =>
      console.error(`[error ${spec.label}]`, err.message),
    );

    notifier.attach(spec.label, watcher);
    labeledWatchers.push({ label: spec.label, watcher });
  }

  const server = new WatcherServer({ watchers: labeledWatchers, port: WS_PORT });
  await server.start();
  console.log(`[boot] WatcherServer listening on ws://localhost:${WS_PORT}`);
  console.log(
    `[boot] Watching: ${config.watchers.map((s) => `${s.label} (<$${s.upperPrice})`).join(", ")}`,
  );

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[shutdown] received ${signal}`);
    await persist();
    notifier.detach();
    await server.stop();
    console.log("[shutdown] done");
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
