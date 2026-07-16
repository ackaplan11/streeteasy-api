import { WatcherState } from "./watcher";
export interface PersistedState {
    version: 1;
    updatedAt: string;
    watchers: Record<string, WatcherState>;
}
/** Load state from disk. Returns an empty state if the file does not exist. */
export declare function loadState(filePath: string): Promise<PersistedState>;
/** Atomically write state to disk (writes to a temp file, then renames). */
export declare function saveState(filePath: string, state: PersistedState): Promise<void>;
