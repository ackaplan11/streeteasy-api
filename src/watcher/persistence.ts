import { promises as fs } from "fs";
import * as path from "path";
import { WatcherState } from "./watcher";

export interface PersistedState {
  version: 1;
  updatedAt: string;
  watchers: Record<string, WatcherState>;
}

const EMPTY_STATE: PersistedState = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  watchers: {},
};

/** Load state from disk. Returns an empty state if the file does not exist. */
export async function loadState(filePath: string): Promise<PersistedState> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed.version !== 1) {
      throw new Error(
        `Unsupported state file version ${parsed.version} — expected 1`,
      );
    }
    return parsed;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { ...EMPTY_STATE, updatedAt: new Date().toISOString() };
    }
    throw err;
  }
}

/** Atomically write state to disk (writes to a temp file, then renames). */
export async function saveState(
  filePath: string,
  state: PersistedState,
): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}
