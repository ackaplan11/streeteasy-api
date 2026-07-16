/// <reference types="@cloudflare/workers-types" />

export interface TrackedListing {
  price: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface WatcherState {
  listings: Record<string, TrackedListing>;
}

export interface PersistedState {
  version: 1;
  updatedAt: string;
  watchers: Record<string, WatcherState>;
}

const KV_KEY = "state:v1";

const EMPTY_STATE: PersistedState = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  watchers: {},
};

export async function loadState(kv: KVNamespace): Promise<PersistedState> {
  const raw = await kv.get(KV_KEY);
  if (!raw) return { ...EMPTY_STATE, updatedAt: new Date().toISOString() };
  const parsed = JSON.parse(raw) as PersistedState;
  if (parsed.version !== 1) {
    throw new Error(`Unsupported state file version ${parsed.version} — expected 1`);
  }
  return parsed;
}

export async function saveState(
  kv: KVNamespace,
  state: PersistedState,
): Promise<void> {
  await kv.put(KV_KEY, JSON.stringify(state));
}
